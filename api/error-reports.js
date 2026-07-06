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

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    const body = await readBody(req);
    const profileId = cleanText(body.profileId);
    const username = cleanText(body.username);
    const screenshot = body.screenshot && typeof body.screenshot === 'object' ? body.screenshot : {};
    const message = cleanText(body.message);

    if (!message && !cleanText(screenshot?.dataUrl)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Screenshot yoki xabar kerak.' }));
    }

    const result = await query(
      `insert into public.error_reports (
         profile_id,
         username,
         screenshot_name,
         screenshot_data_url,
         message,
         page_url,
         viewport,
         context
       ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       returning id, status, severity, auto_notes, created_at`,
      [
        profileId || null,
        username || null,
        cleanText(screenshot?.name),
        cleanText(screenshot?.dataUrl),
        message || '',
        cleanText(body.pageUrl),
        cleanText(body.viewport),
        JSON.stringify({
          ...((body.context && typeof body.context === 'object') ? body.context : {}),
          userAgent: cleanText(body.userAgent),
        }),
      ],
    );

    return res.end(JSON.stringify({ report: result.rows[0] }));
  }

  if (req.method === 'GET') {
    const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 100);
    const result = await query(
      `select id, profile_id, username, screenshot_name, message, page_url, viewport, context, status, severity, auto_notes, created_at, updated_at
       from public.error_reports
       order by created_at desc
       limit $1`,
      [limit],
    );
    return res.end(JSON.stringify({ reports: result.rows }));
  }

  res.statusCode = 405;
  return res.end(JSON.stringify({ error: 'Method not allowed' }));
}
