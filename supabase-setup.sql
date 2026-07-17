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
drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts
  for select using (visibility = 'public' or user_id = auth.uid());

-- Write: only as yourself.
drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts
  for insert with check (user_id = auth.uid());
drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts
  for delete using (user_id = auth.uid());

-- 2b. LIKES -----------------------------------------------------------------
-- Per-user likes plus a denormalized like_count on posts (kept in sync by a
-- trigger) so the "Most Popular" sort is a simple, fast ORDER BY.
alter table public.posts add column if not exists like_count integer not null default 0;

create table if not exists public.likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

-- Anyone may read likes (counts / who-liked); users write only their own like.
drop policy if exists "likes_select" on public.likes;
create policy "likes_select" on public.likes for select using (true);
drop policy if exists "likes_insert" on public.likes;
create policy "likes_insert" on public.likes for insert with check (user_id = auth.uid());
drop policy if exists "likes_delete" on public.likes;
create policy "likes_delete" on public.likes for delete using (user_id = auth.uid());

-- Keep posts.like_count in sync. SECURITY DEFINER so the counter can update a
-- post the liker does not own (posts RLS would otherwise block it).
create or replace function public.bump_like_count()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif (tg_op = 'DELETE') then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end $$;

drop trigger if exists likes_count_trg on public.likes;
create trigger likes_count_trg after insert or delete on public.likes
  for each row execute function public.bump_like_count();

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
drop policy if exists "pub_insert_own" on storage.objects;
create policy "pub_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'public-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "pub_delete_own" on storage.objects;
create policy "pub_delete_own" on storage.objects
  for delete to authenticated using (
    bucket_id = 'public-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- private-wallpapers: owner-only for every operation, including creating the
-- signed URL used to view the image (that goes through SELECT).
drop policy if exists "priv_insert_own" on storage.objects;
create policy "priv_insert_own" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'private-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "priv_select_own" on storage.objects;
create policy "priv_select_own" on storage.objects
  for select to authenticated using (
    bucket_id = 'private-wallpapers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "priv_delete_own" on storage.objects;
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
