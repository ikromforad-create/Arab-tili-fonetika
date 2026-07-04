alter table public.daily_activity_history
  add column if not exists total_daily_users integer not null default 0 check (total_daily_users >= 0);

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
    select u.telegram_user_id, u.profile_id
    from public.telegram_bot_users u
    where u.last_seen_at >= v_day_start
      and u.last_seen_at < v_day_end
    union
    select up.telegram_user_id, u.profile_id
    from public.telegram_bot_updates up
    left join public.telegram_bot_users u on u.telegram_user_id = up.telegram_user_id
    where up.telegram_user_id is not null
      and up.received_at >= v_day_start
      and up.received_at < v_day_end
  ), site_active as (
    select coalesce(s.profile_id::text, s.telegram_user_id::text, s.anonymous_id::text) as user_key
    from public.site_app_sessions s
    where s.started_at < v_day_end
      and s.last_heartbeat_at >= v_day_start
  ), website_active as (
    select coalesce(s.profile_id::text, s.telegram_user_id::text, s.anonymous_id::text) as user_key
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
  ), total_active as (
    select 'profile:' || r.profile_id::text as user_key
    from public.user_section_results r
    where r.completed_at >= v_day_start
      and r.completed_at < v_day_end
    union
    select coalesce('profile:' || b.profile_id::text, 'telegram:' || b.telegram_user_id::text) as user_key
    from bot_active b
    union
    select coalesce('profile:' || s.profile_id::text, 'telegram:' || s.telegram_user_id::text, 'site:' || s.anonymous_id::text) as user_key
    from public.site_app_sessions s
    where s.started_at < v_day_end
      and s.last_heartbeat_at >= v_day_start
    union
    select coalesce('profile:' || s.profile_id::text, 'telegram:' || s.telegram_user_id::text) as user_key
    from public.telegram_web_app_sessions s
    where s.started_at < v_day_end
      and s.last_heartbeat_at >= v_day_start
  )
  insert into public.daily_activity_history (
    day,
    total_daily_users,
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
    (select count(distinct t.user_key)::integer from total_active t where t.user_key is not null),
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
  set total_daily_users = excluded.total_daily_users,
      registered_users_total = excluded.registered_users_total,
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

do $$
declare
  history_day date;
begin
  for history_day in
    select day from public.daily_activity_history order by day
  loop
    perform private.refresh_daily_activity_history(history_day);
  end loop;
end $$;
