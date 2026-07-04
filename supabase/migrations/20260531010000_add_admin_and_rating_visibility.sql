alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists hidden_from_rating boolean not null default false;

create or replace function public.profile_app_payload(p_profile_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with profile_settings as (
    select coalesce(is_admin, false) as is_admin
    from public.profiles
    where id = p_profile_id
  ), section_groups as (
    select
      lesson_id,
      jsonb_object_agg(
        section_key,
        jsonb_build_object('score', score, 'total', total, 'percent', percent, 'stars', stars)
      ) as sections,
      count(*) as completed_sections,
      round(avg(percent))::integer as level_percent
    from public.best_section_results
    where profile_id = p_profile_id
    group by lesson_id
  ), progress_levels as (
    select coalesce(
      jsonb_object_agg(
        lesson_id::text,
        jsonb_build_object('sections', sections, 'percent', level_percent)
      ),
      '{}'::jsonb
    ) as best_scores
    from section_groups
  ), unlocks as (
    select coalesce(max(lesson_id) + 1, 1) as unlocked_level
    from section_groups
    where completed_sections = 2 and level_percent >= 76
  )
  select jsonb_build_object(
    'unlockedLevel', case
      when coalesce((select is_admin from profile_settings), false) then 8
      else least(8, greatest(1, (select unlocked_level from unlocks)))
    end,
    'bestScores', (select best_scores from progress_levels)
  );
$$;

drop view if exists public.analytics_registered_users;

create view public.analytics_registered_users
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  coalesce(attempts.attempts_count, 0) as attempts_count,
  attempts.last_activity_at,
  coalesce(best.total_score, 0)::integer as total_score,
  coalesce(best.average_percent, 0)::integer as average_percent,
  coalesce(progress.passed_levels, 0)::integer as passed_levels
from public.profiles p
left join (
  select profile_id, count(*) as attempts_count, max(completed_at) as last_activity_at
  from public.user_section_results
  group by profile_id
) attempts on attempts.profile_id = p.id
left join (
  select profile_id, sum(score) as total_score, round(avg(percent)) as average_percent
  from public.best_section_results
  group by profile_id
) best on best.profile_id = p.id
left join (
  select profile_id, count(*) filter (where level_passed) as passed_levels
  from public.level_progress
  group by profile_id
) progress on progress.profile_id = p.id
where not coalesce(p.hidden_from_rating, false);

update public.profiles
set is_admin = true,
    hidden_from_rating = true,
    updated_at = now()
where lower(username) = 'ima';
