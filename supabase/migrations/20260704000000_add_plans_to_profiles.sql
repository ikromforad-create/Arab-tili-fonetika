begin;

alter table public.profiles
  add column if not exists plan text not null default '';

update public.profiles
set plan = case
  when account_type = 'center' then 'center'
  when account_type = 'indiv' then 'indiv'
  else coalesce(plan, '')
end
where plan = '' or plan is null;

commit;
