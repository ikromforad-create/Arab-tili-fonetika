begin;

delete from public.profiles
where lower(username) <> 'admin';

update public.profiles
set account_type = 'admin',
    is_admin = true,
    hidden_from_rating = true,
    updated_at = now()
where lower(username) = 'admin';

commit;
