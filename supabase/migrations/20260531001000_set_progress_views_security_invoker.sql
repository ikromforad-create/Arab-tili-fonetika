drop view if exists public.level_progress;
drop view if exists public.best_section_results;

create view public.best_section_results
with (security_invoker = true) as
select distinct on (profile_id, lesson_id, section_key)
  profile_id,
  lesson_id,
  section_key,
  score,
  total,
  percent,
  stars,
  completed_at
from public.user_section_results
order by profile_id, lesson_id, section_key, percent desc, completed_at desc;

create view public.level_progress
with (security_invoker = true) as
select
  profile_id,
  lesson_id,
  round(avg(percent))::integer as average_percent,
  count(*) filter (where section_key in ('words', 'sentences')) as completed_sections,
  case
    when round(avg(percent)) >= 96 then 5
    when round(avg(percent)) >= 76 then 4
    when round(avg(percent)) >= 51 then 3
    when round(avg(percent)) >= 26 then 2
    when round(avg(percent)) >= 1 then 1
    else 0
  end as stars,
  bool_and(percent >= 76) and count(*) = 2 as level_passed
from public.best_section_results
group by profile_id, lesson_id;

