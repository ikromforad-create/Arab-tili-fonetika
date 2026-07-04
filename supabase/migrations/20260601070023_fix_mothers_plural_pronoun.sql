update public.lesson_sentences
set arabic = 'أُمَّهَاتُهُنَّ عَالِمَاتٌ'
where lesson_id = 7
  and uzbek = 'Ularning onalari olimalardir'
  and arabic <> 'أُمَّهَاتُهُنَّ عَالِمَاتٌ';
