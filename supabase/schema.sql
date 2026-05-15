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
  slug text unique,
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

alter table public.landmarks
  add column if not exists slug text;

create unique index if not exists landmarks_slug_key
  on public.landmarks (slug);

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
      coalesce(slug, '') || ' ' ||
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

drop policy if exists "Admins can delete landmarks" on public.landmarks;
create policy "Admins can delete landmarks"
on public.landmarks for delete
to authenticated
using (public.is_admin(auth.uid()));

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

drop policy if exists "Admins can read all comments" on public.comments;
create policy "Admins can read all comments"
on public.comments for select
to authenticated
using (public.is_admin(auth.uid()));

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

drop policy if exists "Users and admins can delete comments" on public.comments;
create policy "Users and admins can delete comments"
on public.comments for delete
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

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

insert into public.landmarks (
  slug,
  title,
  description,
  lat,
  lng,
  era,
  region,
  image_url,
  status
)
values
  (
    'colosseum',
    'Colosseum',
    'A monumental Flavian amphitheater where imperial spectacle, architecture, and public life converged at the heart of ancient Rome.',
    41.8902,
    12.4922,
    '70 AD',
    'Rome, Italy',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1400&q=80',
    'published'
  ),
  (
    'giza',
    'Great Pyramid of Giza',
    'The last remaining wonder of the ancient world, engineered as a royal tomb and aligned with extraordinary astronomical precision.',
    29.9792,
    31.1342,
    '2560 BC',
    'Giza, Egypt',
    'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=1400&q=80',
    'published'
  ),
  (
    'machu-picchu',
    'Machu Picchu',
    'An Incan mountain citadel layered into the Andes, combining sacred geography, agricultural terraces, and stonework without mortar.',
    -13.1631,
    -72.545,
    '1450 AD',
    'Cusco Region, Peru',
    'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1400&q=80',
    'published'
  ),
  (
    'great-wall',
    'Great Wall',
    'A vast defensive network expanded over dynasties, shaping trade corridors, military movement, and frontier identity.',
    40.4319,
    116.5704,
    '7th c. BC onward',
    'Northern China',
    'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1400&q=80',
    'published'
  ),
  (
    'angkor-wat',
    'Angkor Wat',
    'A Khmer temple city whose towers, galleries, and waterworks encode cosmology, kingship, and regional power.',
    13.4125,
    103.867,
    '12th c. AD',
    'Siem Reap, Cambodia',
    'https://images.unsplash.com/photo-1589876873315-3f316dbee0cc?auto=format&fit=crop&w=1400&q=80',
    'published'
  ),
  (
    'taj-mahal',
    'Taj Mahal',
    'A marble mausoleum commissioned by Shah Jahan, renowned for its garden symmetry, calligraphy, and shifting luminous surface.',
    27.1751,
    78.0421,
    '1632 AD',
    'Agra, India',
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1400&q=80',
    'published'
  ),
  (
    'stonehenge',
    'Stonehenge',
    'A prehistoric stone circle aligned to solar events, preserving clues about ritual, labor, and landscape-scale planning.',
    51.1789,
    -1.8262,
    '3000 BC',
    'Wiltshire, England',
    'https://images.unsplash.com/photo-1566930844815-c22ddcfa9e6e?auto=format&fit=crop&w=1400&q=80',
    'published'
  ),
  (
    'gobekli-tepe',
    'Gobekli Tepe',
    'One of the world''s earliest known monumental ritual complexes, built by hunter-gatherer communities long before cities and writing.',
    37.2231,
    38.9225,
    '9600 BC',
    'Sanliurfa, Turkey',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/G%C3%B6bekli_Tepe%2C_Urfa.jpg/1400px-G%C3%B6bekli_Tepe%2C_Urfa.jpg',
    'published'
  ),
  (
    'acropolis-athens',
    'Acropolis of Athens',
    'A citadel crowned by the Parthenon, representing classical Greek architecture, civic identity, and sacred urban space.',
    37.9715,
    23.7257,
    '447 BC',
    'Athens, Greece',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/1029_Acropolis_of_Athens_in_Greece_at_night_Photo_by_Giles_Laurent.jpg/1400px-1029_Acropolis_of_Athens_in_Greece_at_night_Photo_by_Giles_Laurent.jpg',
    'published'
  ),
  (
    'persepolis',
    'Persepolis',
    'The ceremonial capital of the Achaemenid Empire, known for monumental stairways, reliefs, and imperial audience halls.',
    29.9355,
    52.8916,
    '518 BC',
    'Fars Province, Iran',
    'https://upload.wikimedia.org/wikipedia/commons/3/39/Gate_of_All_Nations%2C_Persepolis.jpg',
    'published'
  ),
  (
    'petra',
    'Petra',
    'A Nabataean city carved into rose-colored sandstone cliffs, thriving at the crossroads of Arabian, Egyptian, and Mediterranean trade.',
    30.3285,
    35.4444,
    '312 BC',
    'Ma''an Governorate, Jordan',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Al_Deir_Petra.JPG/1400px-Al_Deir_Petra.JPG',
    'published'
  ),
  (
    'chichen-itza',
    'Chichen Itza',
    'A major Maya city centered on temples, observatories, ball courts, and ceremonial architecture tied to astronomy and power.',
    20.6843,
    -88.5678,
    '600 AD',
    'Yucatan, Mexico',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Chichen_Itza_3.jpg/1400px-Chichen_Itza_3.jpg',
    'published'
  ),
  (
    'hagia-sophia',
    'Hagia Sophia',
    'A Byzantine architectural landmark whose massive dome shaped religious, political, and artistic history across empires.',
    41.0086,
    28.9802,
    '537 AD',
    'Istanbul, Turkey',
    'https://upload.wikimedia.org/wikipedia/commons/4/4a/Hagia_Sophia_%28228968325%29.jpeg',
    'published'
  ),
  (
    'borobudur',
    'Borobudur',
    'A vast Buddhist monument arranged as a mandala, with terraces, stupas, and relief panels guiding a symbolic pilgrimage path.',
    -7.6079,
    110.2038,
    '9th c. AD',
    'Central Java, Indonesia',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Pradaksina.jpg/1400px-Pradaksina.jpg',
    'published'
  ),
  (
    'alhambra',
    'Alhambra',
    'A Nasrid palace-fortress celebrated for intricate stucco, water courts, gardens, and the refined urban culture of medieval Granada.',
    37.1761,
    -3.5881,
    '13th c. AD',
    'Granada, Spain',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg/1400px-Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg',
    'published'
  ),
  (
    'forbidden-city',
    'Forbidden City',
    'The imperial palace complex of Ming and Qing China, planned around ritual hierarchy, court administration, and symbolic geometry.',
    39.9163,
    116.3972,
    '1420 AD',
    'Beijing, China',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Forbidden_City_-_View_from_Coal_Hill.jpg/1400px-The_Forbidden_City_-_View_from_Coal_Hill.jpg',
    'published'
  ),
  (
    'palace-of-versailles',
    'Palace of Versailles',
    'A royal residence transformed into a model of early modern statecraft, court spectacle, garden design, and absolutist power.',
    48.8049,
    2.1204,
    '1682 AD',
    'Versailles, France',
    'https://upload.wikimedia.org/wikipedia/commons/d/d2/Versailles-Chateau-Jardins02.jpg',
    'published'
  )
on conflict (slug) do update
set image_url = coalesce(public.landmarks.image_url, excluded.image_url);

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
