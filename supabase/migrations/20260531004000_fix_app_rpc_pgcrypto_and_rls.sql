drop policy if exists "Profiles can be inserted by app" on public.profiles;
drop policy if exists "Profiles can be updated by app" on public.profiles;
drop policy if exists "Section results can be inserted by app" on public.user_section_results;

create policy "Profiles can be inserted by app"
  on public.profiles for insert
  with check (true);

create policy "Profiles can be updated by app"
  on public.profiles for update
  using (true)
  with check (true);

create policy "Section results can be inserted by app"
  on public.user_section_results for insert
  with check (true);

create or replace function public.profile_app_payload(p_profile_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with section_groups as (
    select
      lesson_id,
      jsonb_object_agg(
        section_key,
        jsonb_build_object('score', score, 'total', total, 'percent', percent, 'stars', stars)
      ) as sections,
      count(*) as completed_sections,
      round(avg(percent))::integer as level_percent
    from public.best_section_results
    where profile_id = p_profile_id
    group by lesson_id
  ), progress_levels as (
    select coalesce(
      jsonb_object_agg(
        lesson_id::text,
        jsonb_build_object('sections', sections, 'percent', level_percent)
      ),
      '{}'::jsonb
    ) as best_scores
    from section_groups
  ), unlocks as (
    select coalesce(max(lesson_id) + 1, 1) as unlocked_level
    from section_groups
    where completed_sections = 2 and level_percent >= 76
  )
  select jsonb_build_object(
    'unlockedLevel', least(7, greatest(1, (select unlocked_level from unlocks))),
    'bestScores', (select best_scores from progress_levels)
  );
$$;

create or replace function public.register_profile(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_password text
)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  progress jsonb
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_username text := lower(trim(p_username));
  profile_row public.profiles;
begin
  if normalized_username = '' or p_password is null or length(p_password) < 4 then
    raise exception 'Username va kamida 4 belgili parol kerak.';
  end if;

  select * into profile_row
  from public.profiles p
  where p.username = normalized_username;

  if found and profile_row.password_hash is not null then
    raise exception 'Bu username band.';
  end if;

  if found then
    update public.profiles p
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  else
    insert into public.profiles (username, first_name, last_name, password_hash)
    values (normalized_username, trim(p_first_name), trim(p_last_name), extensions.crypt(p_password, extensions.gen_salt('bf')))
    returning * into profile_row;
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.avatar_url,
    public.profile_app_payload(profile_row.id);
end;
$$;

create or replace function public.login_profile(p_username text, p_password text)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  progress jsonb
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_username text := lower(trim(p_username));
  profile_row public.profiles;
begin
  select * into profile_row
  from public.profiles p
  where p.username = normalized_username;

  if not found then
    raise exception 'Login yoki parol noto''g''ri.';
  end if;

  if profile_row.password_hash is null then
    update public.profiles p
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  elsif profile_row.password_hash <> extensions.crypt(p_password, profile_row.password_hash) then
    raise exception 'Login yoki parol noto''g''ri.';
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.avatar_url,
    public.profile_app_payload(profile_row.id);
end;
$$;

create or replace function public.save_section_result(
  p_profile_id uuid,
  p_lesson_id integer,
  p_section_key text,
  p_score integer,
  p_total integer,
  p_percent integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  computed_stars integer;
begin
  if p_section_key not in ('words', 'sentences') then
    raise exception 'Noto''g''ri bo''lim.';
  end if;

  computed_stars := case
    when p_percent >= 96 then 5
    when p_percent >= 76 then 4
    when p_percent >= 51 then 3
    when p_percent >= 26 then 2
    when p_percent >= 1 then 1
    else 0
  end;

  insert into public.user_section_results (profile_id, lesson_id, section_key, score, total, percent, stars)
  values (p_profile_id, p_lesson_id, p_section_key, p_score, p_total, p_percent, computed_stars);

  return public.profile_app_payload(p_profile_id);
end;
$$;

create or replace function public.update_profile_avatar(p_profile_id uuid, p_avatar_url text)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  progress jsonb
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  profile_row public.profiles;
begin
  update public.profiles p
  set avatar_url = p_avatar_url,
      updated_at = now()
  where p.id = p_profile_id
  returning * into profile_row;

  if not found then
    raise exception 'Profile topilmadi.';
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.avatar_url,
    public.profile_app_payload(profile_row.id);
end;
$$;

