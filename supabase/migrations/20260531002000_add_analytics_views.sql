create or replace view public.analytics_registered_users
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  count(r.id) as attempts_count,
  max(r.completed_at) as last_activity_at,
  coalesce(round(avg(r.percent))::integer, 0) as average_percent
from public.profiles p
left join public.user_section_results r on r.profile_id = p.id
group by p.id, p.username, p.first_name, p.last_name, p.avatar_url, p.created_at, p.updated_at;

create or replace view public.analytics_overview
with (security_invoker = true) as
select
  (select count(*) from public.profiles) as registered_users,
  (select count(*) from public.user_section_results) as completed_sections,
  (select count(distinct profile_id) from public.user_section_results where completed_at >= now() - interval '7 days') as active_users_7d,
  (select coalesce(round(avg(percent))::integer, 0) from public.user_section_results) as average_section_percent,
  (select count(*) from public.level_progress where level_passed) as passed_levels;

create or replace view public.analytics_lesson_progress
with (security_invoker = true) as
select
  l.id as lesson_id,
  l.title,
  l.level,
  count(distinct lp.profile_id) as users_started,
  count(distinct lp.profile_id) filter (where lp.completed_sections = 2) as users_completed_both_sections,
  count(distinct lp.profile_id) filter (where lp.level_passed) as users_passed,
  coalesce(round(avg(lp.average_percent))::integer, 0) as average_percent
from public.lessons l
left join public.level_progress lp on lp.lesson_id = l.id
group by l.id, l.title, l.level
order by l.level;

