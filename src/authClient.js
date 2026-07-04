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
  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    accountType: user.account_type || 'student',
    plan: user.plan || defaultPlanForAccountType(user.account_type || 'student'),
    parentProfileId: user.parent_profile_id || null,
    avatar: user.avatar_url || '',
    progress: { unlockedLevel: 1, bestScores: {} },
    isAdmin: Boolean(user.is_admin),
    sessionToken: user.session_token,
  };
}

export async function createProfileByAdmin(payload) {
  const { user } = await apiRequest('/api/create-profile', payload);
  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    accountType: user.account_type || 'student',
    plan: user.plan || defaultPlanForAccountType(user.account_type || 'student'),
    parentProfileId: user.parent_profile_id || null,
    avatar: user.avatar_url || '',
    progress: { unlockedLevel: 1, bestScores: {} },
    isAdmin: Boolean(user.is_admin),
  };
}

export async function createProfile(payload) {
  const { user } = await apiRequest('/api/create-profile', payload);
  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    accountType: user.account_type || 'student',
    plan: user.plan || defaultPlanForAccountType(user.account_type || 'student'),
    parentProfileId: user.parent_profile_id || null,
    avatar: user.avatar_url || '',
    progress: { unlockedLevel: 1, bestScores: {} },
    isAdmin: Boolean(user.is_admin),
  };
}

export async function getLeaderboard() {
  const { users } = await fetch(apiUrl('/api/users')).then((res) => res.json());
  return users || [];
}

export async function getUsers() {
  const { users } = await fetch(apiUrl('/api/users')).then((res) => res.json());
  return users || [];
}

export async function getProfileProgress() { return { unlockedLevel: 1, bestScores: {} }; }
export async function saveSectionResult() { return { unlockedLevel: 1, bestScores: {} }; }
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
  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    accountType: user.account_type || 'student',
    plan: user.plan || '',
    parentProfileId: user.parent_profile_id || null,
    avatar: user.avatar_url || '',
    progress: { unlockedLevel: 1, bestScores: {} },
    isAdmin: Boolean(user.is_admin),
  };
}
export async function submitErrorReport() {}
export async function recordTelegramWebAppSession() {}
export async function recordSiteAppSession() {}
