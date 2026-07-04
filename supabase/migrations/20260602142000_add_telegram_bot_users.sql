create table if not exists public.telegram_bot_users (
  telegram_user_id bigint primary key,
  chat_id bigint not null,
  username text,
  first_name text,
  last_name text,
  language_code text,
  is_bot boolean not null default false,
  allows_broadcast boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_bot_users_chat_id_idx
  on public.telegram_bot_users (chat_id);

create index if not exists telegram_bot_users_last_seen_idx
  on public.telegram_bot_users (last_seen_at desc);

create table if not exists public.telegram_broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_telegram_user_id bigint,
  message text not null,
  attempted_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.telegram_bot_users enable row level security;
alter table public.telegram_broadcasts enable row level security;
