import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not configured.');

const globalForPool = globalThis;
export const pool = globalForPool.__arabPool || new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
if (!globalForPool.__arabPool) globalForPool.__arabPool = pool;

let schemaReadyPromise = globalForPool.__arabSchemaReadyPromise || null;
if (!globalForPool.__arabSchemaReadyPromise) globalForPool.__arabSchemaReadyPromise = null;

async function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`alter table if exists public.profiles add column if not exists plan text not null default ''`);
      await pool.query(`
        create table if not exists public.profile_progress (
          profile_id uuid primary key references public.profiles(id) on delete cascade,
          progress jsonb not null default '{"unlockedLevel":1,"bestScores":{},"exerciseProgress":{}}'::jsonb,
          updated_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        update public.profiles
        set plan = case
          when account_type = 'center' then 'center'
          when account_type = 'indiv' then 'indiv'
          else coalesce(plan, '')
        end
        where plan = '' or plan is null
      `);
    })();
    globalForPool.__arabSchemaReadyPromise = schemaReadyPromise;
  }
  return schemaReadyPromise;
}

export async function query(text, params = []) {
  await ensureSchema();
  return pool.query(text, params);
}
