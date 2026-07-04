update public.lesson_words
set arabic = replace(
  replace(
    replace(arabic, U&'\0646\0651\064E', U&'\0646\064E\0651'),
    U&'\0646\0651\064F',
    U&'\0646\064F\0651'
  ),
  U&'\0646\0651\0650',
  U&'\0646\0650\0651'
)
where arabic like '%' || U&'\0646\0651' || '%';

update public.lesson_sentences
set arabic = replace(
  replace(
    replace(arabic, U&'\0646\0651\064E', U&'\0646\064E\0651'),
    U&'\0646\0651\064F',
    U&'\0646\064F\0651'
  ),
  U&'\0646\0651\0650',
  U&'\0646\0650\0651'
)
where arabic like '%' || U&'\0646\0651' || '%';

