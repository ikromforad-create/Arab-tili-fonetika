alter table public.profiles
  add column if not exists telegram_user_id bigint;

alter table public.telegram_bot_users
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists profiles_telegram_user_id_uidx
  on public.profiles (telegram_user_id)
  where telegram_user_id is not null;

create index if not exists telegram_bot_users_profile_id_idx
  on public.telegram_bot_users (profile_id);

update public.telegram_bot_users t
set profile_id = p.id,
    updated_at = now()
from public.profiles p
where t.profile_id is null
  and p.telegram_user_id = t.telegram_user_id;

drop function if exists public.register_profile(text, text, text, text);
drop function if exists public.login_profile(text, text);

create or replace function public.register_profile(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_password text,
  p_telegram_user_id bigint default null
)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  telegram_user_id bigint,
  avatar_url text,
  progress jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text := lower(trim(p_username));
  profile_row public.profiles;
begin
  if normalized_username = '' or p_password is null or length(p_password) < 4 then
    raise exception 'Username va kamida 4 belgili parol kerak.';
  end if;

  select * into profile_row
  from public.profiles p
  where p.username = normalized_username;

  if found and profile_row.password_hash is not null then
    raise exception 'Bu username band.';
  end if;

  if found then
    update public.profiles p
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  else
    insert into public.profiles (username, first_name, last_name, password_hash)
    values (normalized_username, trim(p_first_name), trim(p_last_name), extensions.crypt(p_password, extensions.gen_salt('bf')))
    returning * into profile_row;
  end if;

  if p_telegram_user_id is not null then
    update public.profiles p
    set telegram_user_id = null,
        updated_at = now()
    where p.telegram_user_id = p_telegram_user_id
      and p.id <> profile_row.id;

    update public.profiles p
    set telegram_user_id = p_telegram_user_id,
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;

    update public.telegram_bot_users t
    set profile_id = profile_row.id,
        updated_at = now()
    where t.telegram_user_id = p_telegram_user_id;
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.telegram_user_id,
    profile_row.avatar_url,
    public.profile_app_payload(profile_row.id);
end;
$$;

create or replace function public.login_profile(
  p_username text,
  p_password text,
  p_telegram_user_id bigint default null
)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  telegram_user_id bigint,
  avatar_url text,
  progress jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text := lower(trim(p_username));
  profile_row public.profiles;
begin
  select * into profile_row
  from public.profiles p
  where p.username = normalized_username;

  if not found then
    raise exception 'Login yoki parol noto''g''ri.';
  end if;

  if profile_row.password_hash is null then
    update public.profiles p
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  elsif profile_row.password_hash <> extensions.crypt(p_password, profile_row.password_hash) then
    raise exception 'Login yoki parol noto''g''ri.';
  end if;

  if p_telegram_user_id is not null then
    update public.profiles p
    set telegram_user_id = null,
        updated_at = now()
    where p.telegram_user_id = p_telegram_user_id
      and p.id <> profile_row.id;

    update public.profiles p
    set telegram_user_id = p_telegram_user_id,
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;

    update public.telegram_bot_users t
    set profile_id = profile_row.id,
        updated_at = now()
    where t.telegram_user_id = p_telegram_user_id;
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.telegram_user_id,
    profile_row.avatar_url,
    public.profile_app_payload(profile_row.id);
end;
$$;

create or replace view public.telegram_profile_progress_reminders as
select
  t.telegram_user_id,
  t.chat_id,
  p.id as profile_id,
  p.username,
  coalesce((public.profile_app_payload(p.id)->>'unlockedLevel')::integer, 1) as unlocked_level,
  format(
    'Siz %s bosqichiga yetib kelibsiz, so''z yodlashni davom ettiring.',
    coalesce((public.profile_app_payload(p.id)->>'unlockedLevel')::integer, 1)
  ) as message_text
from public.telegram_bot_users t
join public.profiles p
  on p.id = t.profile_id
  or (t.profile_id is null and p.telegram_user_id = t.telegram_user_id)
where t.allows_broadcast = true
  and t.blocked_at is null
  and p.telegram_user_id is not null;

create or replace function public.telegram_progress_reminder_recipients(p_write_secret text)
returns table (
  telegram_user_id bigint,
  chat_id bigint,
  profile_id uuid,
  username text,
  unlocked_level integer,
  message_text text
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
  select
    r.telegram_user_id,
    r.chat_id,
    r.profile_id,
    r.username,
    r.unlocked_level,
    r.message_text
  from public.telegram_profile_progress_reminders r;
end;
$$;

grant execute on function public.register_profile(text, text, text, text, bigint) to anon, authenticated;
grant execute on function public.login_profile(text, text, bigint) to anon, authenticated;
grant execute on function public.telegram_progress_reminder_recipients(text) to anon, authenticated;
