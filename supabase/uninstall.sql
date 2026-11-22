-- =====================================================================
-- Physics Teacher Hub — ПОВНЕ ВИДАЛЕННЯ з проєкту Supabase
-- =====================================================================
-- ⚠️ Видаляє ВСІ дані Physics Teacher Hub (теми, матеріали, формули,
-- нотатки, квізи) усіх користувачів. Скасувати неможливо.
-- Спершу зробіть резервну копію: застосунок → Налаштування → Експортувати дані.
--
-- Видаляються лише об'єкти з префіксом pth_. Таблиці, функції та акаунти
-- інших застосунків цього проєкту НЕ зачіпаються.
-- =====================================================================

-- Файли уроку: спершу правила сховища та таблиця.
drop policy if exists pth_note_files_storage_select on storage.objects;
drop policy if exists pth_note_files_storage_insert on storage.objects;
drop policy if exists pth_note_files_storage_update on storage.objects;
drop policy if exists pth_note_files_storage_delete on storage.objects;
-- Самі файли й кошик pth-note-files видаліть вручну: Supabase → Storage →
-- pth-note-files → виділити все → Delete, потім ⋯ → Delete bucket
-- (Supabase не дозволяє видаляти файли сховища SQL-запитом).

drop table if exists
  public.pth_note_files,
  public.pth_wheel_groups,
  public.pth_quiz_answer_keys,
  public.pth_quiz_questions,
  public.pth_quizzes,
  public.pth_notes,
  public.pth_formulas,
  public.pth_materials,
  public.pth_topic_content,
  public.pth_topics,
  public.pth_sections,
  public.pth_classes,
  public.pth_profiles,
  public.pth_allowed_emails
  cascade;

drop function if exists public.pth_import_workspace(jsonb, text);
drop function if exists public.pth_save_quiz_question(uuid, jsonb, jsonb);
drop function if exists public.pth_grade_quiz_answer(uuid, jsonb);
drop function if exists public.pth_normalize_short_answer(text, boolean, boolean);
drop function if exists public.pth_duplicate_topic(uuid);
drop function if exists public.pth_duplicate_quiz(uuid);
drop function if exists public.pth_copy_quiz_internal(uuid, uuid, text);
drop function if exists public.pth_delete_container(text, uuid, text);
drop function if exists public.pth_set_current_section(uuid);
drop function if exists public.pth_reorder_items(text, uuid[]);
drop function if exists public.pth_initialize_workspace();
drop function if exists public.pth_has_access();
drop function if exists public.pth_set_updated_at();
drop function if exists public.pth_valid_students(jsonb);
