create or replace view public.level_progress
with (security_invoker = true) as
select
  profile_id,
  lesson_id,
  round(avg(percent))::integer as average_percent,
  count(*) as completed_sections,
  case
    when round(avg(percent)) >= 96 then 5
    when round(avg(percent)) >= 76 then 4
    when round(avg(percent)) >= 51 then 3
    when round(avg(percent)) >= 26 then 2
    when round(avg(percent)) >= 1 then 1
    else 0
  end as stars,
  bool_and(percent >= 76)
    and count(*) >= case when lesson_id between 1 and 11 then 3 else 2 end as level_passed
from public.best_section_results
group by profile_id, lesson_id;

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
      case when lesson_id between 1 and 11 then 3 else 2 end as required_sections,
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
    where completed_sections >= required_sections and level_percent >= 76
  )
  select jsonb_build_object(
    'unlockedLevel', case
      when coalesce((select is_admin from profile_settings), false) then 11
      else least(11, greatest(1, (select unlocked_level from unlocks)))
    end,
    'bestScores', (select best_scores from progress_levels)
  );
$$;
