-- =====================================================================
-- MyStudyAI - Storage
-- Buckets: materials (private), avatars and posts (public). Files live in "<user id>/<file>".
-- Idempotent: safe to run more than once.
-- =====================================================================

-- ---------- Storage buckets ----------
insert into storage.buckets (id, name, public) values ('materials', 'materials', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;

-- Files live in "<user id>/<file>": students can only touch their own folder
drop policy if exists "mystudyai own files read" on storage.objects;
create policy "mystudyai own files read" on storage.objects for select to authenticated
  using (bucket_id in ('materials', 'avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "mystudyai own files write" on storage.objects;
create policy "mystudyai own files write" on storage.objects for insert to authenticated
  with check (bucket_id in ('materials', 'avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "mystudyai own files update" on storage.objects;
create policy "mystudyai own files update" on storage.objects for update to authenticated
  using (bucket_id in ('materials', 'avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "mystudyai own files delete" on storage.objects;
create policy "mystudyai own files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('materials', 'avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);
