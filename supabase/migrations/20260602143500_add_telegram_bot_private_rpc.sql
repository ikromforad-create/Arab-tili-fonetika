create schema if not exists private;

create table if not exists private.telegram_bot_config (
  id boolean primary key default true check (id),
  write_secret_sha256 text not null,
  updated_at timestamptz not null default now()
);

insert into private.telegram_bot_config (id, write_secret_sha256)
values (true, '1f7cb3331c55959148bf2066e69193217bc84d5c5a22924c4a7f9c33c0831a63')
on conflict (id) do update
set write_secret_sha256 = excluded.write_secret_sha256,
    updated_at = now();

create or replace function private.telegram_bot_secret_ok(p_write_secret text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.telegram_bot_config c
    where c.id = true
      and c.write_secret_sha256 = encode(extensions.digest(coalesce(p_write_secret, ''), 'sha256'), 'hex')
  );
$$;

create or replace function public.record_telegram_bot_user(
  p_write_secret text,
  p_telegram_user_id bigint,
  p_chat_id bigint,
  p_username text,
  p_first_name text,
  p_last_name text,
  p_language_code text,
  p_is_bot boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.telegram_bot_secret_ok(p_write_secret) then
    raise exception 'Unauthorized';
  end if;

  insert into public.telegram_bot_users (
    telegram_user_id,
    chat_id,
    username,
    first_name,
    last_name,
    language_code,
    is_bot,
    last_seen_at,
    blocked_at,
    updated_at
  )
  values (
    p_telegram_user_id,
    p_chat_id,
    nullif(p_username, ''),
    nullif(p_first_name, ''),
    nullif(p_last_name, ''),
    nullif(p_language_code, ''),
    coalesce(p_is_bot, false),
    now(),
    null,
    now()
  )
  on conflict (telegram_user_id) do update
  set chat_id = excluded.chat_id,
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      language_code = excluded.language_code,
      is_bot = excluded.is_bot,
      last_seen_at = now(),
      blocked_at = null,
      updated_at = now();
end;
$$;

create or replace function public.telegram_bot_recipients(p_write_secret text)
returns table (
  telegram_user_id bigint,
  chat_id bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.telegram_bot_secret_ok(p_write_secret) then
    raise exception 'Unauthorized';
  end if;

  return query
  select u.telegram_user_id, u.chat_id
  from public.telegram_bot_users u
  where u.allows_broadcast = true
    and u.blocked_at is null;
end;
$$;

create or replace function public.mark_telegram_bot_user_blocked(
  p_write_secret text,
  p_telegram_user_id bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.telegram_bot_secret_ok(p_write_secret) then
    raise exception 'Unauthorized';
  end if;

  update public.telegram_bot_users
  set blocked_at = now(),
      updated_at = now()
  where telegram_user_id = p_telegram_user_id;
end;
$$;

create or replace function public.log_telegram_broadcast(
  p_write_secret text,
  p_admin_telegram_user_id bigint,
  p_message text,
  p_attempted_count integer,
  p_sent_count integer,
  p_failed_count integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.telegram_bot_secret_ok(p_write_secret) then
    raise exception 'Unauthorized';
  end if;

  insert into public.telegram_broadcasts (
    admin_telegram_user_id,
    message,
    attempted_count,
    sent_count,
    failed_count
  )
  values (
    p_admin_telegram_user_id,
    p_message,
    p_attempted_count,
    p_sent_count,
    p_failed_count
  );
end;
$$;

grant execute on function public.record_telegram_bot_user(text, bigint, bigint, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.telegram_bot_recipients(text) to anon, authenticated;
grant execute on function public.mark_telegram_bot_user_blocked(text, bigint) to anon, authenticated;
grant execute on function public.log_telegram_broadcast(text, bigint, text, integer, integer, integer) to anon, authenticated;
