begin;
create extension if not exists pgcrypto;
drop table if exists public.auth_sessions cascade;
drop table if exists public.profile_progress cascade;
drop table if exists public.profiles cascade;
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  account_type text not null default 'student',
  plan text not null default '',
  parent_profile_id uuid references public.profiles(id) on delete set null,
  is_admin boolean not null default false,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.auth_sessions (
  token text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table public.profile_progress (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  progress jsonb not null default '{"unlockedLevel":1,"bestScores":{},"exerciseProgress":{}}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.error_reports (
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
);
create index error_reports_status_created_at_idx on public.error_reports (status, created_at desc);
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
drop trigger if exists triage_error_report_trigger on public.error_reports;
create trigger triage_error_report_trigger
before insert or update on public.error_reports
for each row execute function public.triage_error_report();
insert into public.profiles (username, first_name, last_name, is_admin, password_hash)
values ('admin', 'admin', 'admin', true, crypt('admin', gen_salt('bf')));
commit;
