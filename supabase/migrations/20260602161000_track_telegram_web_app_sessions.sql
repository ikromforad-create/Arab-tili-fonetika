create table if not exists public.telegram_web_app_sessions (
  id uuid primary key,
  telegram_user_id bigint not null,
  profile_id uuid references public.profiles(id) on delete set null,
  username text,
  first_name text,
  last_name text,
  platform text,
  user_agent text,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0 and duration_seconds <= 86400),
  heartbeat_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_web_app_sessions_telegram_user_id_idx
  on public.telegram_web_app_sessions (telegram_user_id, started_at desc);

create index if not exists telegram_web_app_sessions_profile_id_idx
  on public.telegram_web_app_sessions (profile_id, started_at desc)
  where profile_id is not null;

create index if not exists telegram_web_app_sessions_started_at_idx
  on public.telegram_web_app_sessions (started_at desc);

alter table public.telegram_web_app_sessions enable row level security;

create or replace function public.record_telegram_web_app_session(
  p_session_id uuid,
  p_telegram_user_id bigint,
  p_username text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_profile_id uuid default null,
  p_started_at timestamptz default null,
  p_duration_seconds integer default 0,
  p_event_type text default 'heartbeat',
  p_platform text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_duration integer := least(greatest(coalesce(p_duration_seconds, 0), 0), 86400);
  safe_event_type text := coalesce(nullif(p_event_type, ''), 'heartbeat');
  safe_started_at timestamptz := coalesce(p_started_at, now());
begin
  if p_session_id is null or p_telegram_user_id is null or p_telegram_user_id <= 0 then
    raise exception 'Telegram session ma''lumoti noto''g''ri.';
  end if;

  if safe_started_at > now() + interval '5 minutes' then
    safe_started_at := now();
  end if;

  insert into public.telegram_web_app_sessions (
    id,
    telegram_user_id,
    profile_id,
    username,
    first_name,
    last_name,
    platform,
    user_agent,
    started_at,
    last_heartbeat_at,
    ended_at,
    duration_seconds,
    heartbeat_count,
    updated_at
  )
  values (
    p_session_id,
    p_telegram_user_id,
    p_profile_id,
    nullif(p_username, ''),
    nullif(p_first_name, ''),
    nullif(p_last_name, ''),
    left(nullif(p_platform, ''), 80),
    left(nullif(p_user_agent, ''), 300),
    safe_started_at,
    now(),
    case when safe_event_type = 'end' then now() else null end,
    safe_duration,
    case when safe_event_type = 'start' then 0 else 1 end,
    now()
  )
  on conflict (id) do update
  set telegram_user_id = excluded.telegram_user_id,
      profile_id = coalesce(excluded.profile_id, public.telegram_web_app_sessions.profile_id),
      username = coalesce(excluded.username, public.telegram_web_app_sessions.username),
      first_name = coalesce(excluded.first_name, public.telegram_web_app_sessions.first_name),
      last_name = coalesce(excluded.last_name, public.telegram_web_app_sessions.last_name),
      platform = coalesce(excluded.platform, public.telegram_web_app_sessions.platform),
      user_agent = coalesce(excluded.user_agent, public.telegram_web_app_sessions.user_agent),
      last_heartbeat_at = now(),
      ended_at = case
        when safe_event_type = 'end' then now()
        else public.telegram_web_app_sessions.ended_at
      end,
      duration_seconds = greatest(public.telegram_web_app_sessions.duration_seconds, safe_duration),
      heartbeat_count = public.telegram_web_app_sessions.heartbeat_count + case
        when safe_event_type = 'start' then 0
        else 1
      end,
      updated_at = now();

  update public.telegram_bot_users t
  set profile_id = coalesce(t.profile_id, p_profile_id),
      username = coalesce(nullif(p_username, ''), t.username),
      first_name = coalesce(nullif(p_first_name, ''), t.first_name),
      last_name = coalesce(nullif(p_last_name, ''), t.last_name),
      last_seen_at = now(),
      updated_at = now()
  where t.telegram_user_id = p_telegram_user_id;
end;
$$;

create or replace view public.analytics_telegram_web_app_usage
with (security_invoker = true)
as
select
  s.telegram_user_id,
  (array_agg(s.profile_id order by s.started_at desc) filter (where s.profile_id is not null))[1] as profile_id,
  (array_agg(s.username order by s.started_at desc) filter (where s.username is not null))[1] as username,
  (array_agg(s.first_name order by s.started_at desc) filter (where s.first_name is not null))[1] as first_name,
  (array_agg(s.last_name order by s.started_at desc) filter (where s.last_name is not null))[1] as last_name,
  count(*)::integer as open_count,
  coalesce(sum(s.duration_seconds), 0)::integer as total_duration_seconds,
  round(coalesce(sum(s.duration_seconds), 0)::numeric / 60, 1) as total_duration_minutes,
  max(s.started_at) as last_opened_at,
  max(s.last_heartbeat_at) as last_seen_at
from public.telegram_web_app_sessions s
group by s.telegram_user_id;

grant execute on function public.record_telegram_web_app_session(uuid, bigint, text, text, text, uuid, timestamptz, integer, text, text, text) to anon, authenticated;
