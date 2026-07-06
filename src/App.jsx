import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bug,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  LogOut,
  Medal,
  Mic,
  MicOff,
  Send,
  Star,
  Trophy,
  Upload,
  UserRound,
  Volume2,
  X,
} from 'lucide-react';
import wordsSource from '../data/shifohiyya-1-lessons-1-10.json';
import sentencesMarkdown from '../data/shifohiyya-1-lessons-1-10-sentences.md?raw';
import { getTelegramUser, getTelegramWebApp, initTelegramWebApp, isTelegramWebApp } from './telegramWebApp';
import {
  getSiteClientId,
  createProfileByAdmin,
  createProfile,
  getUsers,
  loginProfile,
  makeSessionId,
  getLeaderboard,
  getProfileProgress,
  recordSiteAppSession,
  recordTelegramWebAppSession,
  saveSectionResult,
  submitErrorReport,
  uploadProfileAvatar,
  updateProfilePlan,
} from './authClient';

const PASS_RATE = 76;
const BASE_LESSONS = 5;
const ACTIVE_LESSONS = 6;
const UNLOCK_ALL_LEVELS = false;
const LEGACY_UNLOCKED_USERNAME = 'ochiq-bosqichlar';
const ADMIN_USERNAME = 'admin';
const MID_REVIEW_AFTER_LEVEL = 5;
const REVIEW_LEVELS = [
  { throughLevel: 5, key: 'review-1-5', title: '1-5 bosqich takrorlash', displayLevel: 'T', seed: 95 },
];
const STORAGE_KEY = 'arab-tili-fonetika-state-v1';
const ANNOUNCEMENT_SESSION_KEY = 'arab-tili-fonetika-oral-practice-announcement-2026-06-10';
const ANNOUNCEMENT_EXPIRES_AT = new Date(2026, 5, 18).getTime();
const REMOVED_LOCAL_USERNAMES = new Set(['ikrom328']);
const TELEGRAM_SESSION_HEARTBEAT_MS = 30000;
const SITE_SESSION_HEARTBEAT_MS = 30000;
let sharedAudioContext = null;
const unlockedAudioElements = new Map();
const pronunciationAudioElements = new Map();
const ARABIC_TEXT_PATTERN = /[\u0600-\u06FF]/;
const GOOGLE_TRANSLATE_TTS_URL = 'https://translate.google.com/translate_tts';
const PRONUNCIATION_REPLACEMENTS = [
  ['طَوِيلَاتٌ', 'طَوِيلَااتٌ'],
];
const LETTER_SPEECH_ALIASES = {
  alif: ['alif', 'elif'],
  ba: ['ba'],
  ta: ['ta'],
  sa: ['sa'],
  jim: ['jim'],
  ha: ['ha'],
  xo: ['xo', 'kho'],
  dal: ['dal'],
  zal: ['zal'],
  ro: ['ro'],
  za: ['za'],
  sin: ['sin'],
  shin: ['shin'],
  sod: ['sod'],
  dod: ['dod'],
  to: ['to'],
  zo: ['zo'],
  "a'yn": ['ayn', 'a yn', 'ain', 'a' + 'yn'],
  "g'oyn": ['goyn', 'g' + 'oyn', 'ghayn', 'ghoyn'],
  fa: ['fa'],
  qof: ['qof'],
  kaf: ['kaf'],
  lam: ['lam'],
  'lam alif': ['lam alif', 'lamelif', 'lam-alif', 'lamalif', 'laam alif'],
  mim: ['mim'],
  nun: ['nun'],
  haa: ['ha', 'haa'],
  vav: ['vav', 'waw', 'vaav'],
  ya: ['ya', 'yya', 'yaa'],
};
const LETTER_ARABIC_TO_LATIN = new Map([
  ['ا', 'alif'],
  ['ب', 'ba'],
  ['ت', 'ta'],
  ['ث', 'sa'],
  ['ج', 'jim'],
  ['ح', 'ha'],
  ['خ', 'xo'],
  ['د', 'dal'],
  ['ذ', 'zal'],
  ['ر', 'ro'],
  ['ز', 'za'],
  ['س', 'sin'],
  ['ش', 'shin'],
  ['ص', 'sod'],
  ['ض', 'dod'],
  ['ط', 'to'],
  ['ظ', 'zo'],
  ['ع', "a'yn"],
  ['غ', "g'oyn"],
  ['ف', 'fa'],
  ['ق', 'qof'],
  ['ك', 'kaf'],
  ['ل', 'lam'],
  ['لا', 'lam alif'],
  ['م', 'mim'],
  ['ن', 'nun'],
  ['ه', 'ha'],
  ['و', 'vav'],
  ['ي', 'ya'],
]);
const ORAL_PRACTICE_ITEM_COUNT = 20;
const ORAL_PRACTICE_WORD_COUNT = 10;
const ORAL_PRACTICE_RECORDING_MS = 9000;
const ARABIC_DIACRITICS_PATTERN = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ALPHABET_LESSON_1_LETTERS = [
  { arabic: 'ا', uzbek: 'alif', speech: 'ألف' },
  { arabic: 'ب', uzbek: 'ba', speech: 'باء' },
  { arabic: 'ت', uzbek: 'ta', speech: 'تاء' },
  { arabic: 'ث', uzbek: 'sa', speech: 'ثاء' },
  { arabic: 'ج', uzbek: 'jim', speech: 'جيم' },
  { arabic: 'ح', uzbek: 'ha', speech: 'حاء' },
  { arabic: 'خ', uzbek: 'xo', speech: 'خاء' },
  { arabic: 'د', uzbek: 'dal', speech: 'دال' },
  { arabic: 'ذ', uzbek: 'zal', speech: 'ذال' },
  { arabic: 'ر', uzbek: 'ro', speech: 'راء' },
  { arabic: 'ز', uzbek: 'za', speech: 'زاي' },
  { arabic: 'س', uzbek: 'sin', speech: 'سين' },
  { arabic: 'ش', uzbek: 'shin', speech: 'شين' },
  { arabic: 'ص', uzbek: 'sod', speech: 'صاد' },
];
const ALPHABET_LESSON_2_LETTERS = [
  { arabic: 'ض', uzbek: 'dod', speech: 'ضاد' },
  { arabic: 'ط', uzbek: 'to', speech: 'طاء' },
  { arabic: 'ظ', uzbek: 'zo', speech: 'ظاء' },
  { arabic: 'ع', uzbek: "a'yn", speech: 'عين' },
  { arabic: 'غ', uzbek: "g'oyn", speech: 'غين' },
  { arabic: 'ف', uzbek: 'fa', speech: 'فاء' },
  { arabic: 'ق', uzbek: 'qof', speech: 'قاف' },
  { arabic: 'ك', uzbek: 'kaf', speech: 'كاف' },
  { arabic: 'ل', uzbek: 'lam', speech: 'لام' },
  { arabic: 'لا', uzbek: 'lam alif', speech: 'لام ألف' },
  { arabic: 'م', uzbek: 'mim', speech: 'ميم' },
  { arabic: 'ن', uzbek: 'nun', speech: 'نون' },
  { arabic: 'ه', uzbek: 'ha', speech: 'هاء' },
  { arabic: 'و', uzbek: 'vav', speech: 'واو' },
  { arabic: 'ي', uzbek: 'ya', speech: 'ياء' },
];
const ALPHABET_LETTER_AUDIO_FILES = new Map([
  ['ا', 'alif.mp3'],
  ['ب', 'ba.mp3'],
  ['ت', 'ta.mp3'],
  ['ث', 'sa.mp3'],
  ['ج', 'jim.mp3'],
  ['ح', 'ha.mp3'],
  ['خ', 'xo.mp3'],
  ['د', 'dal.mp3'],
  ['ذ', 'zal.mp3'],
  ['ر', 'ro.mp3'],
  ['ز', 'za.mp3'],
  ['س', 'sin.mp3'],
  ['ش', 'shin.mp3'],
  ['ص', 'sod.mp3'],
  ['ض', 'dod.mp3'],
  ['ط', 'to.mp3'],
  ['ظ', 'zo.mp3'],
  ['ع', 'ayn.mp3'],
  ['غ', 'goyn.mp3'],
  ['ف', 'fa.mp3'],
  ['ق', 'qof.mp3'],
  ['ك', 'kaf.mp3'],
  ['ل', 'lam.mp3'],
  ['لا', 'lam-alif.mp3'],
  ['م', 'mim.mp3'],
  ['ن', 'nun.mp3'],
  ['ه', 'ha.mp3'],
  ['و', 'vav.mp3'],
  ['ي', 'ya.mp3'],
]);
const ACCOUNT_PLANS = {
  indiv: [
    { value: 'indiv', label: 'INDIV', title: '1 ta individual o’qituvchi hisobi', limit: '20 tagacha o’quvchi hisobi' },
    { value: 'indiv_plus', label: 'INDIV +', title: '1 ta individual o’qituvchi hisobi', limit: '40 tagacha o’quvchi hisobi' },
  ],
  center: [
    { value: 'center', label: 'MARKAZ', title: '10 ta o’qituvchi hisobi', limit: '100 tagacha o’quvchi hisobi' },
    { value: 'center_plus', label: 'MARKAZ +', title: '20 ta o’qituvchi hisobi', limit: '200 tagacha o’quvchi hisobi' },
  ],
};

function makeBeepDataUri(frequency, durationSeconds) {
  const sampleRate = 22050;
  const samples = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2;
  const dataSize = samples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, text) {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < samples; index += 1) {
    const fade = Math.min(index / 600, (samples - index) / 900, 1);
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.55 * fade;
    view.setInt16(44 + index * 2, sample * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const answerSounds = {
  correct: makeBeepDataUri(880, 0.16),
  wrong: makeBeepDataUri(180, 0.18),
  silent: makeBeepDataUri(1, 0.04),
};

function getSoundElement(soundKey) {
  const existing = unlockedAudioElements.get(soundKey);
  if (existing) return existing;
  const audio = document.createElement('audio');
  audio.src = answerSounds[soundKey];
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  audio.style.position = 'fixed';
  audio.style.width = '1px';
  audio.style.height = '1px';
  audio.style.opacity = '0';
  audio.style.pointerEvents = 'none';
  audio.style.left = '-9999px';
  document.body.appendChild(audio);
  unlockedAudioElements.set(soundKey, audio);
  return audio;
}

async function unlockAnswerSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    if (!sharedAudioContext) sharedAudioContext = new AudioContext();
    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume().catch(() => {});
    }
  }
  const silent = getSoundElement('silent');
  silent.volume = 0.01;
  await silent.play().catch(() => {});
}

function starsForPercent(percent = 0) {
  if (percent >= 96) return 5;
  if (percent >= 76) return 4;
  if (percent >= 51) return 3;
  if (percent >= 26) return 2;
  if (percent >= 1) return 1;
  return 0;
}

function StarRating({ percent = 0, compact = false }) {
  const count = starsForPercent(percent);
  return (
    <div className={`star-rating ${compact ? 'compact' : ''}`} aria-label={`${count} yulduz`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={compact ? 15 : 24} className={index < count ? 'filled' : ''} />
      ))}
    </div>
  );
}

function scoreKeyForLesson(lessonOrLevel) {
  return typeof lessonOrLevel === 'object' ? lessonOrLevel.scoreKey || lessonOrLevel.level : lessonOrLevel;
}

function getSectionScore(user, lessonOrLevel, sectionId) {
  return user.progress.bestScores?.[scoreKeyForLesson(lessonOrLevel)]?.sections?.[sectionId] || null;
}

function getLevelScore(user, lessonOrLevel) {
  const score = user.progress.bestScores?.[scoreKeyForLesson(lessonOrLevel)];
  if (!score) return null;
  if (score.sections) {
    const requiredSectionIds = getLessonSectionIds(lessonOrLevel);
    const completed = requiredSectionIds.map((sectionId) => score.sections[sectionId]).filter(Boolean);
    if (!completed.length) return null;
    const hasRequiredSections = requiredSectionIds.every((sectionId) => score.sections[sectionId]);
    const percent = hasRequiredSections
      ? Math.round(completed.reduce((sum, section) => sum + section.percent, 0) / completed.length)
      : null;
    return { ...score, percent, completedSections: completed.length };
  }
  return { ...score, completedSections: getLessonSectionIds(lessonOrLevel).length };
}

function sectionTitle(sectionId) {
  if (sectionId === 'letters') return 'Harflar';
  if (sectionId === 'words') return 'TEST';
  if (sectionId === 'sentences') return "OG'ZAKI MASHQ";
  if (sectionId === 'oral') return "OG'ZAKI MASHQ";
  return 'Mashqlar';
}

function getLessonSectionIds(lessonOrLevel) {
  const level = typeof lessonOrLevel === 'object'
    ? Number(lessonOrLevel.lesson || lessonOrLevel.level)
    : Number(lessonOrLevel);
  const isReview = typeof lessonOrLevel === 'object' && lessonOrLevel.isReview;
  if (level === 1 && !isReview) return ['letters'];
  return Number.isInteger(level) && level >= 1 && level <= ACTIVE_LESSONS && !isReview
    ? ['words', 'sentences', 'oral']
    : ['words', 'sentences'];
}

function requiredSectionCount(lessonOrLevel) {
  return getLessonSectionIds(lessonOrLevel).length;
}

function exerciseProgressKey(lessonOrLevel, sectionId) {
  return `${scoreKeyForLesson(lessonOrLevel)}:${sectionId}`;
}

function getSavedExerciseProgress(user, lesson, sectionId) {
  return user.exerciseProgress?.[exerciseProgressKey(lesson, sectionId)] || null;
}

function withoutSavedExerciseProgress(user, lesson, sectionId) {
  const current = user.exerciseProgress || {};
  const key = exerciseProgressKey(lesson, sectionId);
  if (!current[key]) return current;
  const { [key]: _removed, ...rest } = current;
  return rest;
}

function progressStepLabel(progress, lesson) {
  if (!progress) return '';
  const flowLength = makeSectionFlow(lesson, progress.sectionId).length;
  const stepNumber = Math.min(flowLength, Math.max(1, (progress.stepIndex || 0) + 1));
  return `${stepNumber}/${flowLength}-qadam`;
}

function findLatestExerciseProgress(user, lessons) {
  const saved = Object.values(user.exerciseProgress || {})
    .map((progress) => {
      const lesson = lessons.find((candidate) => String(scoreKeyForLesson(candidate)) === String(progress.scoreKey));
      if (!lesson || !progress.sectionId) return null;
      return { ...progress, lesson };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  return saved[0] || null;
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: [], currentUsername: null };
    let nextState = {
      ...stored,
      users: stored.users || [],
      currentUsername: stored.currentUsername || null,
    };

    if (nextState.currentUsername && !nextState.users.some((candidate) => candidate.username === nextState.currentUsername)) {
      nextState.currentUsername = null;
    }

    if (UNLOCK_ALL_LEVELS && nextState.users.length) {
      nextState = {
        ...nextState,
        users: nextState.users.map((candidate) => ({
          ...candidate,
          progress: {
            ...(candidate.progress || {}),
            unlockedLevel: ACTIVE_LESSONS,
          },
        })),
      };
    }

    if (JSON.stringify(nextState) !== JSON.stringify(stored)) {
      saveState(nextState);
    }
    return nextState;
  } catch {
    return { users: [], currentUsername: null };
  }
}

function saveState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase().replace(/^@+/, '');
}

function getUserIdentityKey(user) {
  if (!user) return '';
  return normalizeUsername(user.username || user.userName || user.login || user.email || user.id);
}

function isRemovedLocalUsername(username) {
  return REMOVED_LOCAL_USERNAMES.has(normalizeUsername(username));
}

function isAdminUsername(username) {
  return normalizeUsername(username) === ADMIN_USERNAME;
}

function isAdminUser(user) {
  return Boolean(user?.isAdmin || isAdminUsername(user?.username));
}

function getAccountTypeLabel(accountType) {
  if (accountType === 'admin') return 'Admin';
  if (accountType === 'center') return 'Markaz';
  if (accountType === 'teacher') return "O'qituvchi";
  if (accountType === 'indiv') return "Individual o'qituvchi";
  return "O'quvchi";
}

function getProfilePlan(profile) {
  return profile?.plan || profile?.tarif || profile?.pricingPlan || '';
}

function getPlanCatalog(accountType) {
  return ACCOUNT_PLANS[accountType] || [];
}

function getPlanMeta(accountType, plan) {
  return getPlanCatalog(accountType).find((candidate) => candidate.value === plan) || null;
}

function getPlanLabel(profile) {
  const accountType = getProfileAccountType(profile);
  const plan = getProfilePlan(profile);
  const meta = getPlanMeta(accountType, plan);
  return meta?.label || (accountType === 'center' ? 'MARKAZ' : accountType === 'indiv' ? 'INDIV' : '');
}

function getPlanDescription(profile) {
  const accountType = getProfileAccountType(profile);
  const plan = getProfilePlan(profile);
  const meta = getPlanMeta(accountType, plan);
  if (!meta) return '';
  return `${meta.title} · ${meta.limit}`;
}

function defaultPlanForAccountType(accountType) {
  if (accountType === 'center') return 'center';
  if (accountType === 'indiv') return 'indiv';
  return '';
}

function getProfileDisplayName(profile) {
  if (!profile) return '';
  const accountType = profile.accountType || profile.account_type;
  const firstName = profile.firstName || profile.first_name || '';
  const lastName = profile.lastName || profile.last_name || '';
  const username = profile.username || '';
  if (accountType === 'center') return firstName || username || 'Markaz';
  const first = firstName;
  const last = lastName;
  return `${first} ${last}`.trim() || profile.username || '';
}

function getProfilePlanDisplay(profile) {
  const accountType = getProfileAccountType(profile);
  const meta = getPlanMeta(accountType, getProfilePlan(profile));
  return meta ? `${meta.label} · ${meta.title} · ${meta.limit}` : '';
}

function getPlanUsage(profile, users) {
  const accountType = getProfileAccountType(profile);
  const plan = getProfilePlan(profile);
  const meta = getPlanMeta(accountType, plan);
  if (!meta) return null;

  if (accountType === 'center') {
    const teacherCount = users.filter((candidate) => getProfileAccountType(candidate) === 'teacher' && getProfileParentId(candidate) === profile.id).length;
    const studentCount = users.filter((candidate) => {
      if (getProfileAccountType(candidate) !== 'student') return false;
      const parentId = getProfileParentId(candidate);
      if (parentId === profile.id) return true;
      return users.some((possibleParent) => (
        possibleParent.id === parentId
        && getProfileParentId(possibleParent) === profile.id
        && ['teacher', 'indiv'].includes(getProfileAccountType(possibleParent))
      ));
    }).length;
    const teacherLimit = plan === 'center_plus' ? 20 : 10;
    const studentLimit = plan === 'center_plus' ? 200 : 100;
    const totalUsed = teacherCount + studentCount;
    const totalLimit = teacherLimit + studentLimit;
    const usagePercent = Math.max(Math.round((totalUsed / totalLimit) * 100), 0);
    return {
      label: plan === 'center_plus' ? 'MARKAZ +' : 'MARKAZ',
      title: meta.title.toUpperCase(),
      limitText: meta.limit.toUpperCase(),
      teacherCount,
      studentCount,
      teacherLimit,
      studentLimit,
      totalUsed,
      totalLimit,
      usagePercent,
      teacherPercent: Math.round((teacherCount / teacherLimit) * 100),
      studentPercent: Math.round((studentCount / studentLimit) * 100),
      usageText: `SIZ TARIFNING ${usagePercent}% NI ISHLATIB BO'LDINGIZ.`,
    };
  }

  if (accountType === 'indiv') {
    const studentCount = users.filter((candidate) => getProfileAccountType(candidate) === 'student' && getProfileParentId(candidate) === profile.id).length;
    const studentLimit = plan === 'indiv_plus' ? 40 : 20;
    const usagePercent = Math.max(Math.round((studentCount / studentLimit) * 100), 0);
    return {
      label: plan === 'indiv_plus' ? 'INDIV +' : 'INDIV',
      title: meta.title.toUpperCase(),
      limitText: meta.limit.toUpperCase(),
      studentCount,
      studentLimit,
      totalUsed: studentCount,
      totalLimit: studentLimit,
      usagePercent,
      studentPercent: Math.round((studentCount / studentLimit) * 100),
      usageText: `SIZ TARIFNING ${usagePercent}% NI ISHLATIB BO'LDINGIZ.`,
    };
  }

  return null;
}

function getProfileCreateLabel(accountType) {
  if (accountType === 'center') return 'Markaz nomi';
  if (accountType === 'indiv') return "Individual o'qituvchi nomi";
  return 'Ism';
}

function getRequesterAccountType(user) {
  if (user?.isAdmin || isAdminUsername(user?.username)) return 'admin';
  return user?.accountType || 'student';
}

function canCreateAccountType(requesterType, nextType) {
  if (requesterType === 'admin') return true;
  if (requesterType === 'center') return ['teacher', 'student'].includes(nextType);
  if (requesterType === 'teacher') return nextType === 'student';
  if (requesterType === 'indiv') return nextType === 'student';
  return false;
}

function getCreationOptions(requesterType) {
  return [
    { value: 'center', label: 'Markaz' },
    { value: 'teacher', label: "O'qituvchi" },
    { value: 'student', label: "O'quvchi" },
    { value: 'indiv', label: "Individual o'qituvchi" },
  ].filter((option) => canCreateAccountType(requesterType, option.value));
}

function getCenterCandidates(candidates) {
  return candidates.filter((candidate) => getProfileAccountType(candidate) === 'center');
}

function getTeacherCandidates(candidates, centerId) {
  if (!centerId) return [];
  return candidates.filter((candidate) => getProfileAccountType(candidate) === 'teacher' && getProfileParentId(candidate) === centerId);
}

function isVisibleRatingRole(accountType) {
  return ['student'].includes(accountType);
}

function getProfileAccountType(profile) {
  return profile?.accountType || profile?.account_type || 'student';
}

function getProfileParentId(profile) {
  return profile?.parentProfileId || profile?.parent_profile_id || null;
}

function getChildrenProfiles(profile, users) {
  if (!profile?.id) return [];
  const profileKeys = new Set([profile.id, profile.username].filter(Boolean));
  const accountType = getProfileAccountType(profile);
  if (accountType === 'center') {
    return users.filter((candidate) => profileKeys.has(getProfileParentId(candidate)) && getProfileAccountType(candidate) === 'teacher');
  }
  if (accountType === 'teacher') {
    return users.filter((candidate) => profileKeys.has(getProfileParentId(candidate)) && getProfileAccountType(candidate) === 'student');
  }
  if (accountType === 'indiv') {
    return users.filter((candidate) => profileKeys.has(getProfileParentId(candidate)) && getProfileAccountType(candidate) === 'student');
  }
  return [];
}

function getAdminHierarchy(users) {
  const centers = getCenterCandidates(users)
    .slice()
    .sort((a, b) => (getProfileDisplayName(a) || a.username || '').localeCompare(getProfileDisplayName(b) || b.username || ''))
    .map((center) => {
      const teachers = getTeacherCandidates(users, center.id)
        .slice()
        .sort((a, b) => (getProfileDisplayName(a) || a.username || '').localeCompare(getProfileDisplayName(b) || b.username || ''))
        .map((teacher) => ({
          teacher,
          students: getChildrenProfiles(teacher, users)
            .slice()
            .sort((a, b) => (getProfileDisplayName(a) || a.username || '').localeCompare(getProfileDisplayName(b) || b.username || '')),
        }));

      return { center, teachers };
    });

  const indivs = users
    .filter((candidate) => getProfileAccountType(candidate) === 'indiv')
    .slice()
    .sort((a, b) => (getProfileDisplayName(a) || a.username || '').localeCompare(getProfileDisplayName(b) || b.username || ''))
    .map((indiv) => ({
      indiv,
      students: getChildrenProfiles(indiv, users)
        .slice()
        .sort((a, b) => (getProfileDisplayName(a) || a.username || '').localeCompare(getProfileDisplayName(b) || b.username || '')),
    }));

  return { centers, indivs };
}

function mergeRemoteProfiles(localUsers, remoteUsers) {
  const byUsername = new Map();
  for (const user of localUsers) {
    byUsername.set(user.username, user);
  }

  for (const remoteUser of remoteUsers) {
    const localUser = byUsername.get(remoteUser.username);
    byUsername.set(remoteUser.username, localUser
      ? {
          ...localUser,
          ...remoteUser,
          progress: localUser.progress || remoteUser.progress || { unlockedLevel: 1, bestScores: {} },
          exerciseProgress: localUser.exerciseProgress || remoteUser.exerciseProgress || {},
        }
      : {
          ...remoteUser,
          progress: remoteUser.progress || { unlockedLevel: 1, bestScores: {} },
          exerciseProgress: remoteUser.exerciseProgress || {},
        });
  }

  return Array.from(byUsername.values());
}

function playAnswerSound(isCorrect) {
  const soundKey = isCorrect ? 'correct' : 'wrong';
  const audio = getSoundElement(soundKey);
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
  audio.play().catch(() => {});

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = sharedAudioContext || new AudioContext();
  sharedAudioContext = context;
  if (context.state === 'suspended') context.resume().catch(() => {});
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = isCorrect ? 'sine' : 'triangle';
  oscillator.frequency.setValueAtTime(isCorrect ? 740 : 180, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(isCorrect ? 980 : 120, context.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.2);
  if (navigator.vibrate) navigator.vibrate(isCorrect ? 18 : [24, 36, 24]);
}

function normalizeArabicSpeechText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function pronunciationSpeechText(text) {
  return PRONUNCIATION_REPLACEMENTS.reduce(
    (phrase, [source, target]) => phrase.replaceAll(source, target),
    normalizeArabicSpeechText(text),
  );
}

function hasArabicText(text) {
  return ARABIC_TEXT_PATTERN.test(String(text || ''));
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

function pronunciationAudioKey(text) {
  const phrase = normalizeArabicSpeechText(text);
  let hash = 2166136261;
  for (let index = 0; index < phrase.length; index += 1) {
    hash ^= phrase.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${phrase.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

function localPronunciationUrl(text) {
  const normalized = normalizeArabicSpeechText(text);
  const letterFile = ALPHABET_LETTER_AUDIO_FILES.get(normalized);
  if (letterFile) return `/audio/ar/letters/${letterFile}`;
  return `/audio/ar/${pronunciationAudioKey(normalized)}.mp3`;
}

function getPronunciationAudio(source) {
  const existing = pronunciationAudioElements.get(source);
  if (existing) return existing;
  const audio = document.createElement('audio');
  audio.src = source;
  audio.preload = 'none';
  audio.setAttribute('playsinline', '');
  pronunciationAudioElements.set(source, audio);
  return audio;
}

function waitForPronunciationAudio(audio) {
  return new Promise((resolve, reject) => {
    function cleanup() {
      audio.removeEventListener('ended', finish);
      audio.removeEventListener('error', fail);
      audio.removeEventListener('abort', fail);
    }

    function finish() {
      cleanup();
      resolve();
    }

    function fail() {
      cleanup();
      reject(new Error('Google Translate audio yuklanmadi.'));
    }

    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', fail, { once: true });
    audio.addEventListener('abort', fail, { once: true });
  });
}

function speakArabicWithBrowser(text) {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (!synth || !Utterance) {
      reject(new Error('Bu brauzer arabcha talaffuzni qo‘llamaydi.'));
      return;
    }

    synth.cancel();
    const utterance = new Utterance(text);
    const voices = synth.getVoices();
    const arabicVoice = voices.find((voice) => voice.lang?.toLowerCase().startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.lang = 'ar';
    utterance.rate = 0.82;
    utterance.pitch = 1;
    utterance.onend = resolve;
    utterance.onerror = () => reject(new Error('Arabcha talaffuz o‘qilmadi.'));
    synth.speak(utterance);
  });
}

async function playPronunciationSource(source) {
  const audio = getPronunciationAudio(source);
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers do not allow resetting remote audio before metadata loads.
  }

  const finished = waitForPronunciationAudio(audio);
  await audio.play();
  await finished;
}

async function playArabicPronunciation(text) {
  const phrase = normalizeArabicSpeechText(text);
  if (!phrase || !hasArabicText(phrase)) return;
  const speechPhrase = pronunciationSpeechText(phrase);

  try {
    await playPronunciationSource(localPronunciationUrl(phrase));
    return;
  } catch {
    // Fall through to the remote source if the local generated MP3 is missing.
  }

  try {
    await playPronunciationSource(googleTranslatePronunciationUrl(speechPhrase));
    return;
  } catch {
    await speakArabicWithBrowser(speechPhrase);
  }
}

function ArabicPronunciationButton({ text, compact = false }) {
  const [playing, setPlaying] = useState(false);
  const phrase = normalizeArabicSpeechText(text);
  if (!hasArabicText(phrase)) return null;

  async function pronounce(event) {
    event.stopPropagation();
    if (playing) return;
    setPlaying(true);
    try {
      await playArabicPronunciation(phrase);
    } catch {
      // Playback can be blocked by embedded browsers, but the lesson flow should continue.
    } finally {
      setPlaying(false);
    }
  }

  return (
    <button
      className={`pronounce-btn ${compact ? 'compact' : ''} ${playing ? 'playing' : ''}`.trim()}
      type="button"
      onClick={pronounce}
      disabled={playing}
      aria-label={`Arabcha talaffuzni eshitish: ${phrase}`}
      title="Arabcha talaffuz"
    >
      {playing ? <span className="pronounce-spinner" aria-hidden="true" /> : <Volume2 size={compact ? 18 : 24} />}
      <span className="sr-only">Arabcha talaffuz</span>
    </button>
  );
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
    const body = line.slice(2);
    const separator = body.indexOf(' - ');
    if (separator === -1) continue;
    const arabic = body.slice(0, separator).trim();
    const uzbek = body.slice(separator + 3).trim();
    if (arabic && uzbek) lessons[current].push({ arabic, uzbek });
  }
  return lessons;
}

function shuffle(items, seed = 1) {
  const result = [...items];
  let state = seed * 9301 + 49297;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 233280 + 12345) % 2147483647;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeChoiceQuestions(items, promptKey, answerKey, seed, limit = items.length) {
  const pool = shuffle(items, seed).slice(0, limit);
  return pool.map((item, index) => {
    const wrongPool = [...new Map(
      items
        .filter((candidate) => candidate[answerKey] !== item[answerKey])
        .map((candidate) => [candidate[answerKey], candidate]),
    ).values()];
    const wrong = shuffle(wrongPool, seed + index + 9).slice(0, 3);
    return {
      kind: 'choice',
      prompt: item[promptKey],
      answer: item[answerKey],
      options: shuffle([item, ...wrong].map((option) => option[answerKey]), seed + index + 21),
    };
  });
}

function tokenize(text) {
  return text
    .replace(/[.,!?;:،؛؟]/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .reduce((tokens, word) => {
      if (/^\(.+\)$/.test(word) && tokens.length) {
        tokens[tokens.length - 1] = `${tokens[tokens.length - 1]} ${word}`;
      } else {
        tokens.push(word);
      }
      return tokens;
    }, []);
}

function makeArrangeQuestions(items, promptKey, answerKey, seed, limit = 10) {
  const candidates = shuffle(items.filter((item) => tokenize(item[answerKey]).length >= 2), seed).slice(0, limit);
  return candidates.map((item, index) => {
    const answerTokens = tokenize(item[answerKey]);
    const distractors = shuffle(
      items.flatMap((candidate) => tokenize(candidate[answerKey])).filter((token) => !answerTokens.includes(token)),
      seed + index + 31,
    ).slice(0, 2);
    return {
      kind: 'arrange',
      prompt: item[promptKey],
      answer: answerTokens.join(' '),
      tokens: shuffle([...answerTokens, ...distractors], seed + index + 43),
      targetLang: answerKey,
    };
  });
}

function makeOralPracticeItems(lesson) {
  if (lesson.level === 1 && !lesson.isReview) {
    return shuffle(ALPHABET_LESSON_1_LETTERS, lesson.seed * 91).map((item) => ({ ...item, oralType: 'letter', speech: item.uzbek }));
  }
  if (lesson.level === 2 && !lesson.isReview) {
    return shuffle(ALPHABET_LESSON_2_LETTERS, lesson.seed * 92).map((item) => ({ ...item, oralType: 'letter', speech: item.uzbek }));
  }
  const words = shuffle(lesson.words, lesson.seed * 70)
    .slice(0, ORAL_PRACTICE_WORD_COUNT)
    .map((item) => ({ ...item, oralType: 'word' }));
  const sentences = shuffle(lesson.sentences, lesson.seed * 80)
    .slice(0, ORAL_PRACTICE_ITEM_COUNT - words.length)
    .map((item) => ({ ...item, oralType: 'sentence' }));
  return shuffle([...words, ...sentences], lesson.seed * 90).slice(0, ORAL_PRACTICE_ITEM_COUNT);
}

function makeSectionFlow(lesson, sectionId) {
  if (lesson.level === 1 && !lesson.isReview) {
    const letters = ALPHABET_LESSON_1_LETTERS;
    return [
      { type: 'section', title: "1-BO'LIM", subtitle: 'ARAB HARFLARI', description: "Arab harflari bilan tanishamiz, so'ng test va og'zaki mashq qilamiz." },
      { type: 'study', title: 'ARAB HARFLARI', mode: 'letters', items: letters, canSkipToTest: false },
      { type: 'quiz', title: "1-MASHQ: HARF NOMINI TOPING", questions: makeChoiceQuestions(letters, 'arabic', 'uzbek', lesson.seed * 11, letters.length) },
      { type: 'oral', title: "OG'ZAKI MASHQ", items: makeOralPracticeItems(lesson) },
    ];
  }
  if (lesson.level === 2 && !lesson.isReview) {
    const letters = ALPHABET_LESSON_2_LETTERS;
    return [
      { type: 'section', title: "1-BO'LIM", subtitle: 'ARAB HARFLARI', description: "Qolgan arab harflari bilan tanishamiz, so'ng test va og'zaki mashq qilamiz." },
      { type: 'study', title: 'ARAB HARFLARI', mode: 'letters', items: letters, canSkipToTest: false },
      { type: 'quiz', title: "1-MASHQ: HARF NOMINI TOPING", questions: makeChoiceQuestions(letters, 'arabic', 'uzbek', lesson.seed * 12, letters.length) },
      { type: 'oral', title: "OG'ZAKI MASHQ", items: makeOralPracticeItems(lesson) },
    ];
  }
  const words = lesson.words;
  const sentences = lesson.sentences;
  const questionLimit = lesson.isReview ? 20 : undefined;
  if (sectionId === 'oral') {
    return [
      { type: 'section', title: "3-bo'lim", subtitle: "Og'zaki mashqlar", description: "Arabcha so'zlar va jumlalarni to'g'ri o'qib berish" },
      { type: 'oral', title: "Og'zaki mashqlar", items: makeOralPracticeItems(lesson) },
    ];
  }
  if (sectionId === 'words') {
    const quizzes = [
      { type: 'quiz', title: "1-mashq: arabchadan o'zbekchaga", questions: makeChoiceQuestions(words, 'arabic', 'uzbek', lesson.seed * 10, questionLimit) },
      { type: 'quiz', title: "2-mashq: o'zbekchadan arabchaga", questions: makeChoiceQuestions(words, 'uzbek', 'arabic', lesson.seed * 20, questionLimit) },
    ];
    return [
      { type: 'section', title: "1-bo'lim", subtitle: "So'zlar" },
      { type: 'study', title: "So'zlar", mode: 'words', items: words, canSkipToTest: lesson.isReview },
      ...quizzes,
    ];
  }
  const quizzes = [
    { type: 'quiz', title: "1-mashq: jumla ma'nosini toping", questions: makeChoiceQuestions(sentences, 'arabic', 'uzbek', lesson.seed * 30, questionLimit) },
    { type: 'quiz', title: '2-mashq: arabcha jumlani toping', questions: makeChoiceQuestions(sentences, 'uzbek', 'arabic', lesson.seed * 40, questionLimit) },
    { type: 'quiz', title: '3-mashq: arabcha jumla tuzing', questions: makeArrangeQuestions(sentences, 'uzbek', 'arabic', lesson.seed * 50, questionLimit) },
    { type: 'quiz', title: "4-mashq: o'zbekcha jumla tuzing", questions: makeArrangeQuestions(sentences, 'arabic', 'uzbek', lesson.seed * 60, questionLimit) },
  ];
  return [
    { type: 'section', title: "2-bo'lim", subtitle: 'Jumlalar' },
    { type: 'study', title: 'Jumlalar', mode: 'sentences', items: sentences, canSkipToTest: lesson.isReview },
    ...quizzes,
  ];
}

function uniqueItems(items) {
  return [...new Map(items.map((item) => [`${item.arabic}|${item.uzbek}`, item])).values()];
}

function makeReviewLesson(baseLessons, review) {
  const sourceLessons = baseLessons.filter((lesson) => lesson.level <= review.throughLevel);
  return {
    lesson: null,
    level: review.key,
    scoreKey: review.key,
    seed: review.seed,
    title: review.title,
    displayLevel: review.displayLevel,
    mapOrder: review.throughLevel + 0.5,
    unlockLevel: review.throughLevel + 1,
    reviewThroughLevel: review.throughLevel,
    isReview: true,
    excludeFromRating: true,
    words: uniqueItems(sourceLessons.flatMap((lesson) => lesson.words)),
    sentences: uniqueItems(sourceLessons.flatMap((lesson) => lesson.sentences)),
  };
}

function lessonTitle(lesson) {
  if (lesson?.level === 1 && !lesson?.isReview) return '1-DARS: ARAB HARFLARI (1-QISM)';
  if (lesson?.level === 2 && !lesson?.isReview) return '2-DARS: ARAB HARFLARI (2-QISM)';
  return lesson.title || `${lesson.level}-bosqich`;
}

function getInitials(user) {
  return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.username[0]?.toUpperCase();
}

function AuthScreen({ onAuth, telegramUser }) {
  const [form, setForm] = useState({
    username: telegramUser?.username || '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!username || !form.password) {
      setError("Username va parolni kiriting.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAuth({
        username,
        password: form.password,
        telegramUserId: telegramUser?.id || null,
      });
    } catch (authError) {
      setError(authError.message || "Login yoki parol noto'g'ri.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-brand">
          <img className="brand-mark" src="/arab-tili-fonetika-logo.png" alt="Arab tili fonetika logo" />
          <h1>ARAB TILI FONETIKA</h1>
          <p>{isTelegramWebApp() ? "Telegram ichida Arabcha talaffuz va so'zlarni yorqin va qulay muhitda bosqichma-bosqich o'rganing." : "Arabcha talaffuz va so'zlarni yorqin va qulay muhitda bosqichma-bosqich o'rganing."}</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            Username
            <input value={form.username} onChange={(event) => update('username', event.target.value)} autoComplete="username" />
          </label>
          <label>
            Parol
            <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="current-password" />
          </label>
          {error && <div className="error-text">{error}</div>}
          <button className="primary-btn" type="submit" disabled={loading}>{loading ? 'Kuting...' : 'Kirish'}</button>
        </form>
      </section>
    </main>
  );
}

function shouldShowAnnouncement() {
  try {
    return Date.now() < ANNOUNCEMENT_EXPIRES_AT
      && sessionStorage.getItem(ANNOUNCEMENT_SESSION_KEY) !== 'closed';
  } catch {
    return Date.now() < ANNOUNCEMENT_EXPIRES_AT;
  }
}

function AnnouncementPopup() {
  const [open, setOpen] = useState(shouldShowAnnouncement);
  if (!open) return null;

  function close() {
    try {
      sessionStorage.setItem(ANNOUNCEMENT_SESSION_KEY, 'closed');
    } catch {
      // Session storage may be unavailable in some embedded browsers.
    }
    setOpen(false);
  }

  return (
    <div className="announcement-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
      <div className="announcement-backdrop" onClick={close} />
      <section className="announcement-panel">
        <button className="announcement-close" type="button" onClick={close} aria-label="Yopish">
          <X size={20} />
        </button>
        <div className="announcement-icon" aria-hidden="true">
          <Mic size={28} />
        </div>
        <div>
          <p className="announcement-greeting">Assalomu alaykum azizlar!</p>
          <h2 id="announcement-title">Yangi mashq turi qo'shildi</h2>
          <p>
            LUG'AT YODLA dasturimizga yangi mashq turi qo'shdik. Endilikda siz so'zlar va
            jumlalarni og'zaki talaffuz qilib mashq qilib yodlashingiz mumkin.
          </p>
        </div>
        <button className="primary-btn announcement-action" type="button" onClick={close}>
          Tushunarli
        </button>
      </section>
    </div>
  );
}

function ErrorReportButton({ user, context }) {
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function close() {
    if (submitting) return;
    setOpen(false);
    setStatus('');
  }

  function resetForm() {
    setScreenshot(null);
    setComment('');
  }

  async function submit(event) {
    event.preventDefault();
    if (!screenshot && !comment.trim()) {
      setStatus('Screenshot yoki izohdan kamida bittasini kiriting.');
      return;
    }
    setSubmitting(true);
    setStatus('');
    try {
      await submitErrorReport({
        user,
        screenshot,
        comment,
        context: {
          ...context,
          pageUrl: window.location.href,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        },
      });
      setStatus('Xabaringiz yuborildi. Rahmat!');
      resetForm();
      window.setTimeout(() => setOpen(false), 900);
    } catch (error) {
      setStatus(error.message || 'Xabar yuborilmadi. Keyinroq qayta urinib ko‘ring.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className="report-fab" type="button" onClick={() => setOpen(true)} title="Xatolik haqida xabar berish">
        <Bug size={16} />
        <span>Xatolik haqida xabar berish</span>
      </button>

      {open && (
        <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="report-backdrop" onClick={close} />
          <form className="report-panel" onSubmit={submit}>
            <button className="report-close" type="button" onClick={close} aria-label="Yopish"><X size={18} /></button>
            <div>
              <h2 id="report-title">Xatolik haqida xabar berish</h2>
              <p>Xatolikni screenshotini yuklang va izoh yozing.</p>
            </div>
            <label className="report-upload">
              <Upload size={20} />
              <span>{screenshot ? screenshot.name : 'Screenshot yuklash'}</span>
              <input type="file" accept="image/*" onChange={(event) => setScreenshot(event.target.files?.[0] || null)} />
            </label>
            <label>
              Izoh
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Qaysi oynada, nima bosilganda yoki nima ko'ringanda xatolik chiqdi?"
                rows={5}
              />
            </label>
            {status && <div className={status.includes('yuborildi') ? 'success-text' : 'error-text'}>{status}</div>}
            <button className="primary-btn" type="submit" disabled={submitting}>
              <Send size={18} />
              {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Avatar({ user }) {
  if (user.avatar) return <img className="avatar" src={user.avatar} alt={`${user.firstName} avatar`} />;
  return <div className="avatar initials">{getInitials(user)}</div>;
}

function isRatingScoreKey(key) {
  return Number.isInteger(Number(key)) && Number(key) >= 1 && Number(key) <= ACTIVE_LESSONS;
}

function totalScore(user) {
  return Object.entries(user.progress.bestScores || {}).reduce((sum, [key, level]) => (
    isRatingScoreKey(key)
      ? sum + Object.values(level.sections || {}).reduce((sectionSum, section) => sectionSum + (section?.score || 0), 0)
      : sum
  ), 0);
}

function passedLevels(user) {
  return Object.entries(user.progress.bestScores || {}).filter(([key, level]) => (
    isRatingScoreKey(key)
      && getLessonSectionIds(Number(key)).every((sectionId) => level.sections?.[sectionId])
      && (level.percent || 0) >= PASS_RATE
  )).length;
}

function averagePercent(user) {
  const completed = Object.entries(user.progress.bestScores || {})
    .filter(([key, level]) => isRatingScoreKey(key) && Number.isFinite(level.percent))
    .map(([, level]) => level.percent);
  if (!completed.length) return 0;
  return Math.round(completed.reduce((sum, percent) => sum + percent, 0) / completed.length);
}

function latestRatingLevel(user) {
  const levels = Object.entries(user.progress.bestScores || {})
    .filter(([key, level]) => isRatingScoreKey(key) && Object.values(level.sections || {}).some((section) => (section?.score || 0) > 0))
    .map(([key]) => Number(key));
  return levels.length ? Math.max(...levels) : 1;
}

function localLeaderboard(users) {
  return users
    .filter((localUser) => isAdminUsername(localUser.username))
    .map((localUser) => ({
      id: localUser.id || localUser.username,
      username: localUser.username,
      first_name: localUser.firstName,
      last_name: localUser.lastName,
      avatar_url: localUser.avatar,
      total_score: totalScore(localUser),
      average_percent: averagePercent(localUser),
      passed_levels: passedLevels(localUser),
      current_level: latestRatingLevel(localUser),
    }))
    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0) || (b.average_percent || 0) - (a.average_percent || 0));
}

function personalRatingRows(user) {
  return Array.from({ length: ACTIVE_LESSONS }, (_, index) => {
    const level = index + 1;
    const score = getLevelScore(user, level);
    const sections = score?.sections || {};
    const test = sections.words?.score || 0;
    const oral = sections.oral?.score || 0;
    return {
      level,
      title: level === 1 ? '1-DARS' : `${level}-DARS`,
      test,
      oral,
      total: test + oral,
      percent: score?.percent ?? null,
      completedSections: score?.completedSections || 0,
      requiredSections: requiredSectionCount(level),
    };
  });
}

function currentRatingPercent(user) {
  const rows = personalRatingRows(user).filter((row) => row.percent !== null);
  if (!rows.length) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length);
}

function leaderboardStage(player) {
  return Math.min(ACTIVE_LESSONS, Math.max(1, player.current_level || (player.passed_levels || 0) + 1));
}

function isLevelLocked(user, lesson) {
  if (UNLOCK_ALL_LEVELS || isAdminUser(user)) return false;
  if (lesson.isReview) return passedLevels(user) < lesson.reviewThroughLevel;
  return (lesson.unlockLevel ?? lesson.level) > (user.progress.unlockedLevel || 1);
}

function LevelMap({ user, lessons, pendingExercise, onStart, onResumeExercise, onRestartExercise, onOpenProfile }) {
  const targetNodeRef = useRef(null);
  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => (b.mapOrder ?? b.level) - (a.mapOrder ?? a.level)),
    [lessons],
  );
  const targetLevel = useMemo(() => {
    const availableLessons = sortedLessons.filter((lesson) => !isLevelLocked(user, lesson));
    return (
      availableLessons.find((lesson) => !getLevelScore(user, lesson))
      || availableLessons[availableLessons.length - 1]
      || sortedLessons[sortedLessons.length - 1]
    )?.level;
  }, [sortedLessons, user]);

  useEffect(() => {
    const node = targetNodeRef.current;
    if (!node) return undefined;
    const scrollTimer = window.setTimeout(() => {
      node.scrollIntoView({ block: 'center', inline: 'nearest' });
    }, 80);
    return () => window.clearTimeout(scrollTimer);
  }, [targetLevel]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="profile profile-button" onClick={onOpenProfile}>
          <Avatar user={user} />
          <div>
            <strong>{user.firstName} {user.lastName}</strong>
            <span>@{user.username}</span>
          </div>
          <UserRound size={20} />
        </button>
        <div className="account-type-pill">{getAccountTypeLabel(user.accountType || 'student')}</div>
        <button className="action-btn top-rating-btn" onClick={onOpenProfile}>
          <Medal size={18} />
          <span>Rating</span>
        </button>
      </header>

      <section className="map-intro">
        <h1>ARAB TILI FONETIKA</h1>
        <p>Turli bosqichlarda arabcha harflar, so'zlar va mashqlar. Yangi bosqichni ochish uchun kamida 76% ball to'plang</p>
      </section>

      {pendingExercise && (
        <section className="resume-panel">
          <div>
            <span>Saqlangan mashq</span>
            <strong>{lessonTitle(pendingExercise.lesson)} - {sectionTitle(pendingExercise.sectionId)}</strong>
            <small>{progressStepLabel(pendingExercise, pendingExercise.lesson)} saqlangan</small>
          </div>
          <div className="resume-actions">
            <button className="primary-btn compact" type="button" onClick={() => onResumeExercise(pendingExercise)}>
              MASHQNI KELGAN JOYIDAN DAVOM ETTIRISH
            </button>
            <button className="secondary-btn" type="button" onClick={() => onRestartExercise(pendingExercise)}>
              BOSHIDAN BOSHLASH
            </button>
          </div>
        </section>
      )}

      <section className="level-map">
        {sortedLessons.map((lesson, reverseIndex) => {
          const locked = isLevelLocked(user, lesson);
          const best = getLevelScore(user, lesson);
          const isTarget = lesson.level === targetLevel && !locked;
          const offset = reverseIndex % 2 === 0 ? 'right' : 'left';
          return (
            <div className={`level-row ${offset} ${lesson.isReview ? 'review-row' : ''} ${isTarget ? 'current' : ''}`} key={lesson.level}>
              <button
                ref={(node) => {
                  if (isTarget) targetNodeRef.current = node;
                }}
                className={`level-node ${lesson.isReview ? 'review-node' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => !locked && onStart(lesson.level)}
                disabled={locked}
                aria-label={`${lessonTitle(lesson)}${isTarget ? ' - boshlash joyi' : ''}`}
              >
                {locked ? <Lock size={28} /> : <Star size={30} />}
                <span>{lesson.displayLevel || lesson.level}</span>
              </button>
              <div className={`level-label ${lesson.isReview ? 'review-label' : ''}`}>
                {lesson.isReview && <small>Takrorlash</small>}
                <strong>{lessonTitle(lesson)}</strong>
                {best?.percent !== null && best?.percent !== undefined ? (
                  <>
                    <span>{best.percent}% o'rtacha natija</span>
                    <StarRating percent={best.percent} compact />
                  </>
                ) : best ? (
                  <span>{best.completedSections}/{requiredSectionCount(lesson)} bo'lim yakunlandi</span>
                ) : (
                  <span>{locked ? 'Yopiq' : isTarget ? 'Shu yerdan boshlang' : 'Boshlash mumkin'}</span>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

function AccountScreen({ user, users, leaderboard, onBack, onLogout, onAvatarUpload, onCreateAccount, onUpdateProfilePlan }) {
  const requesterType = getRequesterAccountType(user);
  const isAdminProfile = requesterType === 'admin';
  const isCenterProfile = requesterType === 'center';
  const isTeacherProfile = requesterType === 'teacher';
  const isDirectStudentOnlyProfile = requesterType === 'teacher' || requesterType === 'indiv';
  const showProgressSummary = requesterType === 'student';
  const [ratingTab, setRatingTab] = useState('personal');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [accountForm, setAccountForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirm: '',
    accountType: isDirectStudentOnlyProfile ? 'student' : 'center',
    parentCenterId: isCenterProfile ? user.id : '',
    parentTeacherId: isDirectStudentOnlyProfile ? user.id : '',
  });
  const [accountStatus, setAccountStatus] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const personalRows = personalRatingRows(user);
  const canManageAccounts = requesterType !== 'student';
  const centerCandidates = getCenterCandidates(users);
  const effectiveCenterId = isCenterProfile ? user.id : accountForm.parentCenterId;
  const teacherCandidates = getTeacherCandidates(users, effectiveCenterId);
  const childrenProfiles = getChildrenProfiles(user, users);
  const showRatingSection = isVisibleRatingRole(requesterType);
  const adminHierarchy = isAdminProfile ? getAdminHierarchy(users) : { centers: [], indivs: [] };
  const selectedTeacher = isCenterProfile
    ? childrenProfiles.find((candidate) => candidate.id === selectedTeacherId) || null
    : null;
  const selectedTeacherStudents = selectedTeacher ? getChildrenProfiles(selectedTeacher, users) : [];
  const heroPlanUsage = getPlanUsage(user, users);
  useEffect(() => {
    if (!isCenterProfile) return;
    if (!selectedTeacherId) return;
    if (!childrenProfiles.some((candidate) => candidate.id === selectedTeacherId)) {
      setSelectedTeacherId('');
    }
  }, [childrenProfiles, isCenterProfile, selectedTeacherId]);

  function uploadAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    onAvatarUpload(file);
    event.target.value = '';
  }

  function updateAccountForm(field, value) {
    setAccountForm((current) => ({ ...current, [field]: value }));
  }

  async function createAccount(event) {
    event.preventDefault();
    setAccountStatus('');
    const trimmedUsername = accountForm.username.trim().toLowerCase();
    const trimmedFirstName = accountForm.firstName.trim();
    const trimmedLastName = accountForm.lastName.trim();
    if (!trimmedUsername || !trimmedFirstName || !accountForm.password || !accountForm.confirm) {
      setAccountStatus('Barcha kataklarni to‘ldiring.');
      return;
    }
    if (accountForm.accountType !== 'center' && !trimmedLastName) {
      setAccountStatus('Barcha kataklarni to‘ldiring.');
      return;
    }
    if (accountForm.password !== accountForm.confirm) {
      setAccountStatus('Parol tasdig‘i mos kelmadi.');
      return;
    }
    if (accountForm.accountType === 'teacher' && !effectiveCenterId) {
      setAccountStatus('Markazni tanlang.');
      return;
    }
    if (accountForm.accountType === 'student' && !accountForm.parentTeacherId) {
      setAccountStatus('O‘qituvchini tanlang.');
      return;
    }
    setAccountBusy(true);
    try {
      const createPayload = {
        username: trimmedUsername,
        firstName: trimmedFirstName,
        lastName: accountForm.accountType === 'center' ? '' : trimmedLastName,
        password: accountForm.password,
        accountType: accountForm.accountType,
        parentProfileId: isTeacherProfile
          ? user.id
          : accountForm.accountType === 'teacher'
          ? effectiveCenterId || null
          : accountForm.accountType === 'student'
            ? accountForm.parentTeacherId || effectiveCenterId || null
            : null,
        requesterAccountType: requesterType,
        requesterProfileId: user.id,
      };
      const created = await onCreateAccount({
        ...createPayload,
      });
      setAccountStatus('Hisob yaratildi.');
        setAccountForm({
          username: '',
          firstName: '',
          lastName: '',
          password: '',
          confirm: '',
        accountType: isDirectStudentOnlyProfile ? 'student' : accountForm.accountType,
          parentCenterId: isCenterProfile ? user.id : '',
        parentTeacherId: isDirectStudentOnlyProfile ? user.id : '',
        });
      if (created?.username) {
        window.setTimeout(() => {
          const refreshEvent = new Event('arab-tili-fonetika-refresh-users');
          window.dispatchEvent(refreshEvent);
        }, 0);
      }
    } catch (error) {
      setAccountStatus(error.message || 'Hisob yaratib bo‘lmadi.');
    } finally {
      setAccountBusy(false);
    }
  }

  return (
    <main className="account-shell">
      <header className="lesson-topbar">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={18} /></button>
        <div>
          <strong>Hisob</strong>
          <span>@{user.username}</span>
        </div>
        {showProgressSummary && <div className="step-pill">{totalScore(user)} ball</div>}
      </header>

      <section className="account-panel">
        <div className="account-hero">
          <Avatar user={user} />
          <div>
            <h1>{getProfileDisplayName(user)}</h1>
            <p>@{user.username}</p>
            <div className="account-type-pill">{getAccountTypeLabel(user.accountType || requesterType)}</div>
            {heroPlanUsage && (
              <div className="plan-pill">
                <span>SIZNING TARIFINGIZ: {heroPlanUsage.label} · {heroPlanUsage.title} · {heroPlanUsage.limitText}.</span>
                <span>{heroPlanUsage.usageText}</span>
              </div>
            )}
          </div>
        </div>
        <div className="account-actions">
          <label className="action-btn" title="Shaxsiy surat yuklash">
            <Upload size={18} />
            <span>Shaxsiy surat yuklash</span>
            <input type="file" accept="image/*" onChange={uploadAvatar} />
          </label>
          <button className="action-btn" onClick={onLogout} title="Chiqish"><LogOut size={18} /><span>Chiqish</span></button>
        </div>

        {canManageAccounts && (
          <section className="admin-create-panel">
            <div className="panel-title">
              <UserRound size={22} />
              <h2>Yangi hisob ochish</h2>
            </div>
              {isDirectStudentOnlyProfile ? (
                <div className="helper-text">
                  Yangi o‘quvchi avtomatik ravishda sizning hisobingiz ostida ochiladi.
                </div>
              ) : (
                <div className="rating-tabs" role="tablist" aria-label="Hisob turi tanlash">
                  {getCreationOptions(requesterType).map((option) => (
                    <button key={option.value} className={accountForm.accountType === option.value ? 'active' : ''} onClick={() => updateAccountForm('accountType', option.value)} type="button">
                      {option.label}
                    </button>
                  ))}
                </div>
            )}
            <form className="admin-create-form" onSubmit={createAccount}>
              <label>
                Username
                <input value={accountForm.username} onChange={(event) => updateAccountForm('username', event.target.value)} />
              </label>
              {accountForm.accountType === 'center' ? (
                <label>
                  {getProfileCreateLabel(accountForm.accountType)}
                  <input value={accountForm.firstName} onChange={(event) => updateAccountForm('firstName', event.target.value)} />
                </label>
              ) : (
                <>
                  <label>
                    {getProfileCreateLabel(accountForm.accountType)}
                    <input value={accountForm.firstName} onChange={(event) => updateAccountForm('firstName', event.target.value)} />
                  </label>
                  <div className="form-grid">
                    <label>
                      Familiya
                      <input value={accountForm.lastName} onChange={(event) => updateAccountForm('lastName', event.target.value)} />
                    </label>
                  </div>
                </>
              )}
              <label>
                Parol
                <input type="password" value={accountForm.password} onChange={(event) => updateAccountForm('password', event.target.value)} />
              </label>
              <label>
                Parolni tasdiqlash
                <input type="password" value={accountForm.confirm} onChange={(event) => updateAccountForm('confirm', event.target.value)} />
              </label>
              {isDirectStudentOnlyProfile ? (
                <div className="helper-text">
                  Yangi o‘quvchi sizning hisobingizga bog‘lanadi.
                </div>
              ) : null}
              {isCenterProfile && accountForm.accountType === 'student' && (
                <label>
                  O'qituvchi
                  <select
                    value={accountForm.parentTeacherId}
                    onChange={(event) => updateAccountForm('parentTeacherId', event.target.value)}
                    disabled={!teacherCandidates.length}
                  >
                    <option value="">
                      {teacherCandidates.length ? 'O‘qituvchini tanlang' : 'Avval o‘qituvchi yo‘q'}
                    </option>
                    {teacherCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {getProfileDisplayName(candidate)} (@{candidate.username})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!isCenterProfile && !isDirectStudentOnlyProfile && accountForm.accountType === 'teacher' && (
                <label>
                  Markaz
                  <select value={accountForm.parentCenterId} onChange={(event) => updateAccountForm('parentCenterId', event.target.value)}>
                    <option value="">Markazni tanlang</option>
                    {centerCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {getProfileDisplayName(candidate)} (@{candidate.username})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!isCenterProfile && !isDirectStudentOnlyProfile && accountForm.accountType === 'student' && (
                <>
                  <label>
                    Markaz
                    <select
                      value={accountForm.parentCenterId}
                      onChange={(event) => {
                        updateAccountForm('parentCenterId', event.target.value);
                        updateAccountForm('parentTeacherId', '');
                      }}
                    >
                      <option value="">Markazni tanlang</option>
                      {centerCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {getProfileDisplayName(candidate)} (@{candidate.username})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    O'qituvchi
                    <select
                      value={accountForm.parentTeacherId}
                      onChange={(event) => updateAccountForm('parentTeacherId', event.target.value)}
                      disabled={!accountForm.parentCenterId}
                    >
                      <option value="">
                        {accountForm.parentCenterId ? 'O‘qituvchini tanlang' : 'Avval markazni tanlang'}
                      </option>
                      {teacherCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {getProfileDisplayName(candidate)} (@{candidate.username})
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {accountStatus && <div className="error-text">{accountStatus}</div>}
              <button className="primary-btn" type="submit" disabled={accountBusy}>
                {accountBusy ? 'Kuting...' : 'Hisob yaratish'}
              </button>
              <small className="helper-text">
                {isDirectStudentOnlyProfile
                  ? 'Yangi o‘quvchi hisobini ochish uchun barcha kataklarni to‘ldiring.'
                  : 'Hisob ma’lumotlarini to‘liq kiriting.'}
              </small>
            </form>
          </section>
        )}

        {isAdminProfile && (
          <section className="admin-hierarchy-panel">
            <div className="panel-title">
              <UserRound size={22} />
              <h2>Ochilgan markazlar</h2>
            </div>
            {adminHierarchy.centers.length ? (
              <div className="admin-hierarchy-list">
                {adminHierarchy.centers.map(({ center, teachers }) => (
                  <article className="admin-hierarchy-center" key={center.id}>
                    <div className="admin-hierarchy-center-head">
                      <strong>{getProfileDisplayName(center)}</strong>
                      <small>@{center.username} · {getAccountTypeLabel(getProfileAccountType(center))}</small>
                      {getPlanUsage(center, users) && (
                        <span className="plan-pill compact">
                          SIZNING TARIFINGIZ: {getPlanUsage(center, users).label} · {getPlanUsage(center, users).title} · {getPlanUsage(center, users).limitText}. {getPlanUsage(center, users).usageText}
                        </span>
                      )}
                      {isAdminProfile && (
                        <div className="plan-select-row">
                          <label>
                            Tarif
                            <select value={getProfilePlan(center)} onChange={(event) => onUpdateProfilePlan(center.id, event.target.value)}>
                              {getPlanCatalog('center').map((plan) => (
                                <option key={plan.value} value={plan.value}>
                                  {plan.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                    {teachers.length ? (
                      <div className="admin-hierarchy-teachers">
                        {teachers.map(({ teacher, students }) => (
                          <div className="admin-hierarchy-teacher" key={teacher.id}>
                            <div className="admin-hierarchy-teacher-head">
                              <strong>{getProfileDisplayName(teacher)}</strong>
                              <small>@{teacher.username} · {getAccountTypeLabel(getProfileAccountType(teacher))}</small>
                            </div>
                            {students.length ? (
                              <div className="admin-hierarchy-students">
                                {students.map((student) => (
                                  <div className="admin-hierarchy-student" key={student.id}>
                                    <strong>{getProfileDisplayName(student)}</strong>
                                    <small>@{student.username} · {getAccountTypeLabel(getProfileAccountType(student))}</small>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="empty-state">O‘quvchilar yo‘q.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-state">O‘qituvchilar yo‘q.</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Hozircha ochilgan markazlar yo‘q.</p>
            )}
          </section>
        )}

        {isAdminProfile && (
          <section className="admin-hierarchy-panel">
            <div className="panel-title">
              <UserRound size={22} />
              <h2>Individual o‘qituvchilar</h2>
            </div>
            {adminHierarchy.indivs.length ? (
              <div className="admin-hierarchy-list">
                {adminHierarchy.indivs.map(({ indiv, students }) => (
                  <article className="admin-hierarchy-center" key={indiv.id}>
                    <div className="admin-hierarchy-center-head">
                      <strong>{getProfileDisplayName(indiv)}</strong>
                      <small>@{indiv.username} · {getAccountTypeLabel(getProfileAccountType(indiv))}</small>
                      {getPlanUsage(indiv, users) && (
                        <span className="plan-pill compact">
                          SIZNING TARIFINGIZ: {getPlanUsage(indiv, users).label} · {getPlanUsage(indiv, users).title} · {getPlanUsage(indiv, users).limitText}. {getPlanUsage(indiv, users).usageText}
                        </span>
                      )}
                      {isAdminProfile && (
                        <div className="plan-select-row">
                          <label>
                            Tarif
                            <select value={getProfilePlan(indiv)} onChange={(event) => onUpdateProfilePlan(indiv.id, event.target.value)}>
                              {getPlanCatalog('indiv').map((plan) => (
                                <option key={plan.value} value={plan.value}>
                                  {plan.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                    {students.length ? (
                      <div className="admin-hierarchy-students">
                        {students.map((student) => (
                          <div className="admin-hierarchy-student" key={student.id}>
                            <strong>{getProfileDisplayName(student)}</strong>
                            <small>@{student.username} · {getAccountTypeLabel(getProfileAccountType(student))}</small>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-state">O‘quvchilar yo‘q.</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Hozircha individual o‘qituvchilar yo‘q.</p>
            )}
          </section>
        )}

        {(childrenProfiles.length > 0 || user.accountType === 'center' || user.accountType === 'teacher' || user.accountType === 'indiv') && (
          <section className="children-panel">
            <div className="panel-title">
              <UserRound size={22} />
              <h2>
                {user.accountType === 'center'
                  ? 'Tarkibidagi o‘qituvchilar'
                  : user.accountType === 'teacher'
                    ? "Tarkibidagi o‘quvchilar"
                    : user.accountType === 'indiv'
                      ? "Tarkibidagi o‘quvchilar"
                    : 'Bog‘langan hisoblar'}
              </h2>
            </div>
            {childrenProfiles.length ? (
              <div className="children-list">
                {childrenProfiles.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    className={`children-row children-row-button ${isCenterProfile && selectedTeacherId === child.id ? 'active' : ''}`}
                    onClick={isCenterProfile ? () => setSelectedTeacherId((current) => (current === child.id ? '' : child.id)) : undefined}
                  >
                    <strong>{getProfileDisplayName(child)}</strong>
                    <small>@{child.username} · {getAccountTypeLabel(child.accountType)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                {user.accountType === 'center'
                  ? 'Hozircha bu markazga bog‘langan o‘qituvchi yo‘q.'
                  : user.accountType === 'teacher'
                    ? 'Hozircha bu o‘qituvchiga bog‘langan o‘quvchi yo‘q.'
                    : user.accountType === 'indiv'
                      ? 'Hozircha bu individual o‘qituvchiga bog‘langan o‘quvchi yo‘q.'
                    : 'Bog‘langan hisoblar topilmadi.'}
              </p>
            )}
            {isCenterProfile && (
              <p className="helper-text">
                O‘qituvchi nomiga bosib, uning o‘quvchilarini ko‘ring.
              </p>
            )}
          </section>
        )}

        {showProgressSummary && (
          <div className="stats-grid">
            <div><span>Jami ball</span><strong>{totalScore(user)}</strong></div>
            <div><span>O'tgan bosqich</span><strong>{passedLevels(user)}</strong></div>
            <div><span>Ochilgan bosqich</span><strong>{user.progress.unlockedLevel || 1}</strong></div>
            <div><span>Rating</span><strong>{currentRatingPercent(user)}%</strong></div>
          </div>
        )}
      </section>

      {showRatingSection && (
      <section className="leaderboard-panel">
        <div className="panel-title">
          <Medal size={22} />
          <h2>Rating</h2>
        </div>
        <div className="rating-tabs" role="tablist" aria-label="Rating turi">
          <button className={ratingTab === 'personal' ? 'active' : ''} onClick={() => setRatingTab('personal')} type="button">
            Shaxsiy rating
          </button>
          <button className={ratingTab === 'global' ? 'active' : ''} onClick={() => setRatingTab('global')} type="button">
            Umumiy rating
          </button>
        </div>

        {ratingTab === 'personal' ? (
          <div className="personal-rating-list">
            {personalRows.map((row) => (
              <div className="personal-rating-row" key={row.level}>
                <div className="level-badge">{row.level}</div>
                <div>
                  <strong>{row.title}</strong>
                  <small>
                    TEST: {row.test} ball - OG'ZAKI MASHQ: {row.oral} ball
                  </small>
                </div>
                <div className="leaderboard-score">
                  <small>{row.percent === null ? `${row.completedSections}/${row.requiredSections} bo'lim` : `${row.percent}%`}</small>
                  <b>{row.total} ball</b>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="leaderboard-list">
            {(leaderboard.length ? leaderboard : []).map((player, index) => (
              <div className="leaderboard-row" key={player.id || player.username}>
                <strong>{index + 1}</strong>
                {player.avatar_url ? <img src={player.avatar_url} alt="" /> : <div className="mini-avatar">{`${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`}</div>}
                <div>
                  <span>{player.first_name} {player.last_name}</span>
                  <small>@{player.username} · {getAccountTypeLabel(player.account_type)}</small>
                </div>
                <div className="leaderboard-score">
                  <b>{player.total_score || 0} ball</b>
                  <small>{leaderboardStage(player)}-bosqich</small>
                </div>
              </div>
            ))}
            {!leaderboard.length && <p>Rating hali yuklanmadi.</p>}
          </div>
        )}
      </section>
      )}

      {isCenterProfile && selectedTeacher && (
        <section className="children-panel teacher-students-panel">
          <div className="panel-title">
            <UserRound size={22} />
            <h2>{getProfileDisplayName(selectedTeacher)} o‘quvchilari</h2>
          </div>
          {selectedTeacherStudents.length ? (
            <div className="children-list">
              {selectedTeacherStudents.map((child) => (
                <div className="children-row" key={child.id}>
                  <strong>{getProfileDisplayName(child)}</strong>
                  <small>@{child.username} · {getAccountTypeLabel(child.accountType)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Hozircha bu o‘qituvchiga bog‘langan o‘quvchi yo‘q.</p>
          )}
        </section>
      )}
    </main>
  );
}

function LevelSections({ user, lesson, onBack, onStartSection }) {
  const levelScore = getLevelScore(user, lesson);
  const isAlphabetLesson = (lesson.level === 1 || lesson.level === 2) && !lesson.isReview;
  const alphabetStartText = lesson.level === 1
    ? "Bu darsda arab harflarini alifdan sodgacha o'rganasiz. Avval tanishasiz, keyin test va og'zaki mashq qilasiz."
    : "Bu darsda qolgan arab harflarini o'rganasiz. Avval tanishasiz, keyin test va og'zaki mashq qilasiz.";
  const sectionConfigs = getLessonSectionIds(lesson).map((sectionId, index) => {
    const descriptions = {
      letters: lesson.level === 1
        ? "Alifdan sodgacha bo'lgan harflar, test va og'zaki mashq."
        : "Qolgan harflar, test va og'zaki mashq.",
      words: lesson.isReview ? `1-${lesson.reviewThroughLevel} bosqich so'zlaridan takrorlash mashqlari.` : "Arabcha so'zlarni yodlash va mashqlarini bajarish.",
      sentences: lesson.isReview ? `1-${lesson.reviewThroughLevel} bosqich jumlalaridan takrorlash mashqlari.` : "Jumlalar, tarjima tanlash va so'zlardan gap tuzish.",
      oral: "Arabcha so'zlar va jumlalarni to'g'ri o'qib berish.",
    };
    return {
      sectionId,
      number: `${index + 1}-bo'lim`,
      title: sectionTitle(sectionId),
      description: descriptions[sectionId],
      score: getSectionScore(user, lesson, sectionId),
      savedProgress: getSavedExerciseProgress(user, lesson, sectionId),
    };
  });
  const completedScores = sectionConfigs.map((section) => section.score).filter(Boolean);
  const average = completedScores.length === sectionConfigs.length
    ? Math.round(completedScores.reduce((sum, score) => sum + score.percent, 0) / completedScores.length)
    : null;

  return (
    <main className="lesson-shell">
      <header className="lesson-topbar">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={18} /></button>
        <div>
          <strong>{lessonTitle(lesson)}</strong>
          <span>Bo'limni tanlang</span>
        </div>
        <div className="account-type-pill">{getAccountTypeLabel(user.accountType || 'student')}</div>
        <div className="step-pill">{average ?? levelScore?.percent ?? 0}%</div>
      </header>
      <section className={`section-select ${lesson.isReview ? 'review-section-select' : ''}`}>
        <div className={`section-summary ${lesson.isReview ? 'review-summary' : ''}`}>
          {lesson.isReview && <span className="review-kicker">Takrorlash mashqlari</span>}
          <h1>{lessonTitle(lesson)}</h1>
          <p>
            {isAlphabetLesson
              ? alphabetStartText
              : `Keyingi bosqich ochilishi uchun bo'limlarning o'rtacha natijasi kamida ${PASS_RATE}% bo'lishi kerak.`}
          </p>
          <div className="average-box">
            <strong>{average === null ? "Hali to'liq emas" : `${average}% o'rtacha`}</strong>
            <StarRating percent={average || 0} />
          </div>
        </div>
        {isAlphabetLesson ? (
          <div className="section-grid">
            <article className="section-choice review-choice">
              <div className="section-choice-head">
                <span>1-BO'LIM</span>
                <strong>ARAB HARFLARI</strong>
              </div>
              <p>{lesson.level === 1 ? "Alifdan sodgacha bo'lgan arab harflari bilan tanishish, test va og'zaki mashq uchun dars." : "Qolgan arab harflari bilan tanishish, test va og'zaki mashq uchun dars."}</p>
              <div className="section-actions">
                <button className="primary-btn section-start-btn" type="button" onClick={() => onStartSection('letters', { restart: true })}>
                  BOSHLASH
                </button>
              </div>
            </article>
          </div>
        ) : (
          <div className="section-grid">
            {sectionConfigs.map((section) => (
              <SectionChoice
                key={section.sectionId}
                number={section.number}
                title={section.title}
                description={section.description}
                score={section.score}
                savedProgress={section.savedProgress}
                lesson={lesson}
                isReview={lesson.isReview}
                onResume={() => onStartSection(section.sectionId)}
                onStart={() => onStartSection(section.sectionId, { restart: true })}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SectionChoice({ number, title, description, score, savedProgress, lesson, isReview = false, onResume, onStart }) {
  return (
    <article className={`section-choice ${isReview ? 'review-choice' : ''}`}>
      <div className="section-choice-head">
        <span>{number}</span>
        <strong>{title}</strong>
      </div>
      <p>{description}</p>
      <div className="section-score">
        {score ? (
          <>
            <strong>{score.percent}%</strong>
            <StarRating percent={score.percent} compact />
          </>
        ) : (
          <span>Hali yechilmagan</span>
        )}
        {savedProgress && <small>Davom ettirish joyi: {progressStepLabel(savedProgress, lesson)}</small>}
      </div>
      <div className="section-actions">
        {savedProgress && (
          <button className="primary-btn compact" type="button" onClick={onResume}>
            MASHQNI KELGAN JOYIDAN DAVOM ETTIRISH
          </button>
        )}
        <button className={savedProgress ? 'secondary-btn' : 'primary-btn compact'} type="button" onClick={onStart}>
          {savedProgress ? 'BOSHIDAN BOSHLASH' : score ? 'Qayta yechish' : 'Boshlash'}
        </button>
      </div>
    </article>
  );
}

function SectionStep({ step, onDone }) {
  return (
    <section className="lesson-card section-card">
      <div className="section-number">{step.title}</div>
      <h1>{step.subtitle}</h1>
      <p>{step.description || (step.subtitle === 'TEST' ? "Avval testni yeching, keyin mashqlarda mustahkamlang." : "Endi shu darsdagi og'zaki mashqni bajaramiz.")}</p>
      <button className="primary-btn compact" onClick={onDone}>Boshlash</button>
    </section>
  );
}

function normalizeArabicSpeech(text) {
  return String(text || '')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS_PATTERN, '')
    .replace(/[إأٱآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLatinSpeech(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTelegramIOSWebApp() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOS && Boolean(window.Telegram?.WebApp?.initData);
}

function openCurrentPageInExternalBrowser() {
  const webApp = getTelegramWebApp();
  const url = window.location.href;
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function ensureMicrophoneAccess() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia');
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
  return true;
}

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function supportsBrowserSpeechRecognition() {
  return Boolean(getSpeechRecognitionCtor());
}

function transcribeWithBrowserSpeechRecognition({ lang = 'ar', durationMs = 5000 } = {}) {
  const SpeechRecognition = getSpeechRecognitionCtor();
  if (!SpeechRecognition) {
    return Promise.reject(new Error('SpeechRecognition not supported'));
  }

  return new Promise((resolve, reject) => {
    const recognition = new SpeechRecognition();
    let settled = false;
    let timeoutId = null;
    let stopping = false;
    let finalTranscript = '';

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      fn(value);
    };

    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      for (let index = event.resultIndex || 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const value = result?.[0]?.transcript || '';
        if (!value) continue;
        finalTranscript = value;
        if (result?.isFinal || value.trim()) {
          stopping = true;
          try {
            recognition.stop();
          } catch {
            // If stop() fails, the watchdog/timeout path will still end it.
          }
          finish(resolve, finalTranscript.trim());
          return;
        }
      }
    };

    recognition.onerror = (event) => {
      const error = new Error(event?.error || 'SpeechRecognition error');
      error.name = event?.error || 'SpeechRecognitionError';
      error.code = event?.error || 'SpeechRecognitionError';
      finish(reject, error);
    };

    recognition.onend = () => {
      if (!settled && !stopping) {
        // If the browser ends without producing a transcript, let the timeout
        // handler or error path decide what to show.
        return;
      }
      finish(resolve, finalTranscript.trim());
    };

    timeoutId = window.setTimeout(() => {
      stopping = true;
      try {
        recognition.stop();
      } catch {
        finish(resolve, '');
      }
    }, durationMs);

    recognition.start();
  });
}

function transliterateArabicToLatin(text) {
  const source = normalizeArabicSpeech(text);
  if (!source) return '';
  const map = {
    ا: 'a',
    ب: 'b',
    ت: 't',
    ث: 's',
    ج: 'j',
    ح: 'h',
    خ: 'x',
    د: 'd',
    ذ: 'z',
    ر: 'r',
    ز: 'z',
    س: 's',
    ش: 'sh',
    ص: 's',
    ض: 'd',
    ط: 't',
    ظ: 'z',
    ع: 'a',
    غ: 'g',
    ف: 'f',
    ق: 'q',
    ك: 'k',
    ل: 'l',
    م: 'm',
    ن: 'n',
    ه: 'h',
    و: 'v',
    ي: 'y',
    ء: '',
    ؤ: 'v',
    ئ: 'y',
    ة: 'h',
    ى: 'y',
  };
  return source
    .split('')
    .map((char) => map[char] ?? ' ')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLetterSpeechCandidates(item) {
  const normalizedLatin = normalizeLatinSpeech(item?.uzbek);
  const normalizedArabicSpeech = normalizeArabicSpeech(item?.speech);
  const transliteratedArabicSpeech = transliterateArabicToLatin(item?.speech);
  const transliteratedArabicLetter = LETTER_ARABIC_TO_LATIN.get(item?.arabic) || '';
  const aliases = LETTER_SPEECH_ALIASES[normalizedLatin] || [];
  const hamzaLessArabicSpeech = normalizedArabicSpeech.replace(/اء$/g, 'ا');
  return [...new Set([
    normalizedLatin,
    normalizedArabicSpeech,
    hamzaLessArabicSpeech,
    transliteratedArabicSpeech,
    transliteratedArabicLetter,
    ...aliases.map(normalizeLatinSpeech),
  ].filter(Boolean))];
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function textSimilarity(left, right) {
  const longest = Math.max(left.length, right.length);
  if (!longest) return 1;
  return 1 - (levenshteinDistance(left, right) / longest);
}

function bestTokenSimilarity(expectedToken, heardTokens) {
  return heardTokens.reduce((best, heardToken) => Math.max(best, textSimilarity(expectedToken, heardToken)), 0);
}

function isArabicSpeechMatch(expected, heard) {
  const normalizedExpectedArabic = normalizeArabicSpeech(expected);
  const normalizedHeardArabic = normalizeArabicSpeech(heard);
  const normalizedExpectedLatin = normalizeLatinSpeech(expected);
  const normalizedHeardLatin = normalizeLatinSpeech(heard);
  const transliteratedExpected = transliterateArabicToLatin(expected);
  const transliteratedHeard = transliterateArabicToLatin(heard);

  const candidates = [
    [normalizedExpectedArabic, normalizedHeardArabic],
    [normalizedExpectedLatin, normalizedHeardLatin],
    [normalizedExpectedLatin, transliteratedHeard],
    [transliteratedExpected, normalizedHeardLatin],
    [transliteratedExpected, transliteratedHeard],
  ].filter(([left, right]) => left && right);

  return candidates.some(([left, right]) => {
    if (left === right) return true;
    const compactLeft = left.replace(/\s/g, '');
    const compactRight = right.replace(/\s/g, '');
    if (compactLeft === compactRight) return true;
    if (compactLeft.length > 4 && (compactRight.includes(compactLeft) || compactLeft.includes(compactRight))) return true;

    const compactScore = textSimilarity(compactLeft, compactRight);
    const leftTokens = left.split(' ').filter(Boolean);
    const rightTokens = right.split(' ').filter(Boolean);

    if (leftTokens.length === 1) {
      const threshold = compactLeft.length <= 4 ? 0.66 : 0.72;
      return compactScore >= threshold || bestTokenSimilarity(leftTokens[0], rightTokens) >= threshold;
    }

    const tokenAverage = leftTokens.reduce((sum, token) => sum + bestTokenSimilarity(token, rightTokens), 0) / leftTokens.length;
    const strongTokenMatches = leftTokens.filter((token) => bestTokenSimilarity(token, rightTokens) >= 0.7).length / leftTokens.length;
    return compactScore >= 0.7 || tokenAverage >= 0.72 || strongTokenMatches >= 0.7;
  });
}

function isLetterSpeechMatch(item, heard) {
  const heardLatin = normalizeLatinSpeech(heard);
  const heardArabic = normalizeArabicSpeech(heard);
  const heardTranslit = transliterateArabicToLatin(heard);
  const heardCanonical = heardArabic ? (LETTER_ARABIC_TO_LATIN.get(heardArabic) || '') : '';
  const candidates = getLetterSpeechCandidates(item);
  const compared = [heardLatin, heardArabic, heardTranslit, heardCanonical].filter(Boolean);
  if (!candidates.length || !compared.length) return false;
  return candidates.some((candidate) => compared.some((value) => {
    if (candidate === value) return true;
    const compactCandidate = candidate.replace(/\s/g, '');
    const compactValue = value.replace(/\s/g, '');
    if (compactCandidate === compactValue) return true;
    if (candidate.length <= 3 && compactValue.length <= 3 && candidate[0] === compactValue[0]) return true;
    return textSimilarity(compactCandidate, compactValue) >= 0.8;
  }));
}

function OralPracticeStep({ step, initialIndex = 0, onDone, onPoint, onQuestionChange }) {
  const safeInitialIndex = Math.min(step.items.length - 1, Math.max(0, initialIndex || 0));
  const [index, setIndex] = useState(safeInitialIndex);
  const [listening, setListening] = useState(false);
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState('');
  const stopTimerRef = useRef(null);
  const item = step.items[index];
  const isSentence = item.oralType === 'sentence';
  const isLetter = item.oralType === 'letter';
  const canUseMic = supportsBrowserSpeechRecognition();
  const expectedSpeech = isLetter
    ? (item.speech || item.uzbek || item.arabic)
    : (item.speech || item.arabic || item.uzbek);

  useEffect(() => () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
  }, []);

  function markResult(isCorrect) {
    setLocked(true);
    playAnswerSound(isCorrect);
    if (isCorrect) {
      setStatus("To'g'ri o'qildi");
      onPoint();
    } else {
      setStatus('To‘liq eshitilmadi, yana bir bor urinib ko‘ring');
    }
  }

  async function startListening(options = {}) {
    const force = Boolean(options.force);
    if (listening || (locked && !force)) return;
    if (!canUseMic) {
      setStatus(isTelegramIOSWebApp()
        ? "Telegram mini app bu qurilmada mikrofonga kirishni cheklaydi. Sahifani Safari yoki Chrome'da ochib ko'ring."
        : "Bu brauzer SpeechRecognition'ni qo'llamaydi.");
      return;
    }
    if (force) setLocked(false);
    setStatus('Mikrofon ruxsatini tekshiryapmiz...');
    setListening(true);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);

    try {
      setStatus('Ovoz tinglanmoqda...');
      const recordingPromise = transcribeWithBrowserSpeechRecognition({ lang: 'ar', durationMs: ORAL_PRACTICE_RECORDING_MS });
      // Watchdog: some browsers can keep speech recognition open longer than
      // expected, so we always end the attempt deterministically.
      const watchdogPromise = new Promise((_resolve, reject) => {
        window.setTimeout(() => reject(new Error('Timeout')), ORAL_PRACTICE_RECORDING_MS + 6000);
      });
      const transcript = await Promise.race([recordingPromise, watchdogPromise]);
      const matched = isLetter ? isLetterSpeechMatch(item, transcript) : isArabicSpeechMatch(expectedSpeech, transcript);
      setStatus(transcript ? `Eshitilgan: ${transcript}` : 'Ovoz matnga aylantirilmadi');
      markResult(matched);
      setListening(false);
      return;
    } catch (error) {
      setListening(false);
      const code = error?.name || error?.code || '';
      const detail = error?.message || error?.error?.message || error?.error || '';
      const label = code && code !== 'Error' ? code : detail;
      const fallbackLabel = label || 'unknown';
      if (label === 'Timeout') {
        setStatus("Javob juda uzoq kutildi. Qayta urinib ko'ring.");
      } else if (label === 'NotAllowedError' || label === 'PermissionDeniedError') {
        setStatus('Mikrofonga ruxsat berilmagan. Brauzer sozlamalarida mic permission ni yoqing.');
      } else if (label === 'NotFoundError' || label === 'DevicesNotFoundError') {
        setStatus('Mikrofon topilmadi. Qurilmada mic borligini tekshiring.');
      } else if (label === 'NotReadableError' || label === 'TrackStartError') {
        setStatus('Mikrofon band yoki ishlamayapti. Boshqa ilovalar mic ishlatayotgan bo‘lishi mumkin.');
      } else if (isTelegramIOSWebApp()) {
        setStatus("Telegram mini app bu qurilmada mikrofonga kirishni cheklaydi. Safari'da ochib ko'ring.");
      } else {
        setStatus(`Mikrofon ruxsati olinmadi (${fallbackLabel}).`);
      }
    }
  }

  function next() {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    setLocked(false);
    setStatus('');
    if (index === step.items.length - 1) onDone();
    else {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      onQuestionChange?.(nextIndex);
    }
  }

  return (
    <section className="lesson-card oral-card">
      <div className="quiz-head">
        <span>{step.title}</span>
        <strong>{index + 1} / {step.items.length}</strong>
      </div>
      <div className="oral-prompt">
        <div className={isSentence ? 'oral-arabic sentence' : isLetter ? 'oral-arabic letter' : 'oral-arabic word'} dir="rtl">{item.arabic}</div>
        <ArabicPronunciationButton text={item.arabic} />
        <div className="oral-translation">{item.uzbek}</div>
      </div>
      {status && (
        <div className={`oral-status ${locked ? (status.includes("To'g'ri") ? 'good' : 'bad') : ''}`}>
          <span>{status}</span>
        </div>
      )}
      <div className="oral-actions">
        <button
          className="pronounce-btn oral-mic-btn"
          type="button"
          onClick={() => startListening({ force: locked && !status.includes("To'g'ri") })}
          disabled={listening || (locked && status.includes("To'g'ri"))}
          title="Mikrofon"
        >
          {canUseMic ? (listening ? <MicOff size={34} /> : <Mic size={34} />) : <MicOff size={34} />}
        </button>
        {!canUseMic && (
          <button className="secondary-btn" type="button" onClick={openCurrentPageInExternalBrowser}>
            Tashqi brauzerda ochish
          </button>
        )}
        {locked && status.includes("To'g'ri") ? (
          <button className="primary-btn compact" type="button" onClick={next}>
            {index === step.items.length - 1 ? 'Natijaga o‘tish' : 'Keyingi'}
          </button>
        ) : (
          <button className="secondary-btn" type="button" onClick={next}>
            O'tkazish
          </button>
        )}
      </div>
    </section>
  );
}

function StudyStep({ step, initialIndex = 0, onProgress, onDone }) {
  const safeInitialIndex = Math.min(step.items.length - 1, Math.max(0, initialIndex || 0));
  const [index, setIndex] = useState(safeInitialIndex);
  const item = step.items[index];
  const isWords = step.mode === 'words';
  const isLetters = step.mode === 'letters';

  function goToIndex(nextIndex) {
    const safeIndex = Math.min(step.items.length - 1, Math.max(0, nextIndex));
    setIndex(safeIndex);
    onProgress?.(safeIndex);
  }

  return (
    <section className="lesson-card study-card">
      <div className="step-kicker">{step.title}</div>
      <div className="study-arabic-wrap">
        <div className={isLetters ? 'study-arabic letter' : isWords ? 'study-arabic word' : 'study-arabic sentence'} dir="rtl">{item.arabic}</div>
        <ArabicPronunciationButton text={item.arabic} />
      </div>
      <div className="study-uzbek">{item.uzbek}</div>
      <div className="study-progress">{index + 1} / {step.items.length}</div>
      <div className="study-controls">
        <button className="secondary-btn" onClick={() => goToIndex(index - 1)} disabled={index === 0}><ChevronLeft size={18} /> Oldingi</button>
        {step.canSkipToTest && !isLetters && (
          <button className="secondary-btn test-start-btn" onClick={onDone}>Testni boshlash</button>
        )}
        {index < step.items.length - 1 ? (
          <button className="primary-btn compact" onClick={() => goToIndex(index + 1)}>Keyingi <ChevronRight size={18} /></button>
        ) : (
          <button className="primary-btn compact" onClick={onDone}>Mashqlarga kirishish</button>
        )}
      </div>
    </section>
  );
}

function QuizStep({ step, initialIndex = 0, onDone, onPoint, onQuestionChange }) {
  const safeInitialIndex = Math.min(step.questions.length - 1, Math.max(0, initialIndex || 0));
  const [index, setIndex] = useState(safeInitialIndex);
  const [selected, setSelected] = useState(null);
  const [pickedTokens, setPickedTokens] = useState([]);
  const [locked, setLocked] = useState(false);
  const question = step.questions[index];
  const isArrange = question.kind === 'arrange';
  const answerText = isArrange ? pickedTokens.join(' ') : selected;
  const correct = answerText === question.answer;
  const promptIsArabic = hasArabicText(question.prompt);
  const answerIsArabic = hasArabicText(question.answer);

  function markAnswer(value) {
    if (!value || locked) return;
    const isCorrect = value === question.answer;
    setLocked(true);
    playAnswerSound(isCorrect);
    if (isCorrect) onPoint();
  }

  useEffect(() => {
    if (!isArrange || locked) return;
    const expectedTokenCount = tokenize(question.answer).length;
    if (pickedTokens.length === expectedTokenCount) markAnswer(pickedTokens.join(' '));
  }, [pickedTokens, isArrange, locked, question.answer]);

  function next() {
    setLocked(false);
    setSelected(null);
    setPickedTokens([]);
    if (index === step.questions.length - 1) onDone();
    else {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      onQuestionChange?.(nextIndex);
    }
  }

  function pickToken(token, tokenIndex) {
    if (locked) return;
    setPickedTokens((current) => [...current, token]);
    question.tokens[tokenIndex] = null;
  }

  function chooseOption(option) {
    if (locked) return;
    setSelected(option);
    markAnswer(option);
  }

  function undoToken(tokenIndex) {
    if (locked) return;
    const token = pickedTokens[tokenIndex];
    setPickedTokens((current) => current.filter((_, indexValue) => indexValue !== tokenIndex));
    const emptyIndex = question.tokens.findIndex((item) => item === null);
    if (emptyIndex >= 0) question.tokens[emptyIndex] = token;
  }

  return (
    <section className="lesson-card quiz-card">
      <div className="quiz-head">
        <span>{step.title}</span>
        <strong>{index + 1} / {step.questions.length}</strong>
      </div>
      <div className={`quiz-prompt-row ${promptIsArabic ? 'with-pronunciation' : ''}`}>
        <div className={promptIsArabic ? 'quiz-prompt arabic' : 'quiz-prompt'} dir={promptIsArabic ? 'rtl' : 'ltr'}>
          {question.prompt}
        </div>
        {promptIsArabic && <ArabicPronunciationButton text={question.prompt} compact />}
      </div>

      {isArrange ? (
        <>
          <div className={`answer-line ${question.targetLang === 'arabic' ? 'rtl-line' : ''}`} dir={question.targetLang === 'arabic' ? 'rtl' : 'ltr'}>
            {pickedTokens.length === 0 && <span>Jumlani shu yerda yig'ing</span>}
            {pickedTokens.map((token, tokenIndex) => (
              <button key={`${token}-${tokenIndex}`} onClick={() => undoToken(tokenIndex)}>{token}</button>
            ))}
          </div>
          <div className="token-bank">
            {question.tokens.map((token, tokenIndex) => token && (
              <button key={`${token}-${tokenIndex}`} onClick={() => pickToken(token, tokenIndex)} dir={question.targetLang === 'arabic' ? 'rtl' : 'ltr'}>{token}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="options-grid">
          {question.options.map((option) => (
            <button
              key={option}
              className={[
                selected === option ? 'selected' : '',
                locked && option === question.answer ? 'correct' : '',
                locked && selected === option && option !== question.answer ? 'wrong' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => chooseOption(option)}
              dir={option.match(/[\u0600-\u06FF]/) ? 'rtl' : 'ltr'}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {locked && (
        <div className={`feedback ${correct ? 'good' : 'bad'}`}>
          {correct ? <Check size={20} /> : <X size={20} />}
          <span>{correct ? "To'g'ri!" : `To'g'ri javob: ${question.answer}`}</span>
          {answerIsArabic && <ArabicPronunciationButton text={question.answer} compact />}
        </div>
      )}
      <div className="quiz-actions">
        {locked && (
          <button className="primary-btn compact" onClick={next}>{index === step.questions.length - 1 ? 'Natijaga o‘tish' : 'Davom etish'}</button>
        )}
      </div>
    </section>
  );
}

function LessonRunner({ lesson, sectionId, user, savedProgress, onBack, onProgressChange, onComplete }) {
  const flow = useMemo(() => makeSectionFlow(lesson, sectionId), [lesson, sectionId]);
  const totalQuestions = flow.reduce((sum, step) => {
    if (step.type === 'quiz') return sum + step.questions.length;
    if (step.type === 'oral') return sum + step.items.length;
    return sum;
  }, 0);
  const safeInitialStep = Math.min(flow.length - 1, Math.max(0, savedProgress?.stepIndex || 0));
  const [stepIndex, setStepIndex] = useState(safeInitialStep);
  const [score, setScore] = useState(savedProgress?.score || 0);
  const scoreRef = useRef(savedProgress?.score || 0);
  const step = flow[stepIndex];

  function saveProgress(patch = {}) {
    onProgressChange({
      score: scoreRef.current,
      stepIndex,
      studyIndexes: savedProgress?.studyIndexes || {},
      quizIndexes: savedProgress?.quizIndexes || {},
      oralIndexes: savedProgress?.oralIndexes || {},
      ...patch,
    });
  }

  useEffect(() => {
    saveProgress({ stepIndex: safeInitialStep });
  }, []);

  function nextStep() {
    if (stepIndex === flow.length - 1) {
      onComplete({ score: scoreRef.current, total: totalQuestions, percent: Math.round((scoreRef.current / totalQuestions) * 100) });
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    saveProgress({ stepIndex: nextIndex });
  }

  function addPoint() {
    scoreRef.current += 1;
    setScore(scoreRef.current);
  }

  function saveStudyIndex(nextStudyIndex) {
    saveProgress({
      studyIndexes: {
        ...(savedProgress?.studyIndexes || {}),
        [stepIndex]: nextStudyIndex,
      },
    });
  }

  function saveQuizIndex(nextQuizIndex) {
    saveProgress({
      quizIndexes: {
        ...(savedProgress?.quizIndexes || {}),
        [stepIndex]: nextQuizIndex,
      },
    });
  }

  function saveOralIndex(nextOralIndex) {
    saveProgress({
      oralIndexes: {
        ...(savedProgress?.oralIndexes || {}),
        [stepIndex]: nextOralIndex,
      },
    });
  }

  return (
    <main className="lesson-shell">
      <header className="lesson-topbar">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={18} /></button>
        <div>
          <strong>{lessonTitle(lesson)}</strong>
          <span>{sectionTitle(sectionId)}: {user.firstName}, ball: {score}</span>
        </div>
        <div className="account-type-pill">{getAccountTypeLabel(user.accountType || 'student')}</div>
        <div className="step-pill">{stepIndex + 1}/{flow.length}</div>
      </header>
      <div className="lesson-progress"><span style={{ width: `${((stepIndex + 1) / flow.length) * 100}%` }} /></div>
      {step.type === 'section' ? (
        <SectionStep key={stepIndex} step={step} onDone={nextStep} />
      ) : step.type === 'study' ? (
        <StudyStep key={stepIndex} step={step} initialIndex={savedProgress?.studyIndexes?.[stepIndex] || 0} onProgress={saveStudyIndex} onDone={nextStep} />
      ) : step.type === 'oral' ? (
        <OralPracticeStep key={stepIndex} step={step} initialIndex={savedProgress?.oralIndexes?.[stepIndex] || 0} onDone={nextStep} onPoint={addPoint} onQuestionChange={saveOralIndex} />
      ) : (
        <QuizStep key={stepIndex} step={step} initialIndex={savedProgress?.quizIndexes?.[stepIndex] || 0} onDone={nextStep} onPoint={addPoint} onQuestionChange={saveQuizIndex} />
      )}
    </main>
  );
}

function ResultScreen({ result, lesson, sectionId, user, onHome }) {
  const passed = result.percent >= PASS_RATE;
  return (
    <main className="result-shell">
      <section className="result-card">
        <Trophy size={54} />
        <h1>{passed ? "Bo'lim yakunlandi!" : 'Yana bir marta urinib ko‘ring'}</h1>
        <p>{lessonTitle(lesson)}, {sectionTitle(sectionId)} natijasi: {result.score} / {result.total}</p>
        <div className="account-type-pill">{getAccountTypeLabel(user.accountType || 'student')}</div>
        <div className="result-percent">{result.percent}%</div>
        <StarRating percent={result.percent} />
        <p>{passed ? "Bo'lim natijasi saqlandi." : `${PASS_RATE}% dan kam natija bo'limni kuchaytirish kerakligini bildiradi.`}</p>
        <button className="primary-btn" onClick={onHome}>Bosqich bo'limlariga qaytish</button>
      </section>
    </main>
  );
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [activeLevel, setActiveLevel] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [telegramUser, setTelegramUser] = useState(() => getTelegramUser());
  const telegramProfileIdRef = useRef(null);
  const sentenceMap = useMemo(() => parseSentences(sentencesMarkdown), []);
  const lessons = useMemo(() => {
    const baseLessons = wordsSource.lessons.slice(0, BASE_LESSONS).map((lesson) => ({
      ...lesson,
      seed: lesson.level,
      mapOrder: lesson.level,
      sentences: sentenceMap[lesson.lesson] || [],
    }));
    return [
      ...baseLessons.filter((lesson) => lesson.level <= MID_REVIEW_AFTER_LEVEL),
      makeReviewLesson(baseLessons, REVIEW_LEVELS[0]),
    ];
  }, [sentenceMap]);
  const user = state.users.find((item) => item.username === state.currentUsername);
  const displayLeaderboard = useMemo(() => {
    const localPlayers = localLeaderboard(state.users);
    const adminOnly = (players) => players.filter((player) => isAdminUsername(player.username));
  const normalizedRemote = adminOnly(leaderboard);
    if (!leaderboard.length) return localPlayers;

    const seen = new Set(normalizedRemote.flatMap((player) => [player.id, player.username].filter(Boolean)));
  return [
      ...normalizedRemote,
      ...localPlayers.filter((player) => !seen.has(player.id) && !seen.has(player.username)),
    ].sort((a, b) => (b.total_score || 0) - (a.total_score || 0) || (b.average_percent || 0) - (a.average_percent || 0));
  }, [leaderboard, state.users]);
  const activeLesson = lessons.find((lesson) => lesson.level === activeLevel);
  const pendingExercise = user ? findLatestExerciseProgress(user, lessons) : null;
  const reportContext = {
    screen: !user
      ? 'auth'
      : showAccount
        ? 'account'
        : lastResult
          ? 'result'
          : activeLesson && activeSection
            ? 'lesson_runner'
            : activeLesson
              ? 'level_sections'
              : 'level_map',
    activeLevel,
    activeSection,
  };

  useEffect(() => {
    initTelegramWebApp();
    setTelegramUser(getTelegramUser());
  }, []);

  useEffect(() => {
    telegramProfileIdRef.current = user?.id || null;
  }, [user?.id]);

  useEffect(() => {
    if (!telegramUser?.id) return undefined;

    const sessionId = makeSessionId();
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();

    function durationSeconds() {
      return Math.max(0, Math.round((Date.now() - startedAtMs) / 1000));
    }

    function record(eventType) {
      recordTelegramWebAppSession({
        sessionId,
        telegramUser,
        profileId: telegramProfileIdRef.current,
        startedAt,
        durationSeconds: durationSeconds(),
        eventType,
      }).catch((error) => console.error(error));
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') record('end');
      else record('heartbeat');
    }

    function handlePageHide() {
      record('end');
    }

    record('start');
    const heartbeat = window.setInterval(() => record('heartbeat'), TELEGRAM_SESSION_HEARTBEAT_MS);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeat);
      record('end');
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [telegramUser?.id]);

  useEffect(() => {
    return undefined;

    const sessionId = makeSessionId();
    const anonymousId = getSiteClientId();
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    const source = telegramUser?.id ? 'telegram_web_app' : 'website';
    const telegramUserId = telegramUser?.id || null;

    function durationSeconds() {
      return Math.max(0, Math.round((Date.now() - startedAtMs) / 1000));
    }

    function record(eventType) {
      recordSiteAppSession({
        sessionId,
        anonymousId,
        profileId: telegramProfileIdRef.current,
        source,
        telegramUserId,
        startedAt,
        durationSeconds: durationSeconds(),
        eventType,
      }).catch((error) => console.error(error));
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') record('end');
      else record('heartbeat');
    }

    function handlePageHide() {
      record('end');
    }

    record('start');
    const heartbeat = window.setInterval(() => record('heartbeat'), SITE_SESSION_HEARTBEAT_MS);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeat);
      record('end');
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [telegramUser?.id]);

  useEffect(() => {
    window.addEventListener('pointerdown', unlockAnswerSound, { passive: true });
    window.addEventListener('touchstart', unlockAnswerSound, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAnswerSound);
      window.removeEventListener('touchstart', unlockAnswerSound);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    getLeaderboard().then(setLeaderboard).catch((error) => console.error(error));
  }, [user?.username, user?.progress]);

  useEffect(() => {
    let active = true;
    getUsers()
      .then((remoteUsers) => {
        if (!active || !remoteUsers.length) return;
        setState((current) => {
          const mergedUsers = mergeRemoteProfiles(current.users, remoteUsers);
          if (mergedUsers.length === current.users.length && mergedUsers.every((item, index) => item === current.users[index])) {
            return current;
          }
          return { ...current, users: mergedUsers };
        });
      })
      .catch((error) => console.error(error));
    return () => {
      active = false;
    };
  }, []);

  async function refreshUsersFromDb() {
    const remoteUsers = await getUsers();
    if (!remoteUsers.length) return;
    setState((current) => ({
      ...current,
      users: mergeRemoteProfiles(current.users, remoteUsers),
    }));
  }

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    getProfileProgress(user.id)
      .then((progress) => {
        if (active) updateUser({
          ...user,
          progress,
          exerciseProgress: progress.exerciseProgress || {},
        });
      })
      .catch((error) => console.error(error));
    return () => {
      active = false;
    };
  }, [user?.id]);

  function sync(nextState) {
    saveState(nextState);
    setState(nextState);
  }

  function updateUser(updatedUser) {
    const next = {
      ...state,
      users: state.users.map((item) => (item.username === updatedUser.username ? updatedUser : item)),
    };
    sync(next);
  }

  function saveExerciseProgress(lesson, sectionId, progress) {
    if (!user) return;
    const key = exerciseProgressKey(lesson, sectionId);
    const nextExerciseProgress = {
      ...(user.exerciseProgress || {}),
      [key]: {
        ...(user.exerciseProgress?.[key] || {}),
        lessonLevel: lesson.level,
        scoreKey: scoreKeyForLesson(lesson),
        sectionId,
        ...progress,
        updatedAt: new Date().toISOString(),
      },
    };
    const nextUser = {
      ...user,
      exerciseProgress: nextExerciseProgress,
      progress: {
        ...(user.progress || {}),
        exerciseProgress: nextExerciseProgress,
      },
    };
    updateUser(nextUser);
    if (user.id) {
      saveSectionResult({
        profileId: user.id,
        progress: nextUser.progress,
      }).catch((error) => console.error(error));
    }
  }

  function clearExerciseProgress(lesson, sectionId) {
    if (!user) return;
    updateUser({
      ...user,
      exerciseProgress: withoutSavedExerciseProgress(user, lesson, sectionId),
    });
  }

  function startSection(sectionId, options = {}) {
    if (options.restart) clearExerciseProgress(activeLesson, sectionId);
    setLastResult(null);
    setActiveSection(sectionId);
  }

  function resumeExercise(progress) {
    setLastResult(null);
    setShowAccount(false);
    setActiveLevel(progress.lesson.level);
    setActiveSection(progress.sectionId);
  }

  function restartExercise(progress) {
    clearExerciseProgress(progress.lesson, progress.sectionId);
    setLastResult(null);
    setShowAccount(false);
    setActiveLevel(progress.lesson.level);
    setActiveSection(progress.sectionId);
  }

  function saveAuthedUser(authedUser) {
    const normalizedUser = authedUser.username === ADMIN_USERNAME || authedUser.isAdmin
      ? {
          ...authedUser,
          accountType: 'admin',
          isAdmin: true,
          progress: {
            ...(authedUser.progress || {}),
            unlockedLevel: ACTIVE_LESSONS,
          },
        }
      : authedUser;
    const enrichedUser = {
      ...normalizedUser,
      exerciseProgress: normalizedUser.exerciseProgress || normalizedUser.progress?.exerciseProgress || {},
      plan: normalizedUser.plan || defaultPlanForAccountType(getProfileAccountType(normalizedUser)),
    };
    const stateNow = loadState();
    const identityKey = getUserIdentityKey(enrichedUser);
    const users = stateNow.users.some((item) => getUserIdentityKey(item) === identityKey)
      ? stateNow.users.map((item) => (getUserIdentityKey(item) === identityKey ? { ...item, ...enrichedUser } : item))
      : [...stateNow.users, enrichedUser];
    sync({ ...stateNow, users, currentUsername: enrichedUser.username });
  }

  async function handleAuth(payload) {
    const authedUser = await loginProfile(payload);
    saveAuthedUser(authedUser);
  }

  async function handleCreateAccount(payload) {
    if (!user) throw new Error('Avval tizimga kiring.');

    const requesterType = payload.requesterAccountType || getRequesterAccountType(user);
    if (requesterType === 'teacher' && payload.accountType !== 'student') {
      throw new Error('Bu hisob turini ochish mumkin emas.');
    }

    if (requesterType === 'admin') {
      const created = await createProfileByAdmin({
        ...payload,
        requesterToken: user.sessionToken,
      });
      const stateNow = loadState();
      const enrichedCreated = {
        ...created,
        plan: created.plan || defaultPlanForAccountType(getProfileAccountType(created)),
      };
      const users = stateNow.users.some((candidate) => getUserIdentityKey(candidate) === getUserIdentityKey(enrichedCreated))
        ? stateNow.users.map((candidate) => (getUserIdentityKey(candidate) === getUserIdentityKey(enrichedCreated) ? { ...candidate, ...enrichedCreated } : candidate))
        : [...stateNow.users, enrichedCreated];
      sync({ ...stateNow, users, currentUsername: user.username });
      await refreshUsersFromDb();
      return enrichedCreated;
    }

    const created = await createProfile({
      ...payload,
      requesterProfileId: user.id,
    });
    const stateNow = loadState();
    const enrichedCreated = {
      ...created,
      plan: created.plan || defaultPlanForAccountType(getProfileAccountType(created)),
    };
    const users = stateNow.users.some((candidate) => getUserIdentityKey(candidate) === getUserIdentityKey(enrichedCreated))
      ? stateNow.users.map((candidate) => (getUserIdentityKey(candidate) === getUserIdentityKey(enrichedCreated) ? { ...candidate, ...enrichedCreated } : candidate))
      : [...stateNow.users, enrichedCreated];
    sync({ ...stateNow, users, currentUsername: user.username });
    await refreshUsersFromDb();
    return enrichedCreated;
  }

  function handleUpdateProfilePlan(profileId, nextPlan) {
    const target = state.users.find((candidate) => candidate.id === profileId);
    if (!target) return;
    const accountType = getProfileAccountType(target);
    if (!['center', 'indiv'].includes(accountType)) return;
    updateUser({
      ...target,
      plan: nextPlan,
    });
  }

  async function handleAvatarUpload(file) {
    if (user.id) {
      const remoteUser = await uploadProfileAvatar({ userId: user.id, file });
      updateUser({ ...user, ...remoteUser });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => updateUser({ ...user, avatar: reader.result });
    reader.readAsDataURL(file);
  }

  async function handleUpdateProfilePlan(profileId, nextPlan) {
    const target = state.users.find((candidate) => candidate.id === profileId);
    if (!target) return;
    const accountType = getProfileAccountType(target);
    if (!['center', 'indiv'].includes(accountType)) return;
    const updated = await updateProfilePlan({
      requesterToken: user.sessionToken,
      profileId,
      plan: nextPlan,
      accountType,
    });
    updateUser({
      ...target,
      ...updated,
    });
    await refreshUsersFromDb();
  }

  async function completeLesson(result) {
    const bestScores = user.progress.bestScores || {};
    const activeScoreKey = scoreKeyForLesson(activeLesson);
    const currentLevelScore = bestScores[activeScoreKey] || {};
    const currentSections = currentLevelScore.sections || {};
    const previousSectionBest = currentSections[activeSection]?.percent || 0;
    const nextSections = {
      ...currentSections,
      [activeSection]: result.percent > previousSectionBest ? result : currentSections[activeSection],
    };
    const requiredSectionIds = getLessonSectionIds(activeLesson);
    const hasRequiredSections = requiredSectionIds.every((sectionId) => nextSections[sectionId]);
    const levelPercent = hasRequiredSections
      ? Math.round(requiredSectionIds.reduce((sum, sectionId) => sum + nextSections[sectionId].percent, 0) / requiredSectionIds.length)
      : null;
    const passedLevel = hasRequiredSections && levelPercent >= PASS_RATE;
    const updatedUser = {
      ...user,
      exerciseProgress: withoutSavedExerciseProgress(user, activeLesson, activeSection),
      progress: {
        unlockedLevel: isAdminUser(user)
          ? ACTIVE_LESSONS
          : passedLevel && !activeLesson.excludeFromRating
          ? Math.max(user.progress.unlockedLevel || 1, Math.min(ACTIVE_LESSONS, activeLesson.level + 1))
          : user.progress.unlockedLevel || 1,
        bestScores: {
          ...bestScores,
          [activeScoreKey]: {
            ...currentLevelScore,
            sections: nextSections,
            percent: levelPercent ?? currentLevelScore.percent ?? result.percent,
          },
        },
      },
    };
    updateUser(updatedUser);
    if (user.id && !activeLesson.excludeFromRating) {
      const remoteProgress = await saveSectionResult({
        profileId: user.id,
        progress: {
          ...updatedUser.progress,
          exerciseProgress: updatedUser.exerciseProgress || {},
        },
      });
      updateUser({ ...updatedUser, progress: remoteProgress });
    }
    setLastResult(result);
  }

  let screen;
  if (!user) {
    screen = <AuthScreen onAuth={handleAuth} telegramUser={telegramUser} />;
  } else if (showAccount) {
    screen = <AccountScreen user={user} users={state.users} leaderboard={displayLeaderboard} onBack={() => setShowAccount(false)} onAvatarUpload={handleAvatarUpload} onLogout={() => sync({ ...state, currentUsername: null })} onCreateAccount={handleCreateAccount} onUpdateProfilePlan={handleUpdateProfilePlan} />;
  } else if (lastResult && activeLesson && activeSection) {
    screen = <ResultScreen result={lastResult} lesson={activeLesson} sectionId={activeSection} user={user} onHome={() => { setLastResult(null); setActiveSection(null); }} />;
  } else if (activeLesson && activeSection) {
    screen = (
      <LessonRunner
        lesson={activeLesson}
        sectionId={activeSection}
        user={user}
        savedProgress={getSavedExerciseProgress(user, activeLesson, activeSection)}
        onBack={() => setActiveSection(null)}
        onProgressChange={(progress) => saveExerciseProgress(activeLesson, activeSection, progress)}
        onComplete={completeLesson}
      />
    );
  } else if (activeLesson) {
    screen = <LevelSections user={user} lesson={activeLesson} onBack={() => setActiveLevel(null)} onStartSection={startSection} />;
  } else {
    screen = (
    <LevelMap
      user={user}
      lessons={lessons}
      pendingExercise={pendingExercise}
      onStart={(level) => { setActiveLevel(level); setActiveSection(null); }}
      onResumeExercise={resumeExercise}
      onRestartExercise={restartExercise}
      onOpenProfile={() => setShowAccount(true)}
    />
    );
  }

  return (
    <>
      {screen}
      <AnnouncementPopup />
      <ErrorReportButton user={user} context={reportContext} />
    </>
  );
}
