import { query } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  const result = await query(
    `select id, username, first_name, last_name, avatar_url, account_type, parent_profile_id, is_admin, plan, created_at, updated_at
     from public.profiles
     order by created_at desc`,
  );
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ users: result.rows }));
}
