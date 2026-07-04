create or replace function public.record_telegram_bot_update(
  p_write_secret text,
  p_update_id bigint,
  p_telegram_user_id bigint,
  p_chat_id bigint,
  p_message_id bigint,
  p_update_type text,
  p_text text,
  p_payload jsonb
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

  insert into public.telegram_bot_updates (
    update_id,
    telegram_user_id,
    chat_id,
    message_id,
    update_type,
    text,
    payload
  )
  values (
    p_update_id,
    p_telegram_user_id,
    p_chat_id,
    p_message_id,
    coalesce(nullif(p_update_type, ''), 'unknown'),
    nullif(p_text, ''),
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (update_id) do nothing;
end;
$$;

grant execute on function public.record_telegram_bot_update(text, bigint, bigint, bigint, bigint, text, text, jsonb) to anon, authenticated;
