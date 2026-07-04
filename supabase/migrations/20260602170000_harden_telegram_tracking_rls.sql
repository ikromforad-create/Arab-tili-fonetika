do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'telegram_bot_users'
      and policyname = 'telegram_bot_users_private_deny'
  ) then
    create policy telegram_bot_users_private_deny
    on public.telegram_bot_users
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'telegram_broadcasts'
      and policyname = 'telegram_broadcasts_private_deny'
  ) then
    create policy telegram_broadcasts_private_deny
    on public.telegram_broadcasts
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'telegram_web_app_sessions'
      and policyname = 'telegram_web_app_sessions_private_deny'
  ) then
    create policy telegram_web_app_sessions_private_deny
    on public.telegram_web_app_sessions
    as restrictive
    for all
    to anon, authenticated
    using (false)
    with check (false);
  end if;
end $$;

create or replace view public.telegram_profile_progress_reminders
with (security_invoker = true)
as
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
