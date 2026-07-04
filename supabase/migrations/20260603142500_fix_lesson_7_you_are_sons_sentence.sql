update public.lesson_sentences
set arabic = 'أَنْتُمْ أَبْنَاءٌ'
where lesson_id = 7
  and position = 60
  and arabic = 'أَنْتُمْ أَبْنَاؤُكُمْ'
  and uzbek = 'Sizlar o''g''illarsiz';
