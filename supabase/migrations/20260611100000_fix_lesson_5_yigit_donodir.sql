update public.lesson_sentences
set uzbek = 'Bu yigit donodir'
where lesson_id = 5
  and position = 27
  and arabic = 'هَذَا الشَّابُّ ذَكِيٌّ'
  and uzbek = 'Bu yigit donosidir';
