select
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'landmarks', 'comments', 'bookmarks')
order by table_name;

select
  trigger_name,
  event_object_schema,
  event_object_table
from information_schema.triggers
where trigger_name in ('on_auth_user_created', 'touch_profiles_updated_at')
order by trigger_name;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'landmarks', 'comments', 'bookmarks')
order by tablename, policyname;

select
  id,
  username,
  display_name,
  avatar_url,
  role,
  created_at,
  updated_at
from public.profiles
order by created_at desc
limit 10;
