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

  if (String(body.requesterToken || '').trim() !== 'admin') {
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: 'Faqat admin tarifni o‘zgartirishi mumkin.' }));
  }

  const profileId = String(body.profileId || '').trim();
  const plan = String(body.plan || '').trim();
  const accountType = String(body.accountType || '').trim().toLowerCase();

  const allowedPlans = {
    center: ['center', 'center_plus'],
    indiv: ['indiv', 'indiv_plus'],
  };

  if (!profileId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Profil topilmadi.' }));
  }

  if (!allowedPlans[accountType]?.includes(plan)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Noto‘g‘ri tarif rejasi.' }));
  }

  const result = await query(
    `update public.profiles
     set plan = $1,
         updated_at = now()
     where id = $2
     returning id, username, first_name, last_name, avatar_url, account_type, parent_profile_id, is_admin, plan`,
    [plan, profileId],
  );

  const user = result.rows[0];
  if (!user) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Profil topilmadi.' }));
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ user }));
}
