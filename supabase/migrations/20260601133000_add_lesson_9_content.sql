insert into public.lessons (id, title, level)
values (9, '9-dars', 9)
on conflict (id) do update
set title = excluded.title,
    level = excluded.level;

insert into public.lesson_words (lesson_id, position, arabic, uzbek) values
  (9, 1, 'إِمَامٌ', 'imom'),
  (9, 2, 'أَئِمَّةٌ', 'imomlar'),
  (9, 3, 'مُعَلِّمٌ', 'muallim'),
  (9, 4, 'مُعَلِّمُونَ', 'muallimlar'),
  (9, 5, 'مُدَرِّسٌ', 'mudarris/o''qituvchi'),
  (9, 6, 'مُدَرِّسُونَ', 'mudarrislar'),
  (9, 7, 'مُؤَذِّنٌ', 'muazzin'),
  (9, 8, 'مُؤَذِّنُونَ', 'muazzinlar'),
  (9, 9, 'مُتَكَبِّرٌ', 'mutakabbir'),
  (9, 10, 'مُتَكَبِّرُونَ', 'mutakabbirlar'),
  (9, 11, 'مُتَوَاضِعٌ', 'tavozeli'),
  (9, 12, 'مُتَوَاضِعُونَ', 'tavozelilar'),
  (9, 13, 'مَسْرُورٌ', 'xursand bo''lgan'),
  (9, 14, 'مَسْرُورُونَ', 'xursand bo''lganlar'),
  (9, 15, 'مَحْزُونٌ', 'xafa bo''lgan'),
  (9, 16, 'مَحْزُونُونَ', 'xafa bo''lganlar'),
  (9, 17, 'مُجْتَهِدٌ', 'tirishqoq/faol'),
  (9, 18, 'مُجْتَهِدُونَ', 'tirishqoq/faollar'),
  (9, 19, 'كَسْلَانُ', 'dangasa'),
  (9, 20, 'كُسَالَى', 'dangasalar'),
  (9, 21, 'صَادِقٌ', 'rostgo''y'),
  (9, 22, 'صَادِقُونَ', 'rostgo''ylar'),
  (9, 23, 'كَاذِبٌ', 'yolg''onchi'),
  (9, 24, 'كَاذِبُونَ', 'yolg''onchilar')
on conflict (lesson_id, position) do update
set arabic = excluded.arabic,
    uzbek = excluded.uzbek;

insert into public.lesson_sentences (lesson_id, position, arabic, uzbek) values
  (9, 1, 'هَذَا الرَّجُلُ إِمَامٌ غَنِيٌّ', 'Bu kishi boy imomdir'),
  (9, 2, 'هَؤُلَاءِ الرِّجَالُ أَئِمَّةٌ أَغْنِيَاءُ', 'Bu kishilar boy imomlardir'),
  (9, 3, 'هَذَا الْمُعَلِّمُ رَجُلٌ ذَكِيٌّ', 'Bu o''qituvchi dono kishidir'),
  (9, 4, 'هَؤُلَاءِ الْمُعَلِّمُونَ رِجَالٌ أَذْكِيَاءُ', 'Bu o''qituvchilar dono kishilardir'),
  (9, 5, 'الرَّجُلُ الْفَاسِقُ غَبِيٌّ', 'Gunohkor kishi nodondir'),
  (9, 6, 'الرِّجَالُ الْفَسَقَةُ أَغْبِيَاءُ', 'Gunohkor kishilar nodonlardir'),
  (9, 7, 'هَذَا الْمُدَرِّسُ غَنِيٌّ', 'Bu mudarris badavlatdir'),
  (9, 8, 'هَؤُلَاءِ الْمُدَرِّسُونَ أَغْنِيَاءُ', 'Bu mudarrislar badavlatlardir'),
  (9, 9, 'ذَاكَ الْمُؤَذِّنُ فَقِيرٌ', 'Anavi muazzin kambag''aldir'),
  (9, 10, 'أُولَئِكَ الْمُؤَذِّنُونَ فُقَرَاءُ', 'Anavi muazzinlar kambag''allardir'),
  (9, 11, 'هَذَا الرَّجُلُ مُتَكَبِّرٌ', 'Bu kishi takabburdir'),
  (9, 12, 'هَؤُلَاءِ الرِّجَالُ مُتَكَبِّرُونَ', 'Bu kishilar takabburlardir'),
  (9, 13, 'تِلْكَ الْمَرْأَةُ مُتَوَاضِعَةٌ', 'Anavi xotin tavozelidir'),
  (9, 14, 'أُولَئِكَ النِّسَاءُ مُتَوَاضِعَاتٌ', 'Anavi xotinlar tavozelilardir'),
  (9, 15, 'الْإِنْسَانُ الصَّحِيحُ مَسْرُورٌ', 'Sog''lom kishi xursanddir'),
  (9, 16, 'النَّاسُ الْأَصِحَّاءُ مَسْرُورُونَ', 'Sog''lom kishilar xursanddirlar'),
  (9, 17, 'الْمَرْأَةُ الْمَرِيضَةُ مَحْزُونَةٌ', 'Bemor xotin mahzundir'),
  (9, 18, 'النِّسَاءُ الْمَرْضَى مَحْزُونَاتٌ', 'Bemor xotinlar mahzundirlar'),
  (9, 19, 'هَذَا الْوَلَدُ مُجْتَهِدٌ', 'Bu bola faoldir'),
  (9, 20, 'هَؤُلَاءِ الْأَوْلَادُ مُجْتَهِدُونَ', 'Bu bolalar faoldirlar'),
  (9, 21, 'ذَاكَ التِّلْمِيذُ كَسْلَانُ', 'Anavi shogird dangasadir'),
  (9, 22, 'أُولَئِكَ التَّلَامِيذُ كُسَالَى', 'Anavi shogirdlar dangasalardir'),
  (9, 23, 'هَذَا الرَّجُلُ صَادِقٌ', 'Bu kishi rostgo''ydir'),
  (9, 24, 'هَؤُلَاءِ الرِّجَالُ صَادِقُونَ', 'Bu kishilar rostgo''ylardir'),
  (9, 25, 'تِلْكَ الْخَادِمَةُ كَاذِبَةٌ', 'Anavi xizmatchi ayol yolg''onchidir'),
  (9, 26, 'أُولَئِكَ الْخَادِمَاتُ كَاذِبَاتٌ', 'Anavi xizmatchi ayollar yolg''onchilardir'),
  (9, 27, 'هُوَ مُتَوَاضِعٌ', 'U tavozelidir'),
  (9, 28, 'هُمْ مُتَوَاضِعُونَ', 'Ular tavozelilardir'),
  (9, 29, 'أَنْتَ مُتَكَبِّرٌ', 'Sen takabbursan'),
  (9, 30, 'أَنْتُمْ مُتَكَبِّرُونَ', 'Sizlar takabburlisizlar'),
  (9, 31, 'أَنَا مَسْرُورٌ', 'Men xursandman'),
  (9, 32, 'نَحْنُ مَسْرُورُونَ', 'Biz xursandmiz'),
  (9, 33, 'هِيَ كَاذِبَةٌ', 'U yolg''onchidir'),
  (9, 34, 'هُنَّ كَاذِبَاتٌ', 'Ular yolg''onchilardir'),
  (9, 35, 'أَنْتَ صَادِقٌ', 'Sen rostgo''ysan'),
  (9, 36, 'أَنْتُمْ صَادِقُونَ', 'Sizlar rostgo''ylarsiz')
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
      when coalesce((select is_admin from profile_settings), false) then 9
      else least(9, greatest(1, (select unlocked_level from unlocks)))
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
  where lesson_id between 1 and 9
  group by profile_id
) attempts on attempts.profile_id = p.id
left join (
  select profile_id, sum(score) as total_score, round(avg(percent)) as average_percent
  from public.best_section_results
  where lesson_id between 1 and 9
  group by profile_id
) best on best.profile_id = p.id
left join (
  select profile_id, count(*) filter (where level_passed) as passed_levels
  from public.level_progress
  where lesson_id between 1 and 9
  group by profile_id
) progress on progress.profile_id = p.id
where not coalesce(p.hidden_from_rating, false);
