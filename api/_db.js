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
      await pool.query(`alter table if exists public.profiles add column if not exists archived_at timestamptz`);
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
      await pool.query(`
        create table if not exists public.error_reports (
          id uuid primary key default gen_random_uuid(),
          profile_id uuid references public.profiles(id) on delete set null,
          username text,
          screenshot_name text,
          screenshot_data_url text,
          message text not null default '',
          page_url text,
          viewport text,
          context jsonb not null default '{}'::jsonb,
          status text not null default 'new',
          severity text not null default 'unknown',
          auto_notes text not null default '',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `);
      await pool.query(`
        create index if not exists error_reports_status_created_at_idx
        on public.error_reports (status, created_at desc)
      `);
      await pool.query(`
        create or replace function public.triage_error_report()
        returns trigger
        language plpgsql
        as $$
        declare
          payload text;
          needs_fix boolean := false;
          suspicious boolean := false;
        begin
          payload := lower(coalesce(new.message, '') || ' ' || coalesce(new.page_url, '') || ' ' || coalesce(new.viewport, '') || ' ' || coalesce(new.context::text, ''));

          if position('error' in payload) > 0
             or position('bug' in payload) > 0
             or position('xato' in payload) > 0
             or position('crash' in payload) > 0
             or position('failed' in payload) > 0
             or position('not allowed' in payload) > 0
             or position('undefined' in payload) > 0
             or position('exception' in payload) > 0 then
            needs_fix := true;
          end if;

          if coalesce(new.screenshot_data_url, '') <> '' then
            suspicious := true;
          end if;

          new.severity := case
            when needs_fix and suspicious then 'high'
            when needs_fix then 'medium'
            when suspicious then 'low'
            else 'unknown'
          end;

          new.status := case
            when needs_fix and suspicious then 'needs_fix'
            when needs_fix then 'needs_review'
            when suspicious then 'needs_review'
            else 'new'
          end;

          new.auto_notes := case
            when new.status = 'needs_fix' then 'Avtomatik triage: muammo qayta tekshirish va tuzatish uchun belgilandi.'
            when new.status = 'needs_review' then 'Avtomatik triage: xabar ko‘rib chiqilishi kerak.'
            else 'Avtomatik triage: qo‘shimcha signal topilmadi.'
          end;

          new.updated_at := now();
          return new;
        end;
        $$;
      `);
      await pool.query(`
        drop trigger if exists triage_error_report_trigger on public.error_reports;
        create trigger triage_error_report_trigger
        before insert or update on public.error_reports
        for each row execute function public.triage_error_report()
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
