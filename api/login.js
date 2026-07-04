import { query } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  const body = await new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => resolve(JSON.parse(raw || '{}')));
  });
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const result = await query(
    `select id, username, first_name, last_name, avatar_url, account_type, parent_profile_id, is_admin, plan
     from public.profiles
     where lower(username) = $1 and (password_hash = $2 or password_hash = crypt($2, password_hash))`,
    [username, password],
  );
  const user = result.rows[0];
  if (!user) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: "Login yoki parol noto'g'ri." }));
  }
  const isAdmin = Boolean(user.is_admin || user.account_type === 'admin' || user.username === 'admin');
  const token = isAdmin ? 'admin' : crypto.randomUUID();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ user: { ...user, is_admin: isAdmin, session_token: token } }));
}
