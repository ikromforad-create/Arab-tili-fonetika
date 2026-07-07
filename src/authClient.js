const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function defaultPlanForAccountType(accountType) {
  if (accountType === 'center') return 'center';
  if (accountType === 'indiv') return 'indiv';
  return '';
}

async function apiRequest(path, body) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'So‘rov bajarilmadi.');
  return payload;
}

export function makeSessionId() {
  return crypto.randomUUID();
}

function normalizeProfilePayload(user) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    accountType: user.account_type || 'student',
    plan: user.plan || defaultPlanForAccountType(user.account_type || 'student'),
    parentProfileId: user.parent_profile_id || null,
    avatar: user.avatar_url || '',
    archivedAt: user.archived_at || null,
    progress: { unlockedLevel: 1, bestScores: {}, exerciseProgress: {} },
    isAdmin: Boolean(user.is_admin),
    sessionToken: user.session_token,
  };
}

export function getSiteClientId() {
  const key = 'arab-tili-fonetika-site-client-id-v1';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(key, next);
  return next;
}

export async function loginProfile(payload) {
  const { user } = await apiRequest('/api/login', payload);
  return normalizeProfilePayload(user);
}

export async function createProfileByAdmin(payload) {
  const { user } = await apiRequest('/api/create-profile', payload);
  return normalizeProfilePayload(user);
}

export async function createProfile(payload) {
  const { user } = await apiRequest('/api/create-profile', payload);
  return normalizeProfilePayload(user);
}

export async function getLeaderboard() {
  const { users } = await fetch(apiUrl('/api/users')).then((res) => res.json());
  return users || [];
}

export async function getUsers() {
  const { users } = await fetch(apiUrl('/api/users')).then((res) => res.json());
  return users || [];
}

export async function getProfileProgress(profileId) {
  const response = await fetch(apiUrl(`/api/profile-progress?profileId=${encodeURIComponent(profileId)}`));
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Progress yuklanmadi.');
  return payload.progress || { unlockedLevel: 1, bestScores: {}, exerciseProgress: {} };
}

export async function saveSectionResult(payload) {
  const response = await fetch(apiUrl('/api/profile-progress'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Progress saqlanmadi.');
  return result.progress || { unlockedLevel: 1, bestScores: {}, exerciseProgress: {} };
}
export async function uploadProfileAvatar({ userId, file }) {
  const reader = new FileReader();
  const avatar = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Rasm o‘qilmadi.'));
    reader.readAsDataURL(file);
  });
  return { id: userId, avatar };
}

export async function updateProfilePlan(payload) {
  const { user } = await apiRequest('/api/update-profile-plan', payload);
  return normalizeProfilePayload(user);
}

export async function archiveProfile(payload) {
  const { users } = await apiRequest('/api/archive-profile', payload);
  return (users || []).map((user) => normalizeProfilePayload(user));
}

export async function deleteProfile(payload) {
  return apiRequest('/api/delete-profile', payload);
}
export async function submitErrorReport(payload) {
  const { report } = await apiRequest('/api/error-reports', payload);
  return report;
}
export async function recordTelegramWebAppSession() {}
export async function recordSiteAppSession() {}
