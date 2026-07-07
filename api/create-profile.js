import { query } from './_db.js';

const LIMIT_MESSAGE = "SIZ TARIFINGIZDAGI BARCHA LIMITLARDAN FOYDALANIB BO'LDINGIZ. ILTIMOS, YANGI HISOBLAR OCHISH UCHUN KATTAROQ LIMITDAGI TARIFGA O'TING!";

function planForAccountType(accountType) {
  if (accountType === 'center') return 'center';
  if (accountType === 'indiv') return 'indiv';
  return '';
}

async function enforceCenterLimits(centerId, requestedType) {
  const profilePlanResult = await query(
    `select coalesce(plan, '') as plan
     from public.profiles
     where id = $1`,
    [centerId],
  );
  const centerPlan = profilePlanResult.rows[0]?.plan || 'center';
  const isPlus = centerPlan === 'center_plus';
  const teacherLimit = isPlus ? 20 : 10;
  const studentLimit = isPlus ? 200 : 100;

  if (requestedType === 'teacher') {
    const teacherCountResult = await query(
      `select count(*)::int as count
       from public.profiles
       where account_type = 'teacher' and parent_profile_id = $1`,
      [centerId],
    );
    if ((teacherCountResult.rows[0]?.count || 0) >= teacherLimit) {
      return false;
    }
  }

  if (requestedType === 'student') {
    const studentCountResult = await query(
      `with center_children as (
         select id
         from public.profiles
         where parent_profile_id = $1 and account_type in ('teacher', 'indiv', 'center')
       )
       select count(*)::int as count
       from public.profiles p
       where p.account_type = 'student'
         and (
           p.parent_profile_id = $1
           or p.parent_profile_id in (select id from center_children)
         )`,
      [centerId],
    );
    if ((studentCountResult.rows[0]?.count || 0) >= studentLimit) {
      return false;
    }
  }

  return true;
}

async function resolveTeacherCenterId(teacherId) {
  const result = await query(
    `select parent_profile_id
     from public.profiles
     where id = $1 and account_type = 'teacher'`,
    [teacherId],
  );
  return result.rows[0]?.parent_profile_id || null;
}

async function enforceIndivLimits(indivId, requestedType) {
  const profilePlanResult = await query(
    `select coalesce(plan, '') as plan
     from public.profiles
     where id = $1`,
    [indivId],
  );
  const indivPlan = profilePlanResult.rows[0]?.plan || 'indiv';
  const studentLimit = indivPlan === 'indiv_plus' ? 40 : 20;

  if (requestedType === 'student') {
    const studentCountResult = await query(
      `select count(*)::int as count
       from public.profiles
       where account_type = 'student' and parent_profile_id = $1`,
      [indivId],
    );
    if ((studentCountResult.rows[0]?.count || 0) >= studentLimit) {
      return false;
    }
  }

  return true;
}

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
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const password = String(body.password || '');
  const accountType = String(body.accountType || 'student').trim().toLowerCase();
  const parentProfileId = body.parentProfileId || null;
  const requesterAccountType = String(body.requesterAccountType || '').trim().toLowerCase();
  const requesterProfileId = body.requesterProfileId || null;

  if (!['center', 'teacher', 'student', 'indiv'].includes(accountType)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Noto‘g‘ri hisob turi.' }));
  }
  if (accountType === 'center' && parentProfileId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Markaz uchun ota profil tanlanmaydi.' }));
  }
  if (accountType === 'teacher' && !parentProfileId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'O‘qituvchi uchun markaz tanlang.' }));
  }
  if (accountType === 'indiv' && parentProfileId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Individual o‘qituvchi uchun ota profil tanlanmaydi.' }));
  }
  if (accountType === 'student' && !parentProfileId) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'O‘quvchi uchun ota profil tanlang.' }));
  }

  if (requesterAccountType === 'center') {
    if (!requesterProfileId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Markaz profili topilmadi.' }));
    }
    if (accountType !== 'teacher' && accountType !== 'student') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Markaz faqat o‘qituvchi yoki o‘quvchi ochadi.' }));
    }
    const allowed = await enforceCenterLimits(requesterProfileId, accountType);
    if (!allowed) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: LIMIT_MESSAGE }));
    }
  }

  if (requesterAccountType === 'teacher' && accountType !== 'student') {
    res.statusCode = 403;
    return res.end(JSON.stringify({ error: 'O‘qituvchi faqat o‘quvchi ochadi.' }));
  }

  if (requesterAccountType === 'teacher' && accountType === 'student') {
    const centerId = await resolveTeacherCenterId(requesterProfileId);
    if (!centerId) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'O‘qituvchi markazga bog‘lanmagan.' }));
    }
    const allowed = await enforceCenterLimits(centerId, 'student');
    if (!allowed) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: LIMIT_MESSAGE }));
    }
  }

  if (requesterAccountType === 'indiv') {
    if (accountType !== 'student') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: 'Individual o‘qituvchi faqat o‘quvchi ochadi.' }));
    }
    const allowed = await enforceIndivLimits(requesterProfileId, accountType);
    if (!allowed) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ error: LIMIT_MESSAGE }));
    }
  }

  const existing = await query(`select 1 from public.profiles where lower(username) = $1`, [username]);
  if (existing.rows[0]) {
    res.statusCode = 409;
    return res.end(JSON.stringify({ error: 'Bu username band.' }));
  }
  if (accountType === 'teacher') {
    const parent = await query(`select account_type from public.profiles where id = $1`, [parentProfileId]);
    if (parent.rows[0]?.account_type !== 'center') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Ota profil mos emas.' }));
    }
  }
  if (accountType === 'student') {
    const parent = await query(`select account_type, parent_profile_id from public.profiles where id = $1`, [parentProfileId]);
    const parentRow = parent.rows[0];
    const validParentTypes = ['center', 'teacher', 'indiv'];
    if (!parentRow || !validParentTypes.includes(parentRow.account_type)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Ota profil mos emas.' }));
    }
  }
  const created = await query(
    `insert into public.profiles (username, first_name, last_name, password_hash, account_type, parent_profile_id)
     values ($1, $2, $3, $4, $5, $6)
     returning id, username, first_name, last_name, avatar_url, account_type, parent_profile_id, is_admin, plan, archived_at`,
    [username, firstName, lastName, password, accountType, parentProfileId],
  );
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ user: created.rows[0] }));
}
