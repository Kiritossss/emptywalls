-- ─────────────────────────────────────────────────────────────────────────
-- Empty Wall — Supabase setup
-- Run this in the Supabase dashboard → SQL Editor (once).
--
-- Auth model: sign-in required to publish. Every post is owned by a user.
-- RLS makes the public anon key safe: anyone may READ public posts, but only
-- the owner may read their private posts or write/delete their own rows.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. TABLE ------------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  bucket      text not null check (bucket in ('public-wallpapers', 'private-wallpapers')),
  image_path  text not null,                       -- path *within* the bucket
  visibility  text not null default 'public' check (visibility in ('public', 'private')),
  config      jsonb,                                -- render parameters (state.image)
  created_at  timestamptz not null default now()
);

create index if not exists posts_public_created_idx
  on public.posts (created_at desc) where visibility = 'public';
create index if not exists posts_user_idx on public.posts (user_id);

-- 2. ROW LEVEL SECURITY -----------------------------------------------------
alter table public.posts enable row level security;

-- Read: public rows for everyone; private rows only for their owner.
create policy "posts_select" on public.posts
  for select using (visibility = 'public' or user_id = auth.uid());

-- Write: only as yourself.
create policy "posts_insert" on public.posts
  for insert with check (user_id = auth.uid());
create policy "posts_update" on public.posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "posts_delete" on public.posts
  for delete using (user_id = auth.uid());

-- 3. STORAGE BUCKETS --------------------------------------------------------
-- public-wallpapers: served via public CDN URL (public posts only).
-- private-wallpapers: fetched only through short-lived signed URLs (owner only).
insert into storage.buckets (id, name, public)
  values ('public-wallpapers', 'public-wallpapers', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('private-wallpapers', 'private-wallpapers', false)
  on conflict (id) do nothing;

-- Storage RLS: files live under a top-level folder named after the owner's uid,
-- e.g. "<uid>/wallpaper_123.jpg". foldername(name)[1] is that uid.

-- public-wallpapers: authenticated users write only into their own folder.
-- (Downloads need no policy — a public bucket serves objects via its public URL.)
create policy "pub_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'public-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "pub_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'public-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- private-wallpapers: owner-only for every operation, including creating the
-- signed URL used to view the image (that goes through SELECT).
create policy "priv_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'private-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "priv_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'private-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "priv_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'private-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. AUTH -------------------------------------------------------------------
-- Email magic-link is enabled by default. In the dashboard:
--   Authentication → URL Configuration → add your site URL to "Redirect URLs"
--   (e.g. https://<user>.github.io/emptywalls/  and  http://localhost:8099 for dev).
-- Then paste your Project URL + anon key into api.js.
