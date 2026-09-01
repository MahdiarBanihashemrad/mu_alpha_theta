create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  s_number text not null unique check (s_number ~ '^S[0-9]{5,10}$'),
  full_name text not null,
  school_email text not null unique,
  login_email text not null unique,
  role text not null default 'tutor' check (role in ('tutor', 'officer', 'admin')),
  subjects text[] not null default '{}',
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tutoring_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'assigned', 'confirmed', 'completed', 'declined')),
  subject text not null,
  preferred_date date not null,
  preferred_time text not null,
  duration text not null,
  location text not null,
  student_name text not null,
  teacher text not null,
  email text,
  phone text,
  contact_preference text not null check (contact_preference in ('email', 'phone')),
  notes text,
  assigned_tutor_id uuid references public.profiles(id) on delete set null,
  officer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index tutoring_requests_tutor_idx on public.tutoring_requests(assigned_tutor_id);
create index tutoring_requests_status_idx on public.tutoring_requests(status);
create index tutoring_requests_date_idx on public.tutoring_requests(preferred_date);

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and active = true
      and role in ('officer', 'admin')
  );
$$;

revoke all on function private.is_staff() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

alter table public.profiles enable row level security;
alter table public.tutoring_requests enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.tutoring_requests from anon, authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.tutoring_requests to authenticated;

create policy "Users read their profile or staff read roster"
on public.profiles for select
to authenticated
using (
  (select auth.uid()) = id
  or (select private.is_staff())
);

create policy "Tutors read assignments and staff read all requests"
on public.tutoring_requests for select
to authenticated
using (
  assigned_tutor_id = (select auth.uid())
  or (select private.is_staff())
);

comment on table public.profiles is 'Approved Mu Alpha Theta tutor and officer accounts.';
comment on table public.tutoring_requests is 'Student tutoring requests; direct anonymous access is intentionally disabled.';
