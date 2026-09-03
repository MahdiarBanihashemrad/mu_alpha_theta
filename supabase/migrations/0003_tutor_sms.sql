alter table public.profiles
  add column if not exists phone text,
  add column if not exists sms_notifications boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_phone_format;

alter table public.profiles
  add constraint profiles_phone_format
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');

revoke select on table public.profiles from authenticated;
grant select (
  id, username, full_name, school_email, role, subjects,
  active, must_change_password, created_at, updated_at
) on table public.profiles to authenticated;

drop policy if exists "Users read their profile or staff read roster" on public.profiles;
create policy "Users read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

comment on column public.profiles.phone is 'Tutor phone number in E.164 format; visible only through administrator server routes.';
comment on column public.profiles.sms_notifications is 'Whether the tutor agreed to receive assignment SMS notifications.';
