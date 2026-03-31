-- Add email column to profiles for Google OAuth users.
-- Run via Supabase SQL editor or CLI.

alter table public.profiles add column if not exists email text;

-- Update the trigger so Google OAuth users get email + display_name populated.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, phone_e164, email, display_name)
  values (
    new.id,
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.phone,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    display_name = coalesce(
      case
        when (public.profiles.display_name is null or public.profiles.display_name = '')
          then excluded.display_name
        else null
      end,
      public.profiles.display_name
    );
  return new;
end;
$$;

-- Allow admin to bootstrap by email env var as well
-- (handled in application code via ADMIN_EMAIL env var)
