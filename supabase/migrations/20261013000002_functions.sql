-- =====================================================================
-- Physics Teacher Hub — міграція 2: серверні функції (RPC)
-- Виконуйте у Supabase → SQL Editor ДРУГОЮ, після 20261013000001_schema.sql.
-- =====================================================================
-- Усі функції — SECURITY INVOKER: вони виконуються з правами користувача,
-- тому RLS-політики з міграції 1 діють і тут. Кожна функція — одна транзакція.
-- =====================================================================

-- ---------- 1. Початкове наповнення (ідемпотентне) ---------------------
-- Створює «9 клас → Розділ 1 → 15 тем» рівно один раз на акаунт.
-- Позначка pth_profiles.initialized_at гарантує, що повторний вхід, оновлення
-- сторінки чи видалення тем НЕ створять дані знову. FOR UPDATE блокує
-- одночасні виклики з двох вкладок.
create or replace function public.pth_initialize_workspace()
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_done    timestamptz;
  v_class   uuid;
  v_section uuid;
  v_titles  text[] := array[
    'Магнітні явища. Постійні магніти. Взаємодія магнітів.',
    'Магнітне поле. Лінії магнітного поля.',
    'Магнітне поле Землі.',
    'Сонячна активність та її вплив на магнітне поле Землі.',
    'Магнітні явища в атмосфері Землі та космічному просторі.',
    'Вплив магнітного поля на живі організми.',
    'Дослід Ерстеда. Магнітне поле провідника зі струмом.',
    'Дія магнітного поля на провідник зі струмом та рухомі заряди.',
    'Магнітні властивості речовин та їх застосування.',
    'Електромагніти.',
    'Магнітна левітація.',
    'Електродвигуни та їх використання.',
    'Електровимірювальні прилади.',
    'Явище електромагнітної індукції.',
    'Повторення розділу. Підготовка до контрольної роботи.'
  ];
  i integer;
begin
  if v_uid is null then
    raise exception 'Потрібна авторизація' using errcode = '28000';
  end if;
  if not public.pth_has_access() then
    raise exception 'PTH_NO_ACCESS' using errcode = '42501',
      hint = 'Цей акаунт не має доступу до Physics Teacher Hub.';
  end if;

  insert into pth_profiles (id) values (v_uid) on conflict (id) do nothing;
  select initialized_at into v_done from pth_profiles where id = v_uid for update;

  if v_done is not null then
    return false; -- уже ініціалізовано раніше
  end if;

  insert into pth_classes (owner_id, title, sort_order)
  values (v_uid, '9 клас', 0)
  returning id into v_class;

  insert into pth_sections (owner_id, class_id, title, description, sort_order, is_current)
  values (v_uid, v_class, 'Розділ 1. Електромагнітні явища',
          'Магнітне поле, його дія на провідники зі струмом і рухомі заряди, електромагніти, електродвигуни та електромагнітна індукція.',
          0, true)
  returning id into v_section;

  for i in 1 .. array_length(v_titles, 1) loop
    insert into pth_topics (owner_id, section_id, title, sort_order)
    values (v_uid, v_section, v_titles[i], i - 1);
  end loop;

  update pth_profiles set initialized_at = now() where id = v_uid;
  return true;
end;
$$;

-- ---------- 2. Сортування (drag-and-drop) ------------------------------
create or replace function public.pth_reorder_items(p_kind text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Потрібна авторизація' using errcode = '28000';
  end if;
  if p_kind = 'topics' then
    update pth_topics t set sort_order = x.ord - 1
      from unnest(p_ids) with ordinality as x(id, ord) where t.id = x.id;
  elsif p_kind = 'sections' then
    update pth_sections t set sort_order = x.ord - 1
      from unnest(p_ids) with ordinality as x(id, ord) where t.id = x.id;
  elsif p_kind = 'classes' then
    update pth_classes t set sort_order = x.ord - 1
      from unnest(p_ids) with ordinality as x(id, ord) where t.id = x.id;
  elsif p_kind = 'quiz_questions' then
    update pth_quiz_questions t set sort_order = x.ord - 1
      from unnest(p_ids) with ordinality as x(id, ord) where t.id = x.id;
  else
    raise exception 'Невідомий тип сортування: %', p_kind;
  end if;
end;
$$;

-- ---------- 3. Поточний розділ ----------------------------------------
create or replace function public.pth_set_current_section(p_section_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from pth_sections where id = p_section_id) then
    raise exception 'Розділ не знайдено';
  end if;
  update pth_sections set is_current = false where is_current and id <> p_section_id;
  update pth_sections set is_current = true where id = p_section_id;
end;
$$;

-- ---------- 4. Безпечне видалення класу / розділу / теми -----------------
-- p_mode = 'inbox': матеріали переходять у Скарбничку, формули та квізи
--                   залишаються в загальних списках без прив'язки до теми;
--                   теорія та нотатки тем видаляються.
-- p_mode = 'all':   додатково видаляються матеріали, формули та квізи цих тем.
create or replace function public.pth_delete_container(p_kind text, p_id uuid, p_mode text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_topics uuid[];
  v_materials integer := 0;
  v_formulas integer := 0;
  v_quizzes integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Потрібна авторизація' using errcode = '28000';
  end if;
  if p_mode not in ('inbox', 'all') then
    raise exception 'Невідомий режим видалення: %', p_mode;
  end if;

  if p_kind = 'topic' then
    select array_agg(id) into v_topics from pth_topics where id = p_id;
  elsif p_kind = 'section' then
    select array_agg(id) into v_topics from pth_topics where section_id = p_id;
  elsif p_kind = 'class' then
    select array_agg(t.id) into v_topics
      from pth_topics t join pth_sections s on s.id = t.section_id where s.class_id = p_id;
  else
    raise exception 'Невідомий тип: %', p_kind;
  end if;
  v_topics := coalesce(v_topics, '{}');

  if p_mode = 'all' then
    delete from pth_materials where topic_id = any (v_topics);
    get diagnostics v_materials = row_count;
    delete from pth_formulas where topic_id = any (v_topics);
    get diagnostics v_formulas = row_count;
    delete from pth_quizzes where topic_id = any (v_topics);
    get diagnostics v_quizzes = row_count;
  end if;

  if p_kind = 'topic' then
    delete from pth_topics where id = p_id;
  elsif p_kind = 'section' then
    delete from pth_sections where id = p_id;
  else
    delete from pth_classes where id = p_id;
  end if;
  if not found then
    raise exception 'Запис не знайдено або немає доступу';
  end if;

  return jsonb_build_object('deleted_materials', v_materials,
                            'deleted_formulas', v_formulas,
                            'deleted_quizzes', v_quizzes);
end;
$$;

-- ---------- 5. Копіювання квізу (з питаннями та ключами) -----------------
create or replace function public.pth_copy_quiz_internal(p_quiz_id uuid, p_topic_id uuid, p_title text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quiz pth_quizzes%rowtype;
  v_new  uuid := gen_random_uuid();
  v_q    pth_quiz_questions%rowtype;
  v_nq   uuid;
begin
  select * into v_quiz from pth_quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Квіз не знайдено';
  end if;

  insert into pth_quizzes (id, owner_id, topic_id, title, description, reveal_mode, show_explanations)
  values (v_new, v_quiz.owner_id, p_topic_id, left(p_title, 200), v_quiz.description,
          v_quiz.reveal_mode, v_quiz.show_explanations);

  for v_q in select * from pth_quiz_questions where quiz_id = p_quiz_id order by sort_order loop
    v_nq := gen_random_uuid();
    insert into pth_quiz_questions (id, owner_id, quiz_id, qtype, prompt, options, image_url, sort_order)
    values (v_nq, v_q.owner_id, v_new, v_q.qtype, v_q.prompt, v_q.options, v_q.image_url, v_q.sort_order);

    insert into pth_quiz_answer_keys (question_id, owner_id, correct_option, correct_bool, accepted_answers,
                                  case_sensitive, ignore_extra_spaces, explanation)
    select v_nq, owner_id, correct_option, correct_bool, accepted_answers,
           case_sensitive, ignore_extra_spaces, explanation
      from pth_quiz_answer_keys where question_id = v_q.id;
  end loop;

  return v_new;
end;
$$;
revoke all on function public.pth_copy_quiz_internal(uuid, uuid, text) from public, anon;

create or replace function public.pth_duplicate_quiz(p_quiz_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare v_quiz pth_quizzes%rowtype;
begin
  select * into v_quiz from pth_quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Квіз не знайдено';
  end if;
  return pth_copy_quiz_internal(p_quiz_id, v_quiz.topic_id, v_quiz.title || ' (копія)');
end;
$$;

-- ---------- 6. Дублювання теми з усім вмістом ----------------------------
create or replace function public.pth_duplicate_topic(p_topic_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_t   pth_topics%rowtype;
  v_new uuid := gen_random_uuid();
  v_qz  record;
begin
  select * into v_t from pth_topics where id = p_topic_id;
  if not found then
    raise exception 'Тему не знайдено';
  end if;

  update pth_topics set sort_order = sort_order + 1
   where section_id = v_t.section_id and sort_order > v_t.sort_order;

  insert into pth_topics (id, owner_id, section_id, title, description, icon, image_url, sort_order)
  values (v_new, v_t.owner_id, v_t.section_id, left(v_t.title || ' (копія)', 300),
          v_t.description, v_t.icon, v_t.image_url, v_t.sort_order + 1);

  insert into pth_topic_content (topic_id, owner_id, summary, key_concepts, definitions, objectives, theory_html)
  select v_new, owner_id, summary, key_concepts, definitions, objectives, theory_html
    from pth_topic_content where topic_id = p_topic_id;

  insert into pth_materials (owner_id, topic_id, type, title, url, description, provider, thumbnail_url,
                         content_html, tags, visibility, is_favorite, sort_order)
  select owner_id, v_new, type, title, url, description, provider, thumbnail_url,
         content_html, tags, visibility, false, sort_order
    from pth_materials where topic_id = p_topic_id;

  insert into pth_formulas (owner_id, topic_id, name, latex, explanation, quantities, units, example,
                        calculator_key, sort_order)
  select owner_id, v_new, name, latex, explanation, quantities, units, example, calculator_key, sort_order
    from pth_formulas where topic_id = p_topic_id;

  insert into pth_notes (owner_id, topic_id, title, body_html)
  select owner_id, v_new, title, body_html from pth_notes where topic_id = p_topic_id;

  for v_qz in select id, title from pth_quizzes where topic_id = p_topic_id loop
    perform pth_copy_quiz_internal(v_qz.id, v_new, v_qz.title);
  end loop;

  return v_new;
end;
$$;

-- ---------- 7. Перевірка відповіді на питання квізу ------------------------
-- Клієнт у режимі проходження НЕ отримує ключі. Він надсилає відповідь,
-- а функція повертає лише результат (і правильну відповідь — після спроби).
-- Правила для короткої відповіді:
--   * ignore_extra_spaces: обрізаються пробіли на краях, кілька пробілів → один;
--   * case_sensitive = false: регістр не враховується;
--   * апострофи ’ ʼ ` прирівнюються до ';
--   * відповідь має ТОЧНО збігтися з одним із допустимих варіантів.
create or replace function public.pth_normalize_short_answer(p_text text, p_case boolean, p_spaces boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_case then v else lower(v) end
  from (
    select case
             when p_spaces then btrim(regexp_replace(translate(coalesce(p_text, ''), '’ʼ`', ''''''''), '\s+', ' ', 'g'))
             else translate(coalesce(p_text, ''), '’ʼ`', '''''''')
           end as v
  ) s;
$$;

create or replace function public.pth_grade_quiz_answer(p_question_id uuid, p_answer jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_type    text;
  v_options jsonb;
  v_key     pth_quiz_answer_keys%rowtype;
  v_correct boolean := false;
  v_answer_text text;
  v_display text;
begin
  select q.qtype, q.options into v_type, v_options from pth_quiz_questions q where q.id = p_question_id;
  if not found then
    raise exception 'Питання не знайдено';
  end if;
  select * into v_key from pth_quiz_answer_keys where question_id = p_question_id;
  if not found then
    raise exception 'Для цього питання не задано правильну відповідь';
  end if;

  if v_type = 'multiple_choice' then
    if jsonb_typeof(p_answer) = 'number' then
      v_correct := (p_answer #>> '{}')::numeric = v_key.correct_option;
    end if;
    v_display := v_options ->> v_key.correct_option;
  elsif v_type = 'true_false' then
    if jsonb_typeof(p_answer) = 'boolean' then
      v_correct := (p_answer #>> '{}')::boolean = v_key.correct_bool;
    end if;
    v_display := case when v_key.correct_bool then 'Правда' else 'Неправда' end;
  else
    if jsonb_typeof(p_answer) = 'string' then
      v_answer_text := pth_normalize_short_answer(p_answer #>> '{}', v_key.case_sensitive, v_key.ignore_extra_spaces);
      v_correct := v_answer_text <> '' and exists (
        select 1 from unnest(v_key.accepted_answers) a
         where pth_normalize_short_answer(a, v_key.case_sensitive, v_key.ignore_extra_spaces) = v_answer_text
      );
    end if;
    v_display := array_to_string(v_key.accepted_answers, ' / ');
  end if;

  return jsonb_build_object(
    'correct', coalesce(v_correct, false),
    'correct_answer', v_display,
    'explanation', v_key.explanation
  );
end;
$$;

-- ---------- 7б. Атомарне збереження питання разом із ключем ---------------
-- p_question: { id?, updated_at?, qtype, prompt, options, image_url }
-- p_key:      { correct_option?, correct_bool?, accepted_answers?, case_sensitive?,
--               ignore_extra_spaces?, explanation? }
-- Якщо передано updated_at і запис змінено на іншому пристрої — помилка CONFLICT.
create or replace function public.pth_save_quiz_question(p_quiz_id uuid, p_question jsonb, p_key jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id      uuid := nullif(p_question ->> 'id', '')::uuid;
  v_type    text := p_question ->> 'qtype';
  v_options jsonb := coalesce(p_question -> 'options', '[]'::jsonb);
  v_row     pth_quiz_questions%rowtype;
  v_opt     integer := (p_key ->> 'correct_option')::int;
  v_bool    boolean := (p_key ->> 'correct_bool')::boolean;
  v_acc     text[] := coalesce(array(
                select btrim(x) from jsonb_array_elements_text(coalesce(p_key -> 'accepted_answers', '[]')) x
                 where btrim(x) <> ''), '{}');
begin
  if auth.uid() is null then
    raise exception 'Потрібна авторизація' using errcode = '28000';
  end if;
  if not exists (select 1 from pth_quizzes where id = p_quiz_id) then
    raise exception 'Квіз не знайдено';
  end if;
  if v_type = 'multiple_choice' then
    if v_opt is null or v_opt < 0 or v_opt >= jsonb_array_length(v_options) then
      raise exception 'Позначте правильний варіант відповіді';
    end if;
  elsif v_type = 'true_false' then
    if v_bool is null then
      raise exception 'Оберіть правильну відповідь: правда чи неправда';
    end if;
    v_options := '[]'::jsonb;
  elsif v_type = 'short_answer' then
    if cardinality(v_acc) = 0 then
      raise exception 'Додайте хоча б одну допустиму відповідь';
    end if;
    v_options := '[]'::jsonb;
  else
    raise exception 'Невідомий тип питання';
  end if;

  if v_id is null then
    insert into pth_quiz_questions (quiz_id, qtype, prompt, options, image_url, sort_order)
    values (p_quiz_id, v_type, p_question ->> 'prompt', v_options, nullif(p_question ->> 'image_url', ''),
            coalesce((select max(sort_order) + 1 from pth_quiz_questions where quiz_id = p_quiz_id), 0))
    returning * into v_row;
  else
    update pth_quiz_questions
       set qtype = v_type, prompt = p_question ->> 'prompt', options = v_options,
           image_url = nullif(p_question ->> 'image_url', '')
     where id = v_id and quiz_id = p_quiz_id
       and (p_question ->> 'updated_at' is null or updated_at = (p_question ->> 'updated_at')::timestamptz)
    returning * into v_row;
    if not found then
      if exists (select 1 from pth_quiz_questions where id = v_id) then
        raise exception 'CONFLICT' using errcode = '40001',
          hint = 'Питання змінено на іншому пристрої. Оновіть сторінку.';
      end if;
      raise exception 'Питання не знайдено';
    end if;
  end if;

  insert into pth_quiz_answer_keys (question_id, correct_option, correct_bool, accepted_answers,
                                case_sensitive, ignore_extra_spaces, explanation)
  values (v_row.id,
          case when v_type = 'multiple_choice' then v_opt end,
          case when v_type = 'true_false' then v_bool end,
          case when v_type = 'short_answer' then v_acc else '{}' end,
          coalesce((p_key ->> 'case_sensitive')::boolean, false),
          coalesce((p_key ->> 'ignore_extra_spaces')::boolean, true),
          coalesce(p_key ->> 'explanation', ''))
  on conflict (question_id) do update
     set correct_option = excluded.correct_option,
         correct_bool = excluded.correct_bool,
         accepted_answers = excluded.accepted_answers,
         case_sensitive = excluded.case_sensitive,
         ignore_extra_spaces = excluded.ignore_extra_spaces,
         explanation = excluded.explanation;

  return to_jsonb(v_row);
end;
$$;

-- ---------- 8. Атомарний імпорт резервної копії ----------------------------
-- p_mode = 'merge'   — додає імпортовані записи до наявних (нові id);
-- p_mode = 'replace' — спершу видаляє ВСІ дані користувача, потім імпортує.
-- Будь-яка помилка скасовує весь імпорт (усе або нічого).
-- owner_id з файлу ігнорується: усе належатиме поточному користувачу.
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
  c_questions int := 0; c_keys int := 0;
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

  -- Після імпорту акаунт вважається ініціалізованим (щоб не з'явились дублікати тем).
  insert into pth_profiles (id, initialized_at) values (v_uid, now())
  on conflict (id) do update set initialized_at = coalesce(pth_profiles.initialized_at, now());

  return jsonb_build_object(
    'classes', c_classes, 'sections', c_sections, 'topics', c_topics, 'topic_content', c_content,
    'materials', c_materials, 'formulas', c_formulas, 'notes', c_notes, 'quizzes', c_quizzes,
    'quiz_questions', c_questions, 'quiz_answer_keys', c_keys
  );
end;
$$;

-- ---------- Права на виконання ----------------------------------------------
revoke all on function public.pth_initialize_workspace()                    from public, anon;
revoke all on function public.pth_reorder_items(text, uuid[])               from public, anon;
revoke all on function public.pth_set_current_section(uuid)                 from public, anon;
revoke all on function public.pth_delete_container(text, uuid, text)        from public, anon;
revoke all on function public.pth_duplicate_quiz(uuid)                      from public, anon;
revoke all on function public.pth_duplicate_topic(uuid)                     from public, anon;
revoke all on function public.pth_grade_quiz_answer(uuid, jsonb)            from public, anon;
revoke all on function public.pth_import_workspace(jsonb, text)             from public, anon;
revoke all on function public.pth_save_quiz_question(uuid, jsonb, jsonb)    from public, anon;

grant execute on function public.pth_initialize_workspace()                 to authenticated;
grant execute on function public.pth_reorder_items(text, uuid[])            to authenticated;
grant execute on function public.pth_set_current_section(uuid)              to authenticated;
grant execute on function public.pth_delete_container(text, uuid, text)     to authenticated;
grant execute on function public.pth_copy_quiz_internal(uuid, uuid, text)   to authenticated;
grant execute on function public.pth_duplicate_quiz(uuid)                   to authenticated;
grant execute on function public.pth_duplicate_topic(uuid)                  to authenticated;
grant execute on function public.pth_grade_quiz_answer(uuid, jsonb)         to authenticated;
grant execute on function public.pth_import_workspace(jsonb, text)          to authenticated;
grant execute on function public.pth_save_quiz_question(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.pth_normalize_short_answer(text, boolean, boolean) to authenticated;
