insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "App users can upload avatar images" on storage.objects;
drop policy if exists "App users can update avatar images" on storage.objects;

create policy "App users can upload avatar images"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and lower((storage.foldername(name))[1]) ~ '^[0-9a-f-]{36}$'
  );

create policy "App users can update avatar images"
  on storage.objects for update
  using (bucket_id = 'avatars')
  with check (
    bucket_id = 'avatars'
    and lower((storage.foldername(name))[1]) ~ '^[0-9a-f-]{36}$'
  );
