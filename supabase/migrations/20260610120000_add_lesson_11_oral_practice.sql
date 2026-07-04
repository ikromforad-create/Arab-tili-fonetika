alter table public.user_section_results
  drop constraint if exists user_section_results_section_key_check;

alter table public.user_section_results
  add constraint user_section_results_section_key_check
  check (section_key in ('words', 'sentences', 'oral'));

drop policy if exists "Section results can be inserted by app" on public.user_section_results;

create policy "Section results can be inserted by app"
  on public.user_section_results for insert
  with check (
    section_key in ('words', 'sentences', 'oral')
    and score >= 0
    and total > 0
    and percent between 0 and 100
    and stars between 0 and 5
  );

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
    and count(*) >= case when lesson_id = 11 then 3 else 2 end as level_passed
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
      case when lesson_id = 11 then 3 else 2 end as required_sections,
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

create or replace function public.save_section_result(
  p_profile_id uuid,
  p_lesson_id integer,
  p_section_key text,
  p_score integer,
  p_total integer,
  p_percent integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  computed_stars integer;
begin
  if p_section_key not in ('words', 'sentences', 'oral') then
    raise exception 'Noto''g''ri bo''lim.';
  end if;

  computed_stars := case
    when p_percent >= 96 then 5
    when p_percent >= 76 then 4
    when p_percent >= 51 then 3
    when p_percent >= 26 then 2
    when p_percent >= 1 then 1
    else 0
  end;

  insert into public.user_section_results (profile_id, lesson_id, section_key, score, total, percent, stars)
  values (p_profile_id, p_lesson_id, p_section_key, p_score, p_total, p_percent, computed_stars);

  return public.profile_app_payload(p_profile_id);
end;
$$;
