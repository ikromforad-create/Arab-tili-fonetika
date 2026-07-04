drop policy if exists "Profiles can be inserted by app" on public.profiles;
drop policy if exists "Profiles can be updated by app" on public.profiles;
drop policy if exists "Section results can be inserted by app" on public.user_section_results;

create policy "Profiles can be inserted by app"
  on public.profiles for insert
  with check (
    username = lower(trim(username))
    and length(username) >= 2
    and first_name <> ''
    and last_name <> ''
    and password_hash is not null
  );

create policy "Profiles can be updated by app"
  on public.profiles for update
  using (id is not null)
  with check (
    username = lower(trim(username))
    and length(username) >= 2
    and first_name <> ''
    and last_name <> ''
  );

create policy "Section results can be inserted by app"
  on public.user_section_results for insert
  with check (
    section_key in ('words', 'sentences')
    and score >= 0
    and total > 0
    and percent between 0 and 100
    and stars between 0 and 5
  );

