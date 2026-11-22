-- =====================================================================
-- Physics Teacher Hub — міграція 3: класи для «Колеса опитування»
-- Для вже встановленої платформи: Supabase → SQL Editor → вставте ВЕСЬ цей файл → Run.
-- (Повний файл physics-teacher-hub-SQL.sql уже містить цю міграцію.)
-- Нічого з наявних даних не змінює й не видаляє.
-- =====================================================================
-- Списки учнів зберігаються лише тут (приватно, під RLS), а не в коді сайту.

-- Перевірка формату списку: [{"name": "Ім'я", "selected": true}, ...]
create or replace function public.pth_valid_students(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) <= 300
     and coalesce((
       select bool_and(
                jsonb_typeof(e) = 'object'
            and jsonb_typeof(e -> 'name') = 'string'
            and char_length(btrim(e ->> 'name')) between 1 and 100
            and jsonb_typeof(e -> 'selected') = 'boolean')
         from jsonb_array_elements(p) e), true);
$$;

create table public.pth_wheel_groups (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 40),
  students   jsonb not null default '[]'::jsonb check (public.pth_valid_students(students)),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pth_wheel_groups_owner_idx on public.pth_wheel_groups (owner_id, sort_order);

create trigger pth_wheel_groups_set_updated_at
  before update on public.pth_wheel_groups
  for each row execute function public.pth_set_updated_at();

alter table public.pth_wheel_groups enable row level security;
alter table public.pth_wheel_groups force row level security;

create policy pth_wheel_groups_select_own on public.pth_wheel_groups
  for select to authenticated using (owner_id = (select auth.uid()) and (select public.pth_has_access()));
create policy pth_wheel_groups_insert_own on public.pth_wheel_groups
  for insert to authenticated with check (owner_id = (select auth.uid()) and (select public.pth_has_access()));
create policy pth_wheel_groups_update_own on public.pth_wheel_groups
  for update to authenticated using (owner_id = (select auth.uid()) and (select public.pth_has_access()))
  with check (owner_id = (select auth.uid()) and (select public.pth_has_access()));
create policy pth_wheel_groups_delete_own on public.pth_wheel_groups
  for delete to authenticated using (owner_id = (select auth.uid()) and (select public.pth_has_access()));

revoke all on table public.pth_wheel_groups from anon;
grant select, insert, update, delete on table public.pth_wheel_groups to authenticated;
grant execute on function public.pth_valid_students(jsonb) to authenticated;

-- ---------- Імпорт резервної копії: тепер разом із класами колеса ----------
create or replace function public.pth_import_workspace(p_payload jsonb, p_mode text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  d      jsonb := p_payload -> 'data';
  m      jsonb := '{}'::jsonb;   -- старий id → новий id
  r      jsonb;
  v_new  uuid;
  v_ref  uuid;
  v_has_current boolean := false;
  v_cur  boolean;
  c_classes int := 0; c_sections int := 0; c_topics int := 0; c_content int := 0;
  c_materials int := 0; c_formulas int := 0; c_notes int := 0; c_quizzes int := 0;
  c_questions int := 0; c_keys int := 0; c_wheel int := 0;
begin
  if v_uid is null then
    raise exception 'Потрібна авторизація' using errcode = '28000';
  end if;
  if p_mode not in ('merge', 'replace') then
    raise exception 'Невідомий режим імпорту: %', p_mode;
  end if;
  if coalesce(p_payload ->> 'app', '') <> 'physics-teacher-hub' then
    raise exception 'Це не файл резервної копії Physics Teacher Hub';
  end if;
  if coalesce(p_payload ->> 'version', '') <> '1' then
    raise exception 'Непідтримувана версія файлу: %', p_payload ->> 'version';
  end if;
  if jsonb_typeof(d) <> 'object' then
    raise exception 'У файлі немає розділу data';
  end if;

  if p_mode = 'replace' then
    delete from pth_quizzes   where owner_id = v_uid;
    delete from pth_materials where owner_id = v_uid;
    delete from pth_formulas  where owner_id = v_uid;
    delete from pth_classes   where owner_id = v_uid; -- каскадно: розділи, теми, теорія, нотатки
    delete from pth_wheel_groups where owner_id = v_uid;
  else
    select exists (select 1 from pth_sections where is_current) into v_has_current;
  end if;

  -- Класи
  for r in select * from jsonb_array_elements(coalesce(d -> 'classes', '[]')) loop
    v_new := gen_random_uuid();
    insert into pth_classes (id, owner_id, title, sort_order)
    values (v_new, v_uid, r ->> 'title', coalesce((r ->> 'sort_order')::int, 0));
    m := m || jsonb_build_object(r ->> 'id', v_new);
    c_classes := c_classes + 1;
  end loop;

  -- Розділи
  for r in select * from jsonb_array_elements(coalesce(d -> 'sections', '[]')) loop
    v_ref := (m ->> (r ->> 'class_id'))::uuid;
    if v_ref is null then
      raise exception 'Розділ «%» посилається на відсутній клас', r ->> 'title';
    end if;
    v_cur := coalesce((r ->> 'is_current')::boolean, false) and not v_has_current;
    if v_cur then v_has_current := true; end if;
    v_new := gen_random_uuid();
    insert into pth_sections (id, owner_id, class_id, title, description, sort_order, is_current)
    values (v_new, v_uid, v_ref, r ->> 'title', coalesce(r ->> 'description', ''),
            coalesce((r ->> 'sort_order')::int, 0), v_cur);
    m := m || jsonb_build_object(r ->> 'id', v_new);
    c_sections := c_sections + 1;
  end loop;

  -- Теми
  for r in select * from jsonb_array_elements(coalesce(d -> 'topics', '[]')) loop
    v_ref := (m ->> (r ->> 'section_id'))::uuid;
    if v_ref is null then
      raise exception 'Тема «%» посилається на відсутній розділ', r ->> 'title';
    end if;
    v_new := gen_random_uuid();
    insert into pth_topics (id, owner_id, section_id, title, description, icon, image_url, sort_order)
    values (v_new, v_uid, v_ref, r ->> 'title', coalesce(r ->> 'description', ''),
            r ->> 'icon', r ->> 'image_url', coalesce((r ->> 'sort_order')::int, 0));
    m := m || jsonb_build_object(r ->> 'id', v_new);
    c_topics := c_topics + 1;
  end loop;

  -- Огляд і теорія
  for r in select * from jsonb_array_elements(coalesce(d -> 'topic_content', '[]')) loop
    v_ref := (m ->> (r ->> 'topic_id'))::uuid;
    if v_ref is null then
      raise exception 'Теорія посилається на відсутню тему';
    end if;
    insert into pth_topic_content (topic_id, owner_id, summary, key_concepts, definitions, objectives, theory_html)
    values (v_ref, v_uid, coalesce(r ->> 'summary', ''),
            coalesce(array(select jsonb_array_elements_text(coalesce(r -> 'key_concepts', '[]'))), '{}'),
            coalesce(r -> 'definitions', '[]'),
            coalesce(array(select jsonb_array_elements_text(coalesce(r -> 'objectives', '[]'))), '{}'),
            coalesce(r ->> 'theory_html', ''));
    c_content := c_content + 1;
  end loop;

  -- Матеріали (якщо тему не знайдено — матеріал іде у Скарбничку)
  for r in select * from jsonb_array_elements(coalesce(d -> 'materials', '[]')) loop
    v_ref := case when r ->> 'topic_id' is null then null else (m ->> (r ->> 'topic_id'))::uuid end;
    insert into pth_materials (owner_id, topic_id, type, title, url, description, provider, thumbnail_url,
                           content_html, tags, visibility, is_favorite, sort_order)
    values (v_uid, v_ref, r ->> 'type', r ->> 'title', nullif(r ->> 'url', ''),
            coalesce(r ->> 'description', ''), r ->> 'provider', r ->> 'thumbnail_url',
            coalesce(r ->> 'content_html', ''),
            coalesce(array(select jsonb_array_elements_text(coalesce(r -> 'tags', '[]'))), '{}'),
            coalesce(r ->> 'visibility', 'teacher'),
            coalesce((r ->> 'is_favorite')::boolean, false),
            coalesce((r ->> 'sort_order')::int, 0));
    c_materials := c_materials + 1;
  end loop;

  -- Формули
  for r in select * from jsonb_array_elements(coalesce(d -> 'formulas', '[]')) loop
    v_ref := case when r ->> 'topic_id' is null then null else (m ->> (r ->> 'topic_id'))::uuid end;
    insert into pth_formulas (owner_id, topic_id, name, latex, explanation, quantities, units, example,
                          calculator_key, sort_order)
    values (v_uid, v_ref, r ->> 'name', r ->> 'latex', coalesce(r ->> 'explanation', ''),
            coalesce(r -> 'quantities', '[]'), coalesce(r ->> 'units', ''), coalesce(r ->> 'example', ''),
            r ->> 'calculator_key', coalesce((r ->> 'sort_order')::int, 0));
    c_formulas := c_formulas + 1;
  end loop;

  -- Нотатки (тема обов'язкова)
  for r in select * from jsonb_array_elements(coalesce(d -> 'notes', '[]')) loop
    v_ref := (m ->> (r ->> 'topic_id'))::uuid;
    if v_ref is null then
      raise exception 'Нотатка «%» посилається на відсутню тему', r ->> 'title';
    end if;
    insert into pth_notes (owner_id, topic_id, title, body_html)
    values (v_uid, v_ref, r ->> 'title', coalesce(r ->> 'body_html', ''));
    c_notes := c_notes + 1;
  end loop;

  -- Квізи
  for r in select * from jsonb_array_elements(coalesce(d -> 'quizzes', '[]')) loop
    v_ref := case when r ->> 'topic_id' is null then null else (m ->> (r ->> 'topic_id'))::uuid end;
    v_new := gen_random_uuid();
    insert into pth_quizzes (id, owner_id, topic_id, title, description, reveal_mode, show_explanations)
    values (v_new, v_uid, v_ref, r ->> 'title', coalesce(r ->> 'description', ''),
            coalesce(r ->> 'reveal_mode', 'end'), coalesce((r ->> 'show_explanations')::boolean, true));
    m := m || jsonb_build_object(r ->> 'id', v_new);
    c_quizzes := c_quizzes + 1;
  end loop;

  -- Питання
  for r in select * from jsonb_array_elements(coalesce(d -> 'quiz_questions', '[]')) loop
    v_ref := (m ->> (r ->> 'quiz_id'))::uuid;
    if v_ref is null then
      raise exception 'Питання посилається на відсутній квіз';
    end if;
    v_new := gen_random_uuid();
    insert into pth_quiz_questions (id, owner_id, quiz_id, qtype, prompt, options, image_url, sort_order)
    values (v_new, v_uid, v_ref, r ->> 'qtype', r ->> 'prompt', coalesce(r -> 'options', '[]'),
            r ->> 'image_url', coalesce((r ->> 'sort_order')::int, 0));
    m := m || jsonb_build_object(r ->> 'id', v_new);
    c_questions := c_questions + 1;
  end loop;

  -- Ключі відповідей
  for r in select * from jsonb_array_elements(coalesce(d -> 'quiz_answer_keys', '[]')) loop
    v_ref := (m ->> (r ->> 'question_id'))::uuid;
    if v_ref is null then
      raise exception 'Ключ відповіді посилається на відсутнє питання';
    end if;
    insert into pth_quiz_answer_keys (question_id, owner_id, correct_option, correct_bool, accepted_answers,
                                  case_sensitive, ignore_extra_spaces, explanation)
    values (v_ref, v_uid, (r ->> 'correct_option')::int, (r ->> 'correct_bool')::boolean,
            coalesce(array(select jsonb_array_elements_text(coalesce(r -> 'accepted_answers', '[]'))), '{}'),
            coalesce((r ->> 'case_sensitive')::boolean, false),
            coalesce((r ->> 'ignore_extra_spaces')::boolean, true),
            coalesce(r ->> 'explanation', ''));
    c_keys := c_keys + 1;
  end loop;

  -- Класи для колеса опитування (у файлах старіших версій цього розділу немає)
  for r in select * from jsonb_array_elements(coalesce(d -> 'wheel_groups', '[]')) loop
    insert into pth_wheel_groups (owner_id, title, students, sort_order)
    values (v_uid, r ->> 'title', coalesce(r -> 'students', '[]'), coalesce((r ->> 'sort_order')::int, 0));
    c_wheel := c_wheel + 1;
  end loop;

  -- Після імпорту акаунт вважається ініціалізованим (щоб не з'явились дублікати тем).
  insert into pth_profiles (id, initialized_at) values (v_uid, now())
  on conflict (id) do update set initialized_at = coalesce(pth_profiles.initialized_at, now());

  return jsonb_build_object(
    'classes', c_classes, 'sections', c_sections, 'topics', c_topics, 'topic_content', c_content,
    'materials', c_materials, 'formulas', c_formulas, 'notes', c_notes, 'quizzes', c_quizzes,
    'quiz_questions', c_questions, 'quiz_answer_keys', c_keys,
    'wheel_groups', c_wheel
  );
end;
$$;
