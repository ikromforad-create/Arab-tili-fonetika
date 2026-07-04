create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  username text,
  comment text not null default '',
  screenshot_path text,
  screenshot_file_name text,
  screenshot_mime_type text,
  page_url text,
  user_agent text,
  app_context jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'fixed', 'closed')),
  developer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  fixed_at timestamptz,
  check (length(trim(comment)) > 0 or screenshot_path is not null)
);

create index if not exists error_reports_status_created_idx
  on public.error_reports (status, created_at desc);

create index if not exists error_reports_profile_created_idx
  on public.error_reports (profile_id, created_at desc);

alter table public.error_reports enable row level security;

drop policy if exists "App users can create error reports" on public.error_reports;

create policy "App users can create error reports"
  on public.error_reports for insert
  with check (
    status = 'new'
    and (length(trim(comment)) > 0 or screenshot_path is not null)
  );

grant usage on schema public to anon, authenticated;
grant insert on public.error_reports to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'error-report-screenshots',
  'error-report-screenshots',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "App users can upload error screenshots" on storage.objects;

create policy "App users can upload error screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'error-report-screenshots'
    and (
      lower((storage.foldername(name))[1]) = 'anonymous'
      or lower((storage.foldername(name))[1]) ~ '^[0-9a-f-]{36}$'
    )
  );
