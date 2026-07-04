insert into public.lessons (id, title, level)
values (8, '8-dars', 8)
on conflict (id) do update
set title = excluded.title,
    level = excluded.level;

insert into public.lesson_words (lesson_id, position, arabic, uzbek) values
  (8, 1, 'أُسْتَاذٌ', 'ustoz'),
  (8, 2, 'أَسَاتِذَةٌ', 'ustozlar'),
  (8, 3, 'تِلْمِيذٌ', 'shogird'),
  (8, 4, 'تَلَامِيذُ', 'shogirdlar'),
  (8, 5, 'طَبِيبٌ', 'tabib'),
  (8, 6, 'أَطِبَّاءُ', 'tabiblar'),
  (8, 7, 'تَاجِرٌ', 'savdogar'),
  (8, 8, 'تُجَّارٌ', 'savdogarlar'),
  (8, 9, 'صَانِعٌ', 'hunarmand'),
  (8, 10, 'صَنَعَةٌ', 'hunarmandlar'),
  (8, 11, 'مَاهِرٌ', 'mohir'),
  (8, 12, 'مَهَرَةٌ', 'mohirlar'),
  (8, 13, 'صَالِحٌ', 'solih kishi'),
  (8, 14, 'صُلَحَاءُ', 'solih kishilar')
on conflict (lesson_id, position) do update
set arabic = excluded.arabic,
    uzbek = excluded.uzbek;

insert into public.lesson_sentences (lesson_id, position, arabic, uzbek) values
  (8, 1, 'هَذَا أُسْتَاذٌ', 'Bu ustozdir'),
  (8, 2, 'هَؤُلَاءِ أَسَاتِذَةٌ', 'Bular ustozlardir'),
  (8, 3, 'ذَلِكَ تِلْمِيذٌ', 'Anavi shogirddir'),
  (8, 4, 'أُولَئِكَ تَلَامِيذُ', 'Anavilar shogirdlardir'),
  (8, 5, 'هَذَا طَبِيبٌ مَاهِرٌ', 'Bu mohir tabibdir'),
  (8, 6, 'هَؤُلَاءِ أَطِبَّاءُ مَهَرَةٌ', 'Bular mohir tabiblardir'),
  (8, 7, 'ذَلِكَ تَاجِرٌ صَالِحٌ', 'Anavi solih savdogardir'),
  (8, 8, 'أُولَئِكَ تُجَّارٌ صُلَحَاءُ', 'Anavilar solih savdogarlardir'),
  (8, 9, 'هَذَا صَانِعٌ مَاهِرٌ', 'Bu mohir hunarmanddir'),
  (8, 10, 'هَؤُلَاءِ صَنَعَةٌ مَهَرَةٌ', 'Bular mohir hunarmandlardir'),
  (8, 11, 'أُسْتَاذُنَا صَالِحٌ', 'Bizning ustozimiz solih kishidir'),
  (8, 12, 'تَلَامِيذُكُمْ مَهَرَةٌ', 'Sizlarning shogirdlaringiz mohirlardir'),
  (8, 13, 'أَطِبَّاؤُنَا صُلَحَاءُ', 'Bizning tabiblarimiz solih kishilardir'),
  (8, 14, 'صَنَعَتُهُمْ مَهَرَةٌ', 'Ularning hunarmandlari mohirlardir')
on conflict (lesson_id, position) do update
set arabic = excluded.arabic,
    uzbek = excluded.uzbek;
