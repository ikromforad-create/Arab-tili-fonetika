begin;
create extension if not exists pgcrypto;
drop table if exists public.auth_sessions cascade;
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
insert into public.profiles (username, first_name, last_name, is_admin, password_hash)
values ('admin', 'admin', 'admin', true, crypt('admin', gen_salt('bf')));
commit;
