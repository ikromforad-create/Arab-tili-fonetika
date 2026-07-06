import { query } from './_db.js';

const DEFAULT_PROGRESS = {
  unlockedLevel: 1,
  bestScores: {},
  exerciseProgress: {},
};

function deriveUnlockedLevel(progress, fallback = 1) {
  const bestScores = progress?.bestScores && typeof progress.bestScores === 'object' ? progress.bestScores : {};
  const derived = Object.entries(bestScores).reduce((maxLevel, [key, score]) => {
    const level = Number(key);
    if (!Number.isInteger(level) || level < 1) return maxLevel;
    if ((score?.percent || 0) >= 76) return Math.max(maxLevel, level + 1);
    return maxLevel;
  }, fallback);
  return Math.max(fallback, derived);
}

function normalizeProgress(progress) {
  const unlockedLevel = Number(progress?.unlockedLevel || 1);
  const derivedUnlockedLevel = deriveUnlockedLevel(progress, Number.isFinite(unlockedLevel) && unlockedLevel >= 1 ? unlockedLevel : 1);
  return {
    unlockedLevel: derivedUnlockedLevel,
    bestScores: progress?.bestScores && typeof progress.bestScores === 'object' ? progress.bestScores : {},
    exerciseProgress: progress?.exerciseProgress && typeof progress.exerciseProgress === 'object' ? progress.exerciseProgress : {},
  };
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const profileId = String(req.query?.profileId || '').trim();
    if (!profileId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'profileId kerak.' }));
    }

    const result = await query(
      `select progress
       from public.profile_progress
       where profile_id = $1`,
      [profileId],
    );
    const progress = normalizeProgress(result.rows[0]?.progress || DEFAULT_PROGRESS);
    return res.end(JSON.stringify({ progress }));
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const profileId = String(body.profileId || '').trim();
    const progress = normalizeProgress(body.progress || DEFAULT_PROGRESS);

    if (!profileId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'profileId kerak.' }));
    }

    const result = await query(
      `insert into public.profile_progress (profile_id, progress, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (profile_id)
       do update set progress = excluded.progress, updated_at = now()
       returning progress`,
      [profileId, JSON.stringify(progress)],
    );

    return res.end(JSON.stringify({ progress: normalizeProgress(result.rows[0]?.progress || progress) }));
  }

  res.statusCode = 405;
  return res.end(JSON.stringify({ error: 'Method not allowed' }));
}
