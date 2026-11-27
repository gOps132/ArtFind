-- ArtFind Initial Schema (Supabase / PostgreSQL)
-- Matches canonical domain model in CONTEXT.md:
-- Artist, Artist Page, Source Profile, Commission Status, Artwork Preview, Opt-Out Registry

create extension if not exists pgcrypto;

-- 1. Canonical Artists table
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  bio_snippet text not null default '',
  avatar_url text,
  artist_page_url text not null unique,
  artist_page_type text not null default 'bluesky'
    check (artist_page_type in ('vgen', 'carrd', 'kofi', 'artistree', 'portfolio', 'bluesky', 'other')),
  commission_status text not null default 'open'
    check (commission_status in ('open', 'closed', 'waitlist', 'unknown')),
  style_tags text[] not null default '{}',
  category_tags text[] not null default '{}',
  price_min_usd integer,
  price_max_usd integer,
  price_raw_text text,
  content_rating text not null default 'sfw'
    check (content_rating in ('sfw', 'nsfw')),
  source_platform text not null default 'bluesky',
  source_handle text not null,
  source_profile_url text not null,
  source_post_url text,
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(bio_snippet, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(source_handle, '')), 'C')
  ) stored
);

create index if not exists idx_artists_status_verified
  on public.artists (commission_status, last_verified_at desc);

create index if not exists idx_artists_style_tags
  on public.artists using gin (style_tags);

create index if not exists idx_artists_category_tags
  on public.artists using gin (category_tags);

create index if not exists idx_artists_search_tsv
  on public.artists using gin (search_tsv);

-- 2. Source Profiles (1-to-many per Artist, enables multi-platform deduplication)
create table if not exists public.source_profiles (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  platform text not null,
  external_id text not null,
  handle text not null,
  profile_url text not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_id)
);

create index if not exists idx_source_profiles_artist_id
  on public.source_profiles (artist_id);

-- 3. Artwork Previews (upstream CDN thumbnail URLs only — never re-host full-res art)
create table if not exists public.artwork_previews (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  thumbnail_url text not null,
  alt_text text not null default '',
  aspect_width integer not null default 4,
  aspect_height integer not null default 3,
  source_post_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_artwork_previews_artist_id
  on public.artwork_previews (artist_id, sort_order);

-- 4. Opt-Out Registry (respects Artists who want removal from ArtFind)
create table if not exists public.opt_out_registry (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'bluesky',
  external_id text,
  handle text not null,
  reason text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_opt_out_platform_handle
  on public.opt_out_registry (platform, lower(handle));

-- Trigger: immediately remove any indexed Artist when an opt-out is inserted
create or replace function public.purge_opted_out_artist()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from public.artists a
  using public.source_profiles sp
  where sp.artist_id = a.id
    and sp.platform = new.platform
    and (
      lower(sp.handle) = lower(new.handle)
      or (new.external_id is not null and sp.external_id = new.external_id)
    );
  return new;
end;
$$;

drop trigger if exists trg_purge_opted_out_artist on public.opt_out_registry;
create trigger trg_purge_opted_out_artist
after insert on public.opt_out_registry
for each row execute function public.purge_opted_out_artist();

-- Row Level Security (RLS)
alter table public.artists enable row level security;
alter table public.source_profiles enable row level security;
alter table public.artwork_previews enable row level security;
alter table public.opt_out_registry enable row level security;

-- Public read-only access for open artists & their previews/profiles
create policy "Public read open artists"
  on public.artists for select
  using (commission_status = 'open');

create policy "Public read source profiles"
  on public.source_profiles for select
  using (true);

create policy "Public read artwork previews"
  on public.artwork_previews for select
  using (true);

-- Anyone can submit an opt-out request; only service_role can read/manage the registry
create policy "Public insert opt-out"
  on public.opt_out_registry for insert
  with check (length(trim(handle)) >= 3);
