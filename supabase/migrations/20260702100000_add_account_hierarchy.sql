begin;

alter table public.profiles
  add column if not exists account_type text not null default 'student',
  add column if not exists parent_profile_id uuid references public.profiles(id) on delete set null;

alter table public.profiles
  drop constraint if exists profiles_account_type_check;

alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('admin', 'center', 'teacher', 'student', 'indiv'));

create or replace function public.profile_app_payload(p_profile_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with profile_settings as (
    select coalesce(is_admin, false) as is_admin
    from public.profiles
    where id = p_profile_id
  ), section_groups as (
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
    'unlockedLevel', case
      when coalesce((select is_admin from profile_settings), false) then 8
      else least(8, greatest(1, (select unlocked_level from unlocks)))
    end,
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
  account_type text,
  parent_profile_id uuid,
  is_admin boolean,
  progress jsonb
)
language plpgsql
security definer
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
        password_hash = p_password,
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  else
    insert into public.profiles (username, first_name, last_name, password_hash)
    values (normalized_username, trim(p_first_name), trim(p_last_name), p_password)
    returning * into profile_row;
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.avatar_url,
    profile_row.account_type,
    profile_row.parent_profile_id,
    profile_row.is_admin,
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
  account_type text,
  parent_profile_id uuid,
  is_admin boolean,
  progress jsonb
)
language plpgsql
security definer
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
    set password_hash = p_password,
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  elsif profile_row.password_hash <> p_password and profile_row.password_hash <> crypt(p_password, profile_row.password_hash) then
    raise exception 'Login yoki parol noto''g''ri.';
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.avatar_url,
    profile_row.account_type,
    profile_row.parent_profile_id,
    profile_row.is_admin,
    public.profile_app_payload(profile_row.id);
end;
$$;

create or replace function public.create_profile_by_admin(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_password text,
  p_account_type text,
  p_parent_profile_id uuid default null,
  p_telegram_user_id bigint default null
)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  account_type text,
  parent_profile_id uuid,
  is_admin boolean,
  progress jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text := lower(trim(p_username));
  profile_row public.profiles;
  parent_row public.profiles;
begin
  if normalized_username = '' or p_password is null or length(p_password) < 4 then
    raise exception 'Username va kamida 4 belgili parol kerak.';
  end if;

  if p_account_type not in ('admin', 'center', 'teacher', 'student', 'indiv') then
    raise exception 'Noto''g''ri hisob turi.';
  end if;

  if p_account_type = 'admin' then
    raise exception 'Admin hisob faqat tizim tomonidan boshqariladi.';
  end if;

  if p_account_type = 'center' then
    if p_parent_profile_id is not null then
      raise exception 'Markaz uchun ota profil tanlanmaydi.';
    end if;
  elsif p_parent_profile_id is null then
    raise exception 'Ota profil tanlang.';
  else
    select * into parent_row from public.profiles where id = p_parent_profile_id;
    if not found then
      raise exception 'Ota profil topilmadi.';
    end if;
    if p_account_type = 'teacher' and parent_row.account_type <> 'center' then
      raise exception 'Oqituvchi faqat markaz ostida ochiladi.';
    end if;
    if p_account_type = 'student' and parent_row.account_type not in ('center', 'teacher', 'indiv') then
      raise exception 'Oquvchi uchun ota profil noto''g''ri.';
    end if;
    if p_account_type = 'indiv' then
      raise exception 'Individual o''qituvchi faqat o''quvchi ochadi va bu tur boshqa profillar ostida yaratilmaydi.';
    end if;
  end if;

  select * into profile_row
  from public.profiles p
  where p.username = normalized_username;

  if found then
    if profile_row.password_hash is not null then
      raise exception 'Bu username band.';
    end if;
    update public.profiles p
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        password_hash = p_password,
        account_type = p_account_type,
        parent_profile_id = p_parent_profile_id,
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  else
    insert into public.profiles (
      username, first_name, last_name, password_hash, account_type, parent_profile_id
    )
    values (
      normalized_username, trim(p_first_name), trim(p_last_name), p_password, p_account_type, p_parent_profile_id
    )
    returning * into profile_row;
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.avatar_url,
    profile_row.account_type,
    profile_row.parent_profile_id,
    profile_row.is_admin,
    public.profile_app_payload(profile_row.id);
end;
$$;

create or replace function public.create_profile_by_admin(
  p_username text,
  p_first_name text,
  p_last_name text,
  p_password text,
  p_account_type text,
  p_parent_profile_id uuid default null,
  p_telegram_user_id bigint default null
)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_url text,
  account_type text,
  parent_profile_id uuid,
  is_admin boolean,
  progress jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text := lower(trim(p_username));
  profile_row public.profiles;
  parent_row public.profiles;
begin
  if normalized_username = '' or p_password is null or length(p_password) < 4 then
    raise exception 'Username va kamida 4 belgili parol kerak.';
  end if;

  if p_account_type not in ('admin', 'center', 'teacher', 'student', 'indiv') then
    raise exception 'Noto''g''ri hisob turi.';
  end if;

  if p_account_type = 'admin' then
    raise exception 'Admin hisob yaratish mumkin emas.';
  end if;

  if p_account_type = 'center' then
    if p_parent_profile_id is not null then
      raise exception 'Markaz uchun ota profil tanlanmaydi.';
    end if;
  elsif p_account_type = 'indiv' then
    if p_parent_profile_id is not null then
      raise exception 'Individual o''qituvchi uchun ota profil tanlanmaydi.';
    end if;
  elsif p_parent_profile_id is null then
    raise exception 'Ota profil tanlang.';
  else
    select * into parent_row from public.profiles where id = p_parent_profile_id;
    if not found then
      raise exception 'Ota profil topilmadi.';
    end if;
    if p_account_type = 'teacher' and parent_row.account_type <> 'center' then
      raise exception 'Oqituvchi faqat markaz ostida ochiladi.';
    end if;
    if p_account_type = 'student' and parent_row.account_type not in ('center', 'teacher', 'indiv') then
      raise exception 'Oquvchi uchun ota profil noto''g''ri.';
    end if;
  end if;

  select * into profile_row
  from public.profiles p
  where p.username = normalized_username;

  if found then
    if profile_row.password_hash is not null then
      raise exception 'Bu username band.';
    end if;
    update public.profiles p
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        password_hash = crypt(p_password, gen_salt('bf')),
        account_type = p_account_type,
        parent_profile_id = p_parent_profile_id,
        updated_at = now()
    where p.id = profile_row.id
    returning * into profile_row;
  else
    insert into public.profiles (
      username, first_name, last_name, password_hash, account_type, parent_profile_id
    )
    values (
      normalized_username, trim(p_first_name), trim(p_last_name), crypt(p_password, gen_salt('bf')), p_account_type, p_parent_profile_id
    )
    returning * into profile_row;
  end if;

  if p_account_type = 'admin' then
    update public.profiles
    set is_admin = true
    where id = profile_row.id;
  end if;

  return query select
    profile_row.id,
    profile_row.username,
    profile_row.first_name,
    profile_row.last_name,
    profile_row.avatar_url,
    profile_row.account_type,
    profile_row.parent_profile_id,
    profile_row.is_admin,
    public.profile_app_payload(profile_row.id);
end;
$$;

drop view if exists public.analytics_registered_users;

create view public.analytics_registered_users
with (security_invoker = true) as
select
  p.id,
  p.username,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.account_type,
  p.parent_profile_id,
  p.created_at,
  p.updated_at,
  coalesce(attempts.attempts_count, 0) as attempts_count,
  attempts.last_activity_at,
  coalesce(best.total_score, 0)::integer as total_score,
  coalesce(best.average_percent, 0)::integer as average_percent,
  coalesce(progress.passed_levels, 0)::integer as passed_levels
from public.profiles p
left join (
  select profile_id, count(*) as attempts_count, max(completed_at) as last_activity_at
  from public.user_section_results
  group by profile_id
) attempts on attempts.profile_id = p.id
left join (
  select profile_id, sum(score) as total_score, round(avg(percent)) as average_percent
  from public.best_section_results
  group by profile_id
) best on best.profile_id = p.id
left join (
  select profile_id, count(*) filter (where level_passed) as passed_levels
  from public.level_progress
  group by profile_id
) progress on progress.profile_id = p.id
where not coalesce(p.hidden_from_rating, false);

commit;
