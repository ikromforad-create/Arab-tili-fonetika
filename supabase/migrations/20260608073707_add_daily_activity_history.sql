create schema if not exists private;

create table if not exists public.site_app_sessions (
  id uuid primary key,
  anonymous_id uuid not null,
  profile_id uuid references public.profiles(id) on delete set null,
  telegram_user_id bigint,
  source text not null default 'website' check (source in ('website', 'telegram_web_app')),
  path text,
  user_agent text,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0 and duration_seconds <= 86400),
  heartbeat_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_app_sessions_anonymous_started_idx
  on public.site_app_sessions (anonymous_id, started_at desc);

create index if not exists site_app_sessions_profile_started_idx
  on public.site_app_sessions (profile_id, started_at desc)
  where profile_id is not null;

create index if not exists site_app_sessions_source_started_idx
  on public.site_app_sessions (source, started_at desc);

create index if not exists site_app_sessions_telegram_user_idx
  on public.site_app_sessions (telegram_user_id, started_at desc)
  where telegram_user_id is not null;

alter table public.site_app_sessions enable row level security;

drop policy if exists site_app_sessions_private_deny on public.site_app_sessions;

create policy site_app_sessions_private_deny
on public.site_app_sessions
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create table if not exists public.daily_activity_history (
  day date primary key,
  registered_users_total integer not null default 0 check (registered_users_total >= 0),
  registered_users_new integer not null default 0 check (registered_users_new >= 0),
  lesson_users_started_total integer not null default 0 check (lesson_users_started_total >= 0),
  lesson_active_users integer not null default 0 check (lesson_active_users >= 0),
  lesson_attempts integer not null default 0 check (lesson_attempts >= 0),
  lesson_sections_completed_total integer not null default 0 check (lesson_sections_completed_total >= 0),
  lesson_levels_passed_total integer not null default 0 check (lesson_levels_passed_total >= 0),
  lesson_levels_passed_today integer not null default 0 check (lesson_levels_passed_today >= 0),
  lesson_average_percent integer not null default 0 check (lesson_average_percent >= 0 and lesson_average_percent <= 100),
  bot_users_total integer not null default 0 check (bot_users_total >= 0),
  bot_new_users integer not null default 0 check (bot_new_users >= 0),
  bot_daily_users integer not null default 0 check (bot_daily_users >= 0),
  bot_updates integer not null default 0 check (bot_updates >= 0),
  site_daily_users integer not null default 0 check (site_daily_users >= 0),
  site_sessions integer not null default 0 check (site_sessions >= 0),
  website_daily_users integer not null default 0 check (website_daily_users >= 0),
  website_sessions integer not null default 0 check (website_sessions >= 0),
  telegram_web_app_daily_users integer not null default 0 check (telegram_web_app_daily_users >= 0),
  telegram_web_app_sessions integer not null default 0 check (telegram_web_app_sessions >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_activity_history_updated_idx
  on public.daily_activity_history (updated_at desc);

alter table public.daily_activity_history enable row level security;

drop policy if exists daily_activity_history_private_deny on public.daily_activity_history;

create policy daily_activity_history_private_deny
on public.daily_activity_history
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

create or replace function private.activity_day(p_at timestamptz)
returns date
language sql
stable
set search_path = ''
as $$
  select case
    when p_at is null then null
    else (p_at at time zone 'Asia/Tashkent')::date
  end;
$$;

create or replace function private.activity_day_start(p_day date)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case
    when p_day is null then null
    else p_day::timestamp at time zone 'Asia/Tashkent'
  end;
$$;

create or replace function private.refresh_daily_activity_history(
  p_day date default private.activity_day(now())
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := coalesce(p_day, private.activity_day(now()));
  v_day_start timestamptz := private.activity_day_start(coalesce(p_day, private.activity_day(now())));
  v_day_end timestamptz := private.activity_day_start(coalesce(p_day, private.activity_day(now())) + 1);
begin
  with best_by_day as (
    select distinct on (r.profile_id, r.lesson_id, r.section_key)
      r.profile_id,
      r.lesson_id,
      r.section_key,
      r.score,
      r.total,
      r.percent,
      r.stars,
      r.completed_at
    from public.user_section_results r
    where r.completed_at < v_day_end
    order by r.profile_id, r.lesson_id, r.section_key, r.percent desc, r.completed_at desc
  ), level_by_day as (
    select
      b.profile_id,
      b.lesson_id,
      round(avg(b.percent))::integer as average_percent,
      count(*) filter (where b.section_key in ('words', 'sentences')) as completed_sections,
      bool_and(b.percent >= 76) and count(*) = 2 as level_passed,
      max(b.completed_at) as latest_best_completed_at
    from best_by_day b
    group by b.profile_id, b.lesson_id
  ), lesson_progress_rows as (
    select
      l.id as lesson_id,
      l.level,
      l.title,
      count(distinct lp.profile_id)::integer as users_started,
      count(distinct lp.profile_id) filter (where lp.completed_sections = 2)::integer as users_completed_both_sections,
      count(distinct lp.profile_id) filter (where lp.level_passed)::integer as users_passed,
      coalesce(round(avg(lp.average_percent))::integer, 0) as average_percent
    from public.lessons l
    left join level_by_day lp on lp.lesson_id = l.id
    group by l.id, l.level, l.title
  ), lesson_progress_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'lesson_id', lesson_id,
          'level', level,
          'title', title,
          'users_started', users_started,
          'users_completed_both_sections', users_completed_both_sections,
          'users_passed', users_passed,
          'average_percent', average_percent
        )
        order by level
      ),
      '[]'::jsonb
    ) as lesson_progress
    from lesson_progress_rows
  ), bot_active as (
    select u.telegram_user_id
    from public.telegram_bot_users u
    where u.last_seen_at >= v_day_start
      and u.last_seen_at < v_day_end
    union
    select up.telegram_user_id
    from public.telegram_bot_updates up
    where up.telegram_user_id is not null
      and up.received_at >= v_day_start
      and up.received_at < v_day_end
  ), site_active as (
    select coalesce(s.profile_id::text, s.anonymous_id::text) as user_key
    from public.site_app_sessions s
    where s.started_at < v_day_end
      and s.last_heartbeat_at >= v_day_start
  ), website_active as (
    select coalesce(s.profile_id::text, s.anonymous_id::text) as user_key
    from public.site_app_sessions s
    where s.source = 'website'
      and s.started_at < v_day_end
      and s.last_heartbeat_at >= v_day_start
  ), telegram_web_app_active as (
    select s.telegram_user_id::text as user_key
    from public.telegram_web_app_sessions s
    where s.telegram_user_id is not null
      and s.started_at < v_day_end
      and s.last_heartbeat_at >= v_day_start
  )
  insert into public.daily_activity_history (
    day,
    registered_users_total,
    registered_users_new,
    lesson_users_started_total,
    lesson_active_users,
    lesson_attempts,
    lesson_sections_completed_total,
    lesson_levels_passed_total,
    lesson_levels_passed_today,
    lesson_average_percent,
    bot_users_total,
    bot_new_users,
    bot_daily_users,
    bot_updates,
    site_daily_users,
    site_sessions,
    website_daily_users,
    website_sessions,
    telegram_web_app_daily_users,
    telegram_web_app_sessions,
    details,
    updated_at
  )
  select
    v_day,
    (select count(*)::integer from public.profiles p where p.created_at < v_day_end),
    (select count(*)::integer from public.profiles p where p.created_at >= v_day_start and p.created_at < v_day_end),
    (select count(distinct r.profile_id)::integer from public.user_section_results r where r.completed_at < v_day_end),
    (select count(distinct r.profile_id)::integer from public.user_section_results r where r.completed_at >= v_day_start and r.completed_at < v_day_end),
    (select count(*)::integer from public.user_section_results r where r.completed_at >= v_day_start and r.completed_at < v_day_end),
    (select count(*)::integer from public.user_section_results r where r.completed_at < v_day_end),
    (select count(*)::integer from level_by_day lp where lp.level_passed),
    (select count(*)::integer from level_by_day lp where lp.level_passed and lp.latest_best_completed_at >= v_day_start and lp.latest_best_completed_at < v_day_end),
    (select coalesce(round(avg(r.percent))::integer, 0) from public.user_section_results r where r.completed_at >= v_day_start and r.completed_at < v_day_end),
    (
      select count(*)::integer
      from public.telegram_bot_users u
      where u.first_seen_at < v_day_end
        and (u.blocked_at is null or u.blocked_at >= v_day_end)
    ),
    (select count(*)::integer from public.telegram_bot_users u where u.first_seen_at >= v_day_start and u.first_seen_at < v_day_end),
    (select count(distinct b.telegram_user_id)::integer from bot_active b),
    (select count(*)::integer from public.telegram_bot_updates up where up.received_at >= v_day_start and up.received_at < v_day_end),
    (select count(distinct s.user_key)::integer from site_active s),
    (select count(*)::integer from public.site_app_sessions s where s.started_at >= v_day_start and s.started_at < v_day_end),
    (select count(distinct w.user_key)::integer from website_active w),
    (select count(*)::integer from public.site_app_sessions s where s.source = 'website' and s.started_at >= v_day_start and s.started_at < v_day_end),
    (select count(distinct t.user_key)::integer from telegram_web_app_active t),
    (select count(*)::integer from public.telegram_web_app_sessions s where s.started_at >= v_day_start and s.started_at < v_day_end),
    jsonb_build_object(
      'timezone', 'Asia/Tashkent',
      'range_start', v_day_start,
      'range_end', v_day_end,
      'lesson_progress', (select lesson_progress from lesson_progress_json),
      'generated_at', now()
    ),
    now()
  on conflict (day) do update
  set registered_users_total = excluded.registered_users_total,
      registered_users_new = excluded.registered_users_new,
      lesson_users_started_total = excluded.lesson_users_started_total,
      lesson_active_users = excluded.lesson_active_users,
      lesson_attempts = excluded.lesson_attempts,
      lesson_sections_completed_total = excluded.lesson_sections_completed_total,
      lesson_levels_passed_total = excluded.lesson_levels_passed_total,
      lesson_levels_passed_today = excluded.lesson_levels_passed_today,
      lesson_average_percent = excluded.lesson_average_percent,
      bot_users_total = excluded.bot_users_total,
      bot_new_users = excluded.bot_new_users,
      bot_daily_users = excluded.bot_daily_users,
      bot_updates = excluded.bot_updates,
      site_daily_users = excluded.site_daily_users,
      site_sessions = excluded.site_sessions,
      website_daily_users = excluded.website_daily_users,
      website_sessions = excluded.website_sessions,
      telegram_web_app_daily_users = excluded.telegram_web_app_daily_users,
      telegram_web_app_sessions = excluded.telegram_web_app_sessions,
      details = excluded.details,
      updated_at = now();
end;
$$;

create or replace function private.refresh_daily_activity_history_days(variadic p_days date[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate date;
  refreshed_days date[] := '{}'::date[];
begin
  foreach candidate in array p_days loop
    if candidate is not null and not candidate = any(refreshed_days) then
      perform private.refresh_daily_activity_history(candidate);
      refreshed_days := array_append(refreshed_days, candidate);
    end if;
  end loop;
end;
$$;

create or replace function private.refresh_daily_activity_history_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_TABLE_NAME = 'profiles' then
    perform private.refresh_daily_activity_history_days(
      private.activity_day(case when TG_OP = 'DELETE' then old.created_at else new.created_at end),
      private.activity_day(now())
    );
  elsif TG_TABLE_NAME = 'user_section_results' then
    perform private.refresh_daily_activity_history_days(
      private.activity_day(case when TG_OP = 'DELETE' then old.completed_at else new.completed_at end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.completed_at else null end)
    );
  elsif TG_TABLE_NAME = 'telegram_bot_users' then
    perform private.refresh_daily_activity_history_days(
      private.activity_day(case when TG_OP = 'DELETE' then old.first_seen_at else new.first_seen_at end),
      private.activity_day(case when TG_OP = 'DELETE' then old.last_seen_at else new.last_seen_at end),
      private.activity_day(case when TG_OP = 'DELETE' then old.blocked_at else new.blocked_at end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.last_seen_at else null end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.blocked_at else null end)
    );
  elsif TG_TABLE_NAME = 'telegram_bot_updates' then
    perform private.refresh_daily_activity_history_days(
      private.activity_day(case when TG_OP = 'DELETE' then old.received_at else new.received_at end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.received_at else null end)
    );
  elsif TG_TABLE_NAME = 'telegram_web_app_sessions' then
    perform private.refresh_daily_activity_history_days(
      private.activity_day(case when TG_OP = 'DELETE' then old.started_at else new.started_at end),
      private.activity_day(case when TG_OP = 'DELETE' then old.last_heartbeat_at else new.last_heartbeat_at end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.started_at else null end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.last_heartbeat_at else null end)
    );
  elsif TG_TABLE_NAME = 'site_app_sessions' then
    perform private.refresh_daily_activity_history_days(
      private.activity_day(case when TG_OP = 'DELETE' then old.started_at else new.started_at end),
      private.activity_day(case when TG_OP = 'DELETE' then old.last_heartbeat_at else new.last_heartbeat_at end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.started_at else null end),
      private.activity_day(case when TG_OP = 'UPDATE' then old.last_heartbeat_at else null end)
    );
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_daily_activity_history_profiles on public.profiles;
create trigger refresh_daily_activity_history_profiles
after insert or update or delete on public.profiles
for each row execute function private.refresh_daily_activity_history_after_change();

drop trigger if exists refresh_daily_activity_history_user_section_results on public.user_section_results;
create trigger refresh_daily_activity_history_user_section_results
after insert or update or delete on public.user_section_results
for each row execute function private.refresh_daily_activity_history_after_change();

drop trigger if exists refresh_daily_activity_history_telegram_bot_users on public.telegram_bot_users;
create trigger refresh_daily_activity_history_telegram_bot_users
after insert or update or delete on public.telegram_bot_users
for each row execute function private.refresh_daily_activity_history_after_change();

drop trigger if exists refresh_daily_activity_history_telegram_bot_updates on public.telegram_bot_updates;
create trigger refresh_daily_activity_history_telegram_bot_updates
after insert or update or delete on public.telegram_bot_updates
for each row execute function private.refresh_daily_activity_history_after_change();

drop trigger if exists refresh_daily_activity_history_telegram_web_app_sessions on public.telegram_web_app_sessions;
create trigger refresh_daily_activity_history_telegram_web_app_sessions
after insert or update or delete on public.telegram_web_app_sessions
for each row execute function private.refresh_daily_activity_history_after_change();

drop trigger if exists refresh_daily_activity_history_site_app_sessions on public.site_app_sessions;
create trigger refresh_daily_activity_history_site_app_sessions
after insert or update or delete on public.site_app_sessions
for each row execute function private.refresh_daily_activity_history_after_change();

create or replace function public.record_site_app_session(
  p_session_id uuid,
  p_anonymous_id uuid,
  p_profile_id uuid default null,
  p_source text default 'website',
  p_telegram_user_id bigint default null,
  p_started_at timestamptz default null,
  p_duration_seconds integer default 0,
  p_event_type text default 'heartbeat',
  p_path text default null,
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
  safe_source text := case
    when p_source in ('website', 'telegram_web_app') then p_source
    else 'website'
  end;
  safe_started_at timestamptz := coalesce(p_started_at, now());
begin
  if p_session_id is null or p_anonymous_id is null then
    raise exception 'Session ma''lumoti noto''g''ri.';
  end if;

  if safe_started_at > now() + interval '5 minutes' then
    safe_started_at := now();
  end if;

  insert into public.site_app_sessions (
    id,
    anonymous_id,
    profile_id,
    telegram_user_id,
    source,
    path,
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
    p_anonymous_id,
    p_profile_id,
    p_telegram_user_id,
    safe_source,
    left(nullif(p_path, ''), 300),
    left(nullif(p_user_agent, ''), 300),
    safe_started_at,
    now(),
    case when safe_event_type = 'end' then now() else null end,
    safe_duration,
    case when safe_event_type = 'start' then 0 else 1 end,
    now()
  )
  on conflict (id) do update
  set anonymous_id = excluded.anonymous_id,
      profile_id = coalesce(excluded.profile_id, public.site_app_sessions.profile_id),
      telegram_user_id = coalesce(excluded.telegram_user_id, public.site_app_sessions.telegram_user_id),
      source = excluded.source,
      path = coalesce(excluded.path, public.site_app_sessions.path),
      user_agent = coalesce(excluded.user_agent, public.site_app_sessions.user_agent),
      last_heartbeat_at = now(),
      ended_at = case
        when safe_event_type = 'end' then now()
        else public.site_app_sessions.ended_at
      end,
      duration_seconds = greatest(public.site_app_sessions.duration_seconds, safe_duration),
      heartbeat_count = public.site_app_sessions.heartbeat_count + case
        when safe_event_type = 'start' then 0
        else 1
      end,
      updated_at = now();
end;
$$;

grant execute on function public.record_site_app_session(uuid, uuid, uuid, text, bigint, timestamptz, integer, text, text, text) to anon, authenticated;

do $$
declare
  start_day date;
  current_day date := private.activity_day(now());
  history_day date;
begin
  select min(day_value) into start_day
  from (
    select min(private.activity_day(created_at)) as day_value from public.profiles
    union all
    select min(private.activity_day(completed_at)) from public.user_section_results
    union all
    select min(private.activity_day(first_seen_at)) from public.telegram_bot_users
    union all
    select min(private.activity_day(received_at)) from public.telegram_bot_updates
    union all
    select min(private.activity_day(started_at)) from public.telegram_web_app_sessions
    union all
    select min(private.activity_day(started_at)) from public.site_app_sessions
  ) days
  where day_value is not null;

  if start_day is null then
    start_day := current_day;
  end if;

  for history_day in
    select generate_series(start_day, current_day, interval '1 day')::date
  loop
    perform private.refresh_daily_activity_history(history_day);
  end loop;
end $$;
