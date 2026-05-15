create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text not null default '',
  home_region text not null default '',
  website_url text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text not null default '',
  add column if not exists home_region text not null default '',
  add column if not exists website_url text not null default '',
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set display_name = username
where display_name is null;

alter table public.profiles
  alter column display_name set not null;

create table if not exists public.landmarks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  era text not null,
  region text,
  image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'published')),
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  landmark_id uuid not null references public.landmarks(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  landmark_id uuid not null references public.landmarks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, landmark_id)
);

create index if not exists landmarks_status_created_at_idx
  on public.landmarks (status, created_at desc);

create index if not exists landmarks_search_idx
  on public.landmarks using gin (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(era, '') || ' ' ||
      coalesce(region, '')
    )
  );

create index if not exists comments_landmark_created_at_idx
  on public.comments (landmark_id, created_at asc);

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_profile_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.role() = 'authenticated'
    and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can change profile roles.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_landmark_status_self_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
    and auth.role() = 'authenticated'
    and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can change landmark status.';
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  safe_username text;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'user_name',
    split_part(new.email, '@', 1),
    'explorer'
  );

  safe_username := regexp_replace(lower(trim(base_username)), '[^a-z0-9_-]+', '-', 'g');
  safe_username := trim(both '-' from safe_username);

  if safe_username = '' then
    safe_username := 'explorer';
  end if;

  insert into public.profiles (id, username, display_name, avatar_url, role)
  values (
    new.id,
    left(safe_username, 44) || '-' || left(new.id::text, 8),
    left(base_username, 80),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'user'
  )
  on conflict (id) do update
  set
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists prevent_profile_role_self_escalation on public.profiles;
create trigger prevent_profile_role_self_escalation
before update of role on public.profiles
for each row execute function public.prevent_profile_role_self_escalation();

drop trigger if exists prevent_landmark_status_self_publish on public.landmarks;
create trigger prevent_landmark_status_self_publish
before update of status on public.landmarks
for each row execute function public.prevent_landmark_status_self_publish();

insert into public.profiles (id, username, display_name, avatar_url, role, created_at)
select
  user_source.id,
  left(user_source.safe_username, 44) || '-' || left(user_source.id::text, 8) as username,
  left(user_source.display_name, 80) as display_name,
  user_source.avatar_url,
  'user' as role,
  user_source.created_at
from (
  select
    users.id,
    users.created_at,
    coalesce(
      users.raw_user_meta_data->>'full_name',
      users.raw_user_meta_data->>'name',
      users.raw_user_meta_data->>'user_name',
      split_part(users.email, '@', 1),
      'explorer'
    ) as display_name,
    coalesce(
      nullif(
        trim(both '-' from regexp_replace(
          lower(coalesce(
            users.raw_user_meta_data->>'full_name',
            users.raw_user_meta_data->>'name',
            users.raw_user_meta_data->>'user_name',
            split_part(users.email, '@', 1),
            'explorer'
          )),
          '[^a-z0-9_-]+',
          '-',
          'g'
        )),
        ''
      ),
      'explorer'
    ) as safe_username,
    coalesce(
      users.raw_user_meta_data->>'avatar_url',
      users.raw_user_meta_data->>'picture'
    ) as avatar_url
  from auth.users
) as user_source
on conflict (id) do update
set
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

alter table public.profiles enable row level security;
alter table public.landmarks enable row level security;
alter table public.comments enable row level security;
alter table public.bookmarks enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable"
on public.profiles for select
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "Published landmarks are public" on public.landmarks;
create policy "Published landmarks are public"
on public.landmarks for select
using (
  status = 'published'
  or auth.uid() = author_id
  or public.is_admin(auth.uid())
);

drop policy if exists "Anyone can submit pending landmarks" on public.landmarks;
drop policy if exists "Authenticated users can submit pending landmarks" on public.landmarks;
create policy "Authenticated users can submit pending landmarks"
on public.landmarks for insert
to authenticated
with check (
  status = 'pending'
  and author_id = auth.uid()
);

drop policy if exists "Authors and admins can update landmarks" on public.landmarks;
create policy "Authors and admins can update landmarks"
on public.landmarks for update
to authenticated
using (auth.uid() = author_id or public.is_admin(auth.uid()))
with check (auth.uid() = author_id or public.is_admin(auth.uid()));

drop policy if exists "Comments on published landmarks are public" on public.comments;
create policy "Comments on published landmarks are public"
on public.comments for select
using (
  exists (
    select 1
    from public.landmarks
    where landmarks.id = comments.landmark_id
      and landmarks.status = 'published'
  )
);

drop policy if exists "Authenticated users can comment" on public.comments;
create policy "Authenticated users can comment"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their comments" on public.comments;
create policy "Users can manage their comments"
on public.comments for update
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "Users can read their bookmarks" on public.bookmarks;
create policy "Users can read their bookmarks"
on public.bookmarks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create bookmarks" on public.bookmarks;
create policy "Users can create bookmarks"
on public.bookmarks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete bookmarks" on public.bookmarks;
create policy "Users can delete bookmarks"
on public.bookmarks for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'landmark-images',
  'landmark-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Landmark images are public" on storage.objects;
create policy "Landmark images are public"
on storage.objects for select
using (bucket_id = 'landmark-images');

drop policy if exists "Anyone can upload pending landmark images" on storage.objects;
drop policy if exists "Authenticated users can upload pending landmark images" on storage.objects;
create policy "Authenticated users can upload pending landmark images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'landmark-images'
  and split_part(name, '/', 1) = 'pending'
  and split_part(name, '/', 2) = auth.uid()::text
);
