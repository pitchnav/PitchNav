-- =============================================================
-- PitchFrame Supabase Storage Bucket Policies
-- Run after 002_rls_policies.sql
-- =============================================================

-- ── Create private storage bucket for videos ─────────────────
-- Run this in Supabase Dashboard → Storage → New Bucket
-- OR via the SQL editor:

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pitch-videos',
  'pitch-videos',
  false,         -- private bucket — never publicly accessible
  524288000,     -- 500 MB per file
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
        'video/mpeg', 'video/ogg', 'video/3gpp']
)
on conflict (id) do nothing;

-- ── Create private bucket for analysis assets (PDFs, screenshots) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-assets',
  'analysis-assets',
  false,
  104857600,     -- 100 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
        'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

-- ── Public bucket for radar screenshots uploaded by athletes ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'radar-screenshots',
  'radar-screenshots',
  false,
  10485760,      -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- ── Storage RLS Policies ──────────────────────────────────────

-- pitch-videos: athletes can only access their own folder
-- Folder structure: pitch-videos/{user_id}/{order_id}/{filename}

create policy "Athletes can upload their own videos"
  on storage.objects for insert
  with check (
    bucket_id = 'pitch-videos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Athletes can view their own videos"
  on storage.objects for select
  using (
    bucket_id = 'pitch-videos'
    and (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    )
  );

create policy "Athletes can delete their own videos"
  on storage.objects for delete
  using (
    bucket_id = 'pitch-videos'
    and (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    )
  );

-- analysis-assets: only admins can upload; athletes can only view their own
-- Folder structure: analysis-assets/{order_id}/{filename}

create policy "Admins can manage analysis assets"
  on storage.objects for all
  using (
    bucket_id = 'analysis-assets'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Athletes can view analysis assets for their own orders"
  on storage.objects for select
  using (
    bucket_id = 'analysis-assets'
    and exists (
      select 1 from public.orders o
      where o.user_id = auth.uid()
        and o.id::text = (string_to_array(name, '/'))[1]
        and o.status = 'complete'
    )
  );

-- radar-screenshots: athletes can upload/view their own
-- Folder structure: radar-screenshots/{user_id}/{filename}

create policy "Athletes can upload radar screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'radar-screenshots'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Athletes can view own radar screenshots"
  on storage.objects for select
  using (
    bucket_id = 'radar-screenshots'
    and (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
    )
  );
