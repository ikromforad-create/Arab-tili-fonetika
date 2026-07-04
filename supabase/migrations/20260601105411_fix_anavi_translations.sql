update public.lesson_sentences
set uzbek = replace(
  replace(uzbek, 'Ana ular ', 'Anavilar '),
  'Ana u ',
  'Anavi '
)
where uzbek like 'Ana u %'
  or uzbek like 'Ana ular %';
