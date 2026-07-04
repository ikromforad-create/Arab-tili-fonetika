insert into public.lessons (id, title, level)
values (11, '11-dars', 11)
on conflict (id) do update
set title = excluded.title,
    level = excluded.level;

insert into public.lesson_words (lesson_id, position, arabic, uzbek) values
  (11, 1, 'أَزْهَرُ', 'oq yuzli'),
  (11, 2, 'زُهْرٌ', 'oq yuzlilar'),
  (11, 3, 'أَسْمَرُ', 'qora yuzli'),
  (11, 4, 'سُمْرٌ', 'qora yuzlilar'),
  (11, 5, 'أَشْقَرُ', 'qizil yuzli'),
  (11, 6, 'شُقْرٌ', 'qizil yuzlilar'),
  (11, 7, 'أَخْرَسُ', 'tilsiz'),
  (11, 8, 'خُرْسٌ', 'tilsizlar'),
  (11, 9, 'أَصَمُّ', 'kar'),
  (11, 10, 'صُمٌّ', 'karlar'),
  (11, 11, 'أَعْمَى', 'ko''r'),
  (11, 12, 'عُمْيٌ', 'ko''rlar'),
  (11, 13, 'أَحْوَلُ', 'g''ilay ko''zli'),
  (11, 14, 'حُولٌ', 'g''ilay ko''zlilar'),
  (11, 15, 'أَشَلُّ', 'shol'),
  (11, 16, 'شُلٌّ', 'shollar'),
  (11, 17, 'أَعْرَجُ', 'oqsoq'),
  (11, 18, 'عُرْجٌ', 'oqsoqlar'),
  (11, 19, 'أَحْدَبُ', 'bukri'),
  (11, 20, 'حُدْبٌ', 'bukrilar'),
  (11, 21, 'أَلْثَغُ', 'soqov'),
  (11, 22, 'لُثْغٌ', 'soqovlar'),
  (11, 23, 'أَحْمَقُ', 'ahmoq'),
  (11, 24, 'حُمْقٌ', 'ahmoqlar'),
  (11, 25, 'زَهْرَاءُ', 'oq yuzli ayol'),
  (11, 26, 'سَمْرَاءُ', 'qora yuzli ayol'),
  (11, 27, 'شَقْرَاءُ', 'qizil yuzli ayol'),
  (11, 28, 'خَرْسَاءُ', 'tilsiz ayol'),
  (11, 29, 'صَمَّاءُ', 'kar ayol'),
  (11, 30, 'عَمْيَاءُ', 'ko''r ayol'),
  (11, 31, 'حَوْلَاءُ', 'g''ilay ko''zli ayol'),
  (11, 32, 'شَلَّاءُ', 'shol ayol'),
  (11, 33, 'عَرْجَاءُ', 'oqsoq ayol'),
  (11, 34, 'حَدْبَاءُ', 'bukri ayol'),
  (11, 35, 'لَثْغَاءُ', 'soqov ayol'),
  (11, 36, 'حَمْقَاءُ', 'ahmoq ayol')
on conflict (lesson_id, position) do update
set arabic = excluded.arabic,
    uzbek = excluded.uzbek;

insert into public.lesson_sentences (lesson_id, position, arabic, uzbek) values
  (11, 1, 'هُوَ أَزْهَرُ', 'U oq yuzlidir'),
  (11, 2, 'هُمْ زُهْرٌ', 'Ular oq yuzlilardir'),
  (11, 3, 'هِيَ زَهْرَاءُ', 'U ayol oq yuzlidir'),
  (11, 4, 'هُنَّ زُهْرٌ', 'U ayollar oq yuzlilardir'),
  (11, 5, 'أَنْتَ أَسْمَرُ', 'Sen qora yuzlisan'),
  (11, 6, 'أَنْتُمْ سُمْرٌ', 'Sizlar qora yuzlisizlar'),
  (11, 7, 'أَنْتِ خَرْسَاءُ', 'Sen ayol tilsizsan'),
  (11, 8, 'أَنْتُنَّ خُرْسٌ', 'Siz ayollar tilsizsizlar'),
  (11, 9, 'أَنَا أَشْقَرُ', 'Men qizil yuzliman'),
  (11, 10, 'نَحْنُ شُقْرٌ', 'Biz qizil yuzlilarmiz'),
  (11, 11, 'هُوَ أَصَمُّ', 'U kardir'),
  (11, 12, 'هُمْ صُمٌّ', 'Ular karlardir'),
  (11, 13, 'هِيَ عَمْيَاءُ', 'U ayol ko''rdir'),
  (11, 14, 'هُنَّ عُمْيٌ', 'U ayollar ko''rlardir'),
  (11, 15, 'هَذَا الرَّجُلُ أَحْمَقُ', 'Bu kishi ahmoqdir'),
  (11, 16, 'هَذِهِ الْمَرْأَةُ حَمْقَاءُ', 'Bu ayol ahmoqdir'),
  (11, 17, 'هَذَا الإِنْسَانُ أَشَلُّ', 'Bu kishi sholdir'),
  (11, 18, 'هَذَا الشَّيْخُ أَعْرَجُ', 'Bu qariya oqsoqdir'),
  (11, 19, 'هَذِهِ الْعَجُوزُ حَدْبَاءُ', 'Bu kampir bukridir'),
  (11, 20, 'ذَاكَ الشَّابُّ أَزْهَرُ', 'Anavi yigit oq yuzlidir'),
  (11, 21, 'تِلْكَ الشَّابَّةُ شَلَّاءُ', 'Anavi qiz sholdir'),
  (11, 22, 'هَذَا الصَّبِيُّ أَلْثَغُ', 'Bu go''dak soqovdir'),
  (11, 23, 'هَذِهِ الصَّبِيَّةُ لَثْغَاءُ', 'Bu go''dak qiz soqovdir'),
  (11, 24, 'صَدِيقُهُ أَزْهَرُ', 'Uning do''sti oq yuzlidir'),
  (11, 25, 'صَدِيقَتُهَا زَهْرَاءُ', 'Uning ayol do''sti oq yuzlidir'),
  (11, 26, 'اِبْنُكَ أَسْمَرُ', 'Sening o''g''ling qora yuzlidir'),
  (11, 27, 'اِبْنَتُكَ سَمْرَاءُ', 'Sening qizing qora yuzlidir'),
  (11, 28, 'أَبُوهُ أَصَمُّ', 'Uning otasi kardir'),
  (11, 29, 'أُمُّهُ عَمْيَاءُ', 'Uning onasi ko''rdir'),
  (11, 30, 'أَخِي أَعْرَجُ', 'Mening akam/ukam oqsoqdir'),
  (11, 31, 'أُخْتِي لَثْغَاءُ', 'Mening opam/singlim soqovdir'),
  (11, 32, 'الرَّجُلُ الأَخْرَسُ أَصَمُّ', 'Tilsiz kishi kardir'),
  (11, 33, 'الرِّجَالُ الْخُرْسُ صُمٌّ', 'Tilsiz kishilar karlardir'),
  (11, 34, 'الْمَرْأَةُ الْخَرْسَاءُ صَمَّاءُ', 'Tilsiz ayol kardir'),
  (11, 35, 'النِّسَاءُ الْخُرْسُ صُمٌّ', 'Tilsiz ayollar karlardir'),
  (11, 36, 'الإِنْسَانُ الأَعْمَى مَحْزُونٌ', 'Ko''r kishi xafadir'),
  (11, 37, 'الشَّيْخُ الأَعْرَجُ ضَعِيفٌ', 'Oqsoq qariya kuchsizdir'),
  (11, 38, 'الْعَجُوزُ الْحَدْبَاءُ مَرِيضَةٌ', 'Bukri kampir bemordir'),
  (11, 39, 'الْوَلَدُ الأَلْثَغُ مَرِيضٌ', 'Soqov bola bemordir'),
  (11, 40, 'هَذَا الشَّابُّ الأَشْقَرُ خَيَّاطٌ مَاهِرٌ', 'Bu qizil yuzli yigit mohir tikuvchidir'),
  (11, 41, 'ذَاكَ النَّجَّارُ الأَخْرَسُ أَصَمُّ', 'Anavi tilsiz duradgor kardir'),
  (11, 42, 'هَؤُلَاءِ الْحَدَّادُونَ الْخُرْسُ صُمٌّ', 'Bu tilsiz temirchilar karlardir'),
  (11, 43, 'أُولَئِكَ الْحَمَّالُونَ الْفُقَرَاءُ حُولٌ', 'Anavi kambag''al hammollar g''ilay ko''zlilardir')
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
      when coalesce((select is_admin from profile_settings), false) then 11
      else least(11, greatest(1, (select unlocked_level from unlocks)))
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
  where lesson_id between 1 and 11
  group by profile_id
) attempts on attempts.profile_id = p.id
left join (
  select profile_id, sum(score) as total_score, round(avg(percent)) as average_percent
  from public.best_section_results
  where lesson_id between 1 and 11
  group by profile_id
) best on best.profile_id = p.id
left join (
  select profile_id, count(*) filter (where level_passed) as passed_levels
  from public.level_progress
  where lesson_id between 1 and 11
  group by profile_id
) progress on progress.profile_id = p.id
where not coalesce(p.hidden_from_rating, false);
