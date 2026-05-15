-- Bootstrap one dedicated admin account after creating it in Supabase Auth.
--
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user
--    Email: admin@geolegacy.local
--    Password: choose a strong password
--    Auto Confirm User: enabled
--
-- 2. Run this file in Supabase SQL Editor.
--
-- 3. Sign in to GeoLegacy with that email/password. The user menu will show
--    "Review Submissions" for approving pending landmarks.

with admin_auth_user as (
  select
    id,
    email,
    created_at,
    coalesce(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      split_part(email, '@', 1),
      'GeoLegacy Admin'
    ) as display_name,
    coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture') as avatar_url
  from auth.users
  where lower(email) = lower('admin@geolegacy.local')
  limit 1
)
insert into public.profiles (id, username, display_name, avatar_url, role, created_at)
select
  id,
  'admin-' || left(id::text, 8),
  left(display_name, 80),
  avatar_url,
  'admin',
  created_at
from admin_auth_user
on conflict (id) do update
set
  role = 'admin',
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

select
  profiles.id,
  auth.users.email,
  profiles.username,
  profiles.display_name,
  profiles.role
from public.profiles
join auth.users on auth.users.id = profiles.id
where lower(auth.users.email) = lower('admin@geolegacy.local');
