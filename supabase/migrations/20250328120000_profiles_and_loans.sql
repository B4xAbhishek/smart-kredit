-- Profiles (one row per auth user) + loans. Run via Supabase SQL editor or CLI.
-- After migrate: set your first admin with:
--   update public.profiles set is_admin = true where phone = '+91xxxxxxxxxx';
-- Backfill existing auth users into profiles:
--   insert into public.profiles (id, phone, phone_e164)
--   select id, phone, phone from auth.users
--   on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text,
  phone_e164 text,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_name text not null,
  amount_rupees numeric(14, 2) not null check (amount_rupees > 0),
  status text not null default 'pending' check (
    status in ('active', 'settled', 'pending')
  ),
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now ()
);

create index if not exists loans_user_id_idx on public.loans (user_id);
create index if not exists loans_status_idx on public.loans (status);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, phone_e164)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles for each row
execute function public.set_updated_at ();

drop trigger if exists loans_updated_at on public.loans;
create trigger loans_updated_at
before update on public.loans for each row
execute function public.set_updated_at ();

create or replace function public.is_admin ()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where
        p.id = auth.uid ()
    ),
    false
  );
$$;

alter table public.profiles enable row level security;
alter table public.loans enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (auth.uid () = id);

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select using (public.is_admin ());

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles" on public.profiles for update using (public.is_admin ());

drop policy if exists "Users read own loans" on public.loans;
create policy "Users read own loans" on public.loans for select using (auth.uid () = user_id);

drop policy if exists "Admins read all loans" on public.loans;
create policy "Admins read all loans" on public.loans for select using (public.is_admin ());

drop policy if exists "Admins insert loans" on public.loans;
create policy "Admins insert loans" on public.loans for insert with check (public.is_admin ());

drop policy if exists "Admins update loans" on public.loans;
create policy "Admins update loans" on public.loans for update using (public.is_admin ());

drop policy if exists "Admins delete loans" on public.loans;
create policy "Admins delete loans" on public.loans for delete using (public.is_admin ());
