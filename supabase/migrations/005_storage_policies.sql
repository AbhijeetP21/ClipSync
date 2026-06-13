-- 005_storage_policies.sql
--
-- Purpose:
--   (C-1) Enforce per-user isolation on the private `clips-files` storage bucket
--         in version-controlled SQL, instead of relying on dashboard-only setup.
--   (C-2) Remove the unused `config` table, whose RLS policies were open to every
--         authenticated user.
--
-- This migration is SQL-only: no application code depends on it, and it is safe
-- to run more than once (idempotent).

-- ---------------------------------------------------------------------------
-- C-1: Private bucket + per-user storage.objects policies
-- ---------------------------------------------------------------------------

-- Ensure the bucket exists and is private (not publicly readable).
insert into storage.buckets (id, name, public)
values ('clips-files', 'clips-files', false)
on conflict (id) do update set public = false;

-- Every file this app writes lives under a top-level folder equal to the
-- owner's user id: `${auth.uid()}/...` (and `${auth.uid()}/notes/...`).
-- (storage.foldername(name))[1] returns that first path segment, so a user can
-- only touch objects inside their own folder.

drop policy if exists "clips-files owner can read"   on storage.objects;
drop policy if exists "clips-files owner can insert" on storage.objects;
drop policy if exists "clips-files owner can update" on storage.objects;
drop policy if exists "clips-files owner can delete" on storage.objects;

create policy "clips-files owner can read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'clips-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "clips-files owner can insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'clips-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "clips-files owner can update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'clips-files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'clips-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "clips-files owner can delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'clips-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- C-2: Drop the unused `config` table
-- ---------------------------------------------------------------------------
-- The `config` table backed the old single-user lock, which has been removed.
-- No application code reads or writes it anymore (the only leftover is a dead
-- TypeScript type). Its RLS policies granted every authenticated user full
-- read/write on all rows, so the safest fix is to drop the table entirely.
-- CASCADE also removes its now-defunct policies.
drop table if exists config cascade;
