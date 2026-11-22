-- =====================================================================
-- Physics Teacher Hub — міграція 4: «Файли уроку» в нотатках учителя
-- Для вже встановленої платформи: Supabase → SQL Editor → вставте ВЕСЬ цей файл → Run.
-- (Повний файл physics-teacher-hub-SQL.sql уже містить цю міграцію.)
-- Нічого з наявних даних не змінює й не видаляє.
-- =====================================================================
-- Файли (HTML-сценарії уроків, PDF, зображення…) лежать у ПРИВАТНОМУ сховищі
-- Supabase Storage (кошик pth-note-files). Кожен акаунт бачить лише власну
-- папку: <id користувача>/<id файлу>/<назва>. Публічних посилань немає.
-- =====================================================================

-- ---------- Кошик сховища (приватний, до 50 МБ на файл) -----------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('pth-note-files', 'pth-note-files', false, 52428800)
on conflict (id) do nothing;

-- ---------- Правила доступу до файлів у сховищі -----------------------
create policy pth_note_files_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'pth-note-files'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and (select public.pth_has_access()));

create policy pth_note_files_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pth-note-files'
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select public.pth_has_access()));

create policy pth_note_files_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'pth-note-files'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and (select public.pth_has_access()))
  with check (bucket_id = 'pth-note-files'
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select public.pth_has_access()));

create policy pth_note_files_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'pth-note-files'
         and (storage.foldername(name))[1] = (select auth.uid())::text
         and (select public.pth_has_access()));

-- ---------- Опис файлів (назва, тема, розмір) ---------------------------
create table public.pth_note_files (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id     uuid not null,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  file_name    text not null check (char_length(file_name) between 1 and 255),
  mime_type    text not null default 'application/octet-stream' check (char_length(mime_type) <= 150),
  size_bytes   bigint not null check (size_bytes between 0 and 52428800),
  storage_path text not null unique check (char_length(storage_path) <= 400),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Файл лежить лише у власній папці власника.
  constraint pth_note_files_path_owner check (split_part(storage_path, '/', 1) = owner_id::text),
  foreign key (topic_id, owner_id) references public.pth_topics (id, owner_id) on delete cascade
);

create index pth_note_files_owner_idx on public.pth_note_files (owner_id, created_at desc);
create index pth_note_files_topic_idx on public.pth_note_files (topic_id);

create trigger pth_note_files_set_updated_at
  before update on public.pth_note_files
  for each row execute function public.pth_set_updated_at();

alter table public.pth_note_files enable row level security;
alter table public.pth_note_files force row level security;

create policy pth_note_files_select_own on public.pth_note_files
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.pth_has_access()));
create policy pth_note_files_insert_own on public.pth_note_files
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.pth_has_access()));
create policy pth_note_files_update_own on public.pth_note_files
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.pth_has_access()))
  with check (owner_id = (select auth.uid()) and (select public.pth_has_access()));
create policy pth_note_files_delete_own on public.pth_note_files
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.pth_has_access()));

revoke all on table public.pth_note_files from anon;
grant select, insert, update, delete on table public.pth_note_files to authenticated;
