alter table public.profiles
  drop constraint profiles_s_number_check;

alter table public.profiles
  rename column s_number to username;

alter table public.profiles
  add constraint profiles_username_check
  check (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$');

alter table public.profiles
  rename constraint profiles_s_number_key to profiles_username_key;

comment on column public.profiles.username is 'Unique lowercase name-based login handle, such as jordan.lee.';
