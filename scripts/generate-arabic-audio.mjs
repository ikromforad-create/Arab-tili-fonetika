import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE_LESSONS = 11;
const GOOGLE_TRANSLATE_TTS_URL = 'https://translate.google.com/translate_tts';
const DOWNLOAD_TIMEOUT_MS = 12000;
const PRONUNCIATION_REPLACEMENTS = [
  ['طَوِيلَاتٌ', 'طَوِيلَااتٌ'],
];
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wordsPath = path.join(rootDir, 'data', 'shifohiyya-1-lessons-1-10.json');
const sentencesPath = path.join(rootDir, 'data', 'shifohiyya-1-lessons-1-10-sentences.md');
const outputDir = path.join(rootDir, 'public', 'audio', 'ar');

function normalizeArabicSpeechText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function pronunciationSpeechText(text) {
  return PRONUNCIATION_REPLACEMENTS.reduce(
    (phrase, [source, target]) => phrase.replaceAll(source, target),
    normalizeArabicSpeechText(text),
  );
}

function pronunciationAudioKey(text) {
  const phrase = normalizeArabicSpeechText(text);
  let hash = 2166136261;
  for (let index = 0; index < phrase.length; index += 1) {
    hash ^= phrase.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${phrase.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

function googleTranslatePronunciationUrl(text) {
  const params = new URLSearchParams({
    ie: 'UTF-8',
    client: 'tw-ob',
    tl: 'ar',
    q: text,
  });
  return `${GOOGLE_TRANSLATE_TTS_URL}?${params.toString()}`;
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
    if (!current || current > BASE_LESSONS || !line.startsWith('- ')) continue;
    const separator = line.indexOf(' - ');
    if (separator === -1) continue;
    const arabic = line.slice(2, separator).trim();
    if (arabic) lessons[current].push(arabic);
  }
  return lessons;
}

async function fileExists(filePath) {
  try {
    const info = await stat(filePath);
    return info.size > 0;
  } catch {
    return false;
  }
}

async function downloadAudio(text, filePath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  const response = await fetch(googleTranslatePronunciationUrl(text), {
    signal: controller.signal,
    headers: {
      Referer: 'https://translate.google.com/',
      'User-Agent': 'Mozilla/5.0 LugatYodlaLocalAudio/1.0',
    },
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Empty audio response');
  await writeFile(filePath, bytes);
}

async function main() {
  const wordsSource = JSON.parse(await readFile(wordsPath, 'utf8'));
  const sentencesMarkdown = await readFile(sentencesPath, 'utf8');
  const sentenceMap = parseSentences(sentencesMarkdown);
  const phrases = new Set();

  for (const lesson of wordsSource.lessons.slice(0, BASE_LESSONS)) {
    for (const word of lesson.words || []) {
      const phrase = normalizeArabicSpeechText(word.arabic);
      if (phrase) phrases.add(phrase);
    }
    for (const sentence of sentenceMap[lesson.lesson] || []) {
      const phrase = normalizeArabicSpeechText(sentence);
      if (phrase) phrases.add(phrase);
    }
  }

  await mkdir(outputDir, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;
  const failures = [];
  const total = phrases.size;

  for (const phrase of phrases) {
    const filePath = path.join(outputDir, `${pronunciationAudioKey(phrase)}.mp3`);
    const speechPhrase = pronunciationSpeechText(phrase);
    const hasPronunciationOverride = speechPhrase !== phrase;
    if (!hasPronunciationOverride && await fileExists(filePath)) {
      skipped += 1;
      processed += 1;
      if (processed % 25 === 0 || processed === total) {
        console.log(`progress ${processed}/${total} downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
      }
      continue;
    }

    try {
      await downloadAudio(speechPhrase, filePath);
      downloaded += 1;
    } catch (error) {
      failed += 1;
      failures.push(`${phrase} -> ${error.message}`);
    }
    processed += 1;
    if (processed % 25 === 0 || processed === total) {
      console.log(`progress ${processed}/${total} downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  console.log(`Arabic audio ready. downloaded=${downloaded} skipped=${skipped} failed=${failed}`);
  if (failures.length) {
    console.log(failures.slice(0, 20).join('\n'));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
