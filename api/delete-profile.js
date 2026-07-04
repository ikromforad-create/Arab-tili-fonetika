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
    return res.end(JSON.stringify({ error: 'Faqat admin o‘chirishi mumkin.' }));
  }

  const username = String(body.username || '').trim().toLowerCase();
  await query(`delete from public.profiles where lower(username) = $1 and lower(username) <> 'admin'`, [username]);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
}
