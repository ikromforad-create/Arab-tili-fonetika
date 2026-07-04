create extension if not exists pgcrypto;

create table if not exists public.lessons (
  id integer primary key,
  title text not null,
  level integer not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_words (
  id uuid primary key default gen_random_uuid(),
  lesson_id integer not null references public.lessons(id) on delete cascade,
  position integer not null,
  arabic text not null,
  uzbek text not null,
  created_at timestamptz not null default now(),
  unique (lesson_id, position)
);

create table if not exists public.lesson_sentences (
  id uuid primary key default gen_random_uuid(),
  lesson_id integer not null references public.lessons(id) on delete cascade,
  position integer not null,
  arabic text not null,
  uzbek text not null,
  created_at timestamptz not null default now(),
  unique (lesson_id, position)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  first_name text not null,
  last_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_section_results (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id integer not null references public.lessons(id) on delete cascade,
  section_key text not null check (section_key in ('words', 'sentences')),
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  percent integer not null check (percent >= 0 and percent <= 100),
  stars integer not null check (stars >= 0 and stars <= 5),
  completed_at timestamptz not null default now()
);

create index if not exists lesson_words_lesson_position_idx
  on public.lesson_words (lesson_id, position);

create index if not exists lesson_sentences_lesson_position_idx
  on public.lesson_sentences (lesson_id, position);

create index if not exists user_section_results_profile_lesson_idx
  on public.user_section_results (profile_id, lesson_id, section_key, completed_at desc);

create or replace view public.best_section_results as
select distinct on (profile_id, lesson_id, section_key)
  profile_id,
  lesson_id,
  section_key,
  score,
  total,
  percent,
  stars,
  completed_at
from public.user_section_results
order by profile_id, lesson_id, section_key, percent desc, completed_at desc;

create or replace view public.level_progress as
select
  profile_id,
  lesson_id,
  round(avg(percent))::integer as average_percent,
  count(*) filter (where section_key in ('words', 'sentences')) as completed_sections,
  case
    when round(avg(percent)) >= 96 then 5
    when round(avg(percent)) >= 76 then 4
    when round(avg(percent)) >= 51 then 3
    when round(avg(percent)) >= 26 then 2
    when round(avg(percent)) >= 1 then 1
    else 0
  end as stars,
  bool_and(percent >= 76) and count(*) = 2 as level_passed
from public.best_section_results
group by profile_id, lesson_id;

alter table public.lessons enable row level security;
alter table public.lesson_words enable row level security;
alter table public.lesson_sentences enable row level security;
alter table public.profiles enable row level security;
alter table public.user_section_results enable row level security;

create policy "Learning content is readable"
  on public.lessons for select
  using (true);

create policy "Words are readable"
  on public.lesson_words for select
  using (true);

create policy "Sentences are readable"
  on public.lesson_sentences for select
  using (true);

create policy "Profiles can be read for app analytics"
  on public.profiles for select
  using (true);

create policy "Section results can be read for analytics"
  on public.user_section_results for select
  using (true);

