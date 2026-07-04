insert into public.lessons (id, title, level)
values (10, '10-dars', 10)
on conflict (id) do update
set title = excluded.title,
    level = excluded.level;

insert into public.lesson_words (lesson_id, position, arabic, uzbek) values
  (10, 1, 'خَيَّاطٌ', 'tikuvchi'),
  (10, 2, 'خَيَّاطُونَ', 'tikuvchilar'),
  (10, 3, 'نَجَّارٌ', 'duradgor'),
  (10, 4, 'نَجَّارُونَ', 'duradgorlar'),
  (10, 5, 'حَدَّادٌ', 'temirchi'),
  (10, 6, 'خَبَّازٌ', 'nonvoy'),
  (10, 7, 'قَصَّابٌ', 'qassob'),
  (10, 8, 'خَفَّافٌ', 'etikdo''z/kosib'),
  (10, 9, 'حَلَّاقٌ', 'sartarosh'),
  (10, 10, 'قَصَّارٌ', 'kir yuvuvchi/oqqa bo''yovchi'),
  (10, 11, 'فَرَّاشٌ', 'farrosh'),
  (10, 12, 'حَمَّالٌ', 'yuk tashuvchi'),
  (10, 13, 'دَلَّالٌ', 'dallol'),
  (10, 14, 'فَلَّاحٌ', 'dehqon'),
  (10, 15, 'مَلَّاحٌ', 'dengizchi/matros'),
  (10, 16, 'بَطَّالٌ', 'ishsiz')
on conflict (lesson_id, position) do update
set arabic = excluded.arabic,
    uzbek = excluded.uzbek;

insert into public.lesson_sentences (lesson_id, position, arabic, uzbek) values
  (10, 1, 'هَذَا الرَّجُلُ نَجَّارٌ', 'Bu kishi duradgordir'),
  (10, 2, 'هَؤُلَاءِ الرِّجَالُ نَجَّارُونَ', 'Bu kishilar duradgorlardir'),
  (10, 3, 'هَذَا الْخَيَّاطُ شَيْخٌ', 'Bu tikuvchi qariyadir'),
  (10, 4, 'هَؤُلَاءِ الْخَيَّاطُونَ شُيُوخٌ', 'Bu tikuvchilar qariyalardir'),
  (10, 5, 'جَارُكَ خَبَّازٌ', 'Sening qo''shning nonvoydir'),
  (10, 6, 'جِيرَانُكُمْ خَبَّازُونَ', 'Sizning qo''shnilaringiz nonvoylardir'),
  (10, 7, 'جَارِي حَدَّادٌ', 'Mening qo''shnim temirchidir'),
  (10, 8, 'جِيرَانُنَا حَدَّادُونَ', 'Bizning qo''shnilarimiz temirchilardir'),
  (10, 9, 'هَذَا الْقَصَّابُ مَرِيضٌ', 'Bu qassob bemordir'),
  (10, 10, 'هَؤُلَاءِ الْقَصَّابُونَ مَرْضَى', 'Bu qassoblar bemorlardir'),
  (10, 11, 'ذَاكَ الْخَفَّافُ فَقِيرٌ', 'Anavi etikdo''z kambag''aldir'),
  (10, 12, 'أُولَئِكَ الْخَفَّافُونَ فُقَرَاءُ', 'Anavi etikdo''zlar kambag''allardir'),
  (10, 13, 'هَذَا الْحَلَّاقُ كَاذِبٌ', 'Bu sartarosh yolg''onchidir'),
  (10, 14, 'هَؤُلَاءِ الْحَلَّاقُونَ كَاذِبُونَ', 'Bu sartaroshlar yolg''onchilardir'),
  (10, 15, 'تِلْكَ الْقَصَّارَةُ فَقِيرَةٌ', 'Anavi kir yuvuvchi xotin kambag''aldir'),
  (10, 16, 'أُولَئِكَ الْقَصَّارَاتُ فَقِيرَاتٌ', 'Anavi kir yuvuvchi xotinlar kambag''allardir'),
  (10, 17, 'هَذَا الرَّجُلُ فَرَّاشٌ', 'Bu kishi farroshdir'),
  (10, 18, 'هَؤُلَاءِ الرِّجَالُ فَرَّاشُونَ', 'Bu kishilar farroshlardir'),
  (10, 19, 'ذَاكَ الْحَمَّالُ قَوِيٌّ', 'Anavi hammol kuchlidir'),
  (10, 20, 'أُولَئِكَ الْحَمَّالُونَ أَقْوِيَاءُ', 'Anavi hammollar kuchlilardir'),
  (10, 21, 'هَذَا الدَّلَّالُ صَادِقٌ', 'Bu dallol rostgo''ydir'),
  (10, 22, 'هَؤُلَاءِ الدَّلَّالُونَ صَادِقُونَ', 'Bu dallollar rostgo''ylardir'),
  (10, 23, 'ذَاكَ الْفَلَّاحُ غَنِيٌّ', 'Anavi dehqon boydir'),
  (10, 24, 'أُولَئِكَ الْفَلَّاحُونَ أَغْنِيَاءُ', 'Anavi dehqonlar boylardir'),
  (10, 25, 'هَذَا الْمَلَّاحُ صَحِيحٌ', 'Bu kemachi sog''lomdir'),
  (10, 26, 'هَؤُلَاءِ الْمَلَّاحُونَ أَصِحَّاءُ', 'Bu kemachilar sog''lomlardir'),
  (10, 27, 'ذَاكَ الْكَسْلَانُ بَطَّالٌ', 'Anavi dangasa ishsizdir'),
  (10, 28, 'أُولَئِكَ الْكُسَالَى بَطَّالُونَ', 'Anavi dangasalar ishsizlardir'),
  (10, 29, 'هُوَ نَجَّارٌ', 'U duradgordir'),
  (10, 30, 'هُمْ نَجَّارُونَ', 'Ular duradgorlardir'),
  (10, 31, 'أَنْتَ خَيَّاطٌ', 'Sen tikuvchisan'),
  (10, 32, 'أَنْتُمْ خَيَّاطُونَ', 'Sizlar tikuvchisizlar'),
  (10, 33, 'أَنَا حَدَّادٌ', 'Men temirchiman'),
  (10, 34, 'نَحْنُ حَدَّادُونَ', 'Bizlar temirchilarmiz'),
  (10, 35, 'هُوَ خَبَّازٌ', 'U nonvoydir'),
  (10, 36, 'هُمْ خَبَّازُونَ', 'Ular nonvoylardir'),
  (10, 37, 'أَنْتَ قَصَّابٌ', 'Sen qassobsan'),
  (10, 38, 'أَنْتُمْ قَصَّابُونَ', 'Sizlar qassoblarsiz'),
  (10, 39, 'أَنَا خَفَّافٌ', 'Men etikdo''zman'),
  (10, 40, 'نَحْنُ خَفَّافُونَ', 'Bizlar etikdo''zlarmiz'),
  (10, 41, 'الرَّجُلُ الْبَطَّالُ كَسْلَانُ', 'Ishsiz kishi dangasadir'),
  (10, 42, 'الرِّجَالُ الْبَطَّالُونَ كُسَالَى', 'Ishsiz kishilar dangasalardir'),
  (10, 43, 'الرَّجُلُ الْكَسْلَانُ مَرِيضٌ', 'Dangasa kishi bemordir'),
  (10, 44, 'الرِّجَالُ الْكُسَالَى مَرْضَى', 'Dangasa kishilar bemorlardir')
on conflict (lesson_id, position) do update
set arabic = excluded.arabic,
    uzbek = excluded.uzbek;

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
      when coalesce((select is_admin from profile_settings), false) then 10
      else least(10, greatest(1, (select unlocked_level from unlocks)))
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
  where lesson_id between 1 and 10
  group by profile_id
) attempts on attempts.profile_id = p.id
left join (
  select profile_id, sum(score) as total_score, round(avg(percent)) as average_percent
  from public.best_section_results
  where lesson_id between 1 and 10
  group by profile_id
) best on best.profile_id = p.id
left join (
  select profile_id, count(*) filter (where level_passed) as passed_levels
  from public.level_progress
  where lesson_id between 1 and 10
  group by profile_id
) progress on progress.profile_id = p.id
where not coalesce(p.hidden_from_rating, false);
