import { query } from './_db.js';

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
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const body = await readBody(req);
  if (String(body.requesterToken || '').trim() !== 'admin') {
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: 'Faqat admin arxivlashi mumkin.' }));
  }

  const profileId = String(body.profileId || '').trim();
  if (!profileId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Profil topilmadi.' }));
  }

  const result = await query(
    `with recursive subtree as (
       select id
       from public.profiles
       where id = $1 and lower(username) <> 'admin'
       union all
       select p.id
       from public.profiles p
       join subtree s on p.parent_profile_id = s.id
     )
     update public.profiles
     set archived_at = now(),
         updated_at = now()
     where id in (select id from subtree)
     returning id, username, first_name, last_name, avatar_url, account_type, parent_profile_id, is_admin, plan, archived_at`,
    [profileId],
  );

  if (!result.rows.length) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Profil topilmadi.' }));
  }

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ users: result.rows }));
}
