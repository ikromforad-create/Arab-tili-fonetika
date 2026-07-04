import { readFileSync, writeFileSync } from 'node:fs';

const wordsSource = JSON.parse(readFileSync('data/shifohiyya-1-lessons-1-10.json', 'utf8'));
const sentencesMarkdown = readFileSync('data/shifohiyya-1-lessons-1-10-sentences.md', 'utf8');
const activeLessons = 11;

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseSentences(markdown) {
  const lessons = {};
  let current = null;
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(\d+)-dars/);
    if (heading) {
      current = Number(heading[1]);
      lessons[current] = [];
      continue;
    }
    if (!current || current > activeLessons || !line.startsWith('- ')) continue;
    const body = line.slice(2);
    const separator = body.indexOf(' - ');
    if (separator === -1) continue;
    const arabic = body.slice(0, separator).trim();
    const uzbek = body.slice(separator + 3).trim().replace(/\.$/, '');
    if (arabic && uzbek) lessons[current].push({ arabic, uzbek });
  }
  return lessons;
}

const sentencesByLesson = parseSentences(sentencesMarkdown);
const lessons = wordsSource.lessons.filter((lesson) => lesson.level <= activeLessons);
const lines = [
  '-- Generated from data/shifohiyya-1-lessons-1-10.json and data/shifohiyya-1-lessons-1-10-sentences.md',
  'begin;',
  '',
  'insert into public.lessons (id, title, level) values',
  lessons.map((lesson) => `  (${lesson.lesson}, ${sql(`${lesson.lesson}-dars`)}, ${lesson.level})`).join(',\n') +
    '\non conflict (id) do update set title = excluded.title, level = excluded.level;',
  '',
  'insert into public.lesson_words (lesson_id, position, arabic, uzbek) values',
  lessons.flatMap((lesson) =>
    lesson.words.map((word, index) =>
      `  (${lesson.lesson}, ${index + 1}, ${sql(word.arabic)}, ${sql(word.uzbek)})`,
    ),
  ).join(',\n') +
    '\non conflict (lesson_id, position) do update\nset arabic = excluded.arabic,\n    uzbek = excluded.uzbek;',
  '',
  'insert into public.lesson_sentences (lesson_id, position, arabic, uzbek) values',
  lessons.flatMap((lesson) =>
    (sentencesByLesson[lesson.lesson] || []).map((sentence, index) =>
      `  (${lesson.lesson}, ${index + 1}, ${sql(sentence.arabic)}, ${sql(sentence.uzbek)})`,
    ),
  ).join(',\n') +
    '\non conflict (lesson_id, position) do update\nset arabic = excluded.arabic,\n    uzbek = excluded.uzbek;',
  '',
  'commit;',
  '',
];

writeFileSync('supabase/seed.sql', lines.join('\n'));
