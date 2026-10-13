-- =====================================================================
-- Physics Teacher Hub — міграція 1: схема, обмеження, індекси, RLS
-- Виконуйте у Supabase → SQL Editor ПЕРШОЮ.
-- =====================================================================
-- Принцип власності:
--   * кожна таблиця має owner_id (за замовчуванням auth.uid());
--   * батьківські таблиці мають UNIQUE (id, owner_id), а дочірні посилаються
--     складеним ключем (parent_id, owner_id). Тому дочірній запис фізично
--     не може посилатися на запис іншого користувача — навіть в обхід RLS;
--   * RLS увімкнено на кожній таблиці; доступ має лише власник.
-- =====================================================================

-- ---------- Допоміжна функція: оновлення updated_at -------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- clock_timestamp() дає унікальний час навіть у межах однієї транзакції;
  -- це поле використовується для виявлення конфліктів редагування.
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

-- ---------- Профілі ----------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text check (display_name is null or char_length(display_name) <= 120),
  initialized_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- Класи ------------------------------------------------------
create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

-- ---------- Розділи ----------------------------------------------------
create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id    uuid not null,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  sort_order  integer not null default 0,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (class_id, owner_id) references public.classes (id, owner_id) on delete cascade
);
-- Лише один «поточний розділ» на користувача.
create unique index sections_one_current_per_owner on public.sections (owner_id) where is_current;

-- ---------- Теми -------------------------------------------------------
create table public.topics (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section_id  uuid not null,
  title       text not null check (char_length(btrim(title)) between 1 and 300),
  description text not null default '' check (char_length(description) <= 5000),
  icon        text check (icon is null or icon ~ '^[a-z0-9-]{1,40}$'),
  image_url   text check (image_url is null or (image_url ~* '^https?://' and char_length(image_url) <= 2048)),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (section_id, owner_id) references public.sections (id, owner_id) on delete cascade
);

-- ---------- Огляд і теорія теми (1:1) ----------------------------------
create table public.topic_content (
  topic_id     uuid primary key,
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  summary      text not null default '' check (char_length(summary) <= 10000),
  key_concepts text[] not null default '{}' check (cardinality(key_concepts) <= 100),
  definitions  jsonb not null default '[]'::jsonb check (jsonb_typeof(definitions) = 'array'),
  objectives   text[] not null default '{}' check (cardinality(objectives) <= 100),
  theory_html  text not null default '' check (char_length(theory_html) <= 500000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (topic_id, owner_id) references public.topics (id, owner_id) on delete cascade
);

-- ---------- Матеріали --------------------------------------------------
-- topic_id = NULL означає «Скарбничка матеріалів» (нерозподілене).
create table public.materials (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id      uuid,
  type          text not null check (type in (
                  'presentation','video','document','quiz','game','simulation',
                  'experiment','test','control_work','formula','summary','link','other')),
  title         text not null check (char_length(btrim(title)) between 1 and 300),
  url           text check (url is null or (url ~* '^https?://[^\s]+$' and char_length(url) <= 2048)),
  description   text not null default '' check (char_length(description) <= 5000),
  provider      text check (provider is null or char_length(provider) <= 40),
  thumbnail_url text check (thumbnail_url is null or thumbnail_url ~* '^https://'),
  content_html  text not null default '' check (char_length(content_html) <= 300000),
  tags          text[] not null default '{}' check (cardinality(tags) <= 20),
  visibility    text not null default 'teacher' check (visibility in ('teacher','students')),
  is_favorite   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Зовнішні ресурси мусять мати URL; письмові (тест, конспект тощо) — ні.
  constraint materials_url_required check (
    url is not null
    or type in ('experiment','test','control_work','formula','summary','other')
  ),
  -- При видаленні теми матеріал НЕ зникає, а переходить у Скарбничку.
  foreign key (topic_id, owner_id) references public.topics (id, owner_id) on delete set null (topic_id)
);

-- ---------- Формули ----------------------------------------------------
create table public.formulas (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id       uuid,
  name           text not null check (char_length(btrim(name)) between 1 and 200),
  latex          text not null check (char_length(btrim(latex)) between 1 and 2000),
  explanation    text not null default '' check (char_length(explanation) <= 5000),
  quantities     jsonb not null default '[]'::jsonb check (jsonb_typeof(quantities) = 'array'),
  units          text not null default '' check (char_length(units) <= 1000),
  example        text not null default '' check (char_length(example) <= 5000),
  calculator_key text check (calculator_key is null or calculator_key ~ '^[a-z0-9_]{1,40}$'),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (topic_id, owner_id) references public.topics (id, owner_id) on delete set null (topic_id)
);

-- ---------- Нотатки вчителя (приватні) ---------------------------------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id   uuid not null,
  title      text not null check (char_length(btrim(title)) between 1 and 200),
  body_html  text not null default '' check (char_length(body_html) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (topic_id, owner_id) references public.topics (id, owner_id) on delete cascade
);

-- ---------- Вбудовані квізи --------------------------------------------
create table public.quizzes (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic_id          uuid,
  title             text not null check (char_length(btrim(title)) between 1 and 200),
  description       text not null default '' check (char_length(description) <= 2000),
  -- 'each' — перевірка після кожного питання (кнопкою вчителя), 'end' — результати в кінці.
  reveal_mode       text not null default 'end' check (reveal_mode in ('each','end')),
  show_explanations boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (topic_id, owner_id) references public.topics (id, owner_id) on delete set null (topic_id)
);

-- Дані питання, які можна показувати учням (без правильних відповідей).
create table public.quiz_questions (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id    uuid not null,
  qtype      text not null check (qtype in ('multiple_choice','true_false','short_answer')),
  prompt     text not null check (char_length(btrim(prompt)) between 1 and 2000),
  options    jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  image_url  text check (image_url is null or (image_url ~* '^https?://' and char_length(image_url) <= 2048)),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_questions_mc_options check (
    qtype <> 'multiple_choice' or jsonb_array_length(options) between 2 and 6
  ),
  unique (id, owner_id),
  foreign key (quiz_id, owner_id) references public.quizzes (id, owner_id) on delete cascade
);

-- Ключі відповідей — окрема таблиця, яку НЕ завантажує режим проходження квізу.
create table public.quiz_answer_keys (
  question_id         uuid primary key,
  owner_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  correct_option      integer check (correct_option is null or correct_option between 0 and 5),
  correct_bool        boolean,
  accepted_answers    text[] not null default '{}' check (cardinality(accepted_answers) <= 20),
  case_sensitive      boolean not null default false,
  ignore_extra_spaces boolean not null default true,
  explanation         text not null default '' check (char_length(explanation) <= 3000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (question_id, owner_id) references public.quiz_questions (id, owner_id) on delete cascade
);

-- ---------- Індекси ----------------------------------------------------
create index classes_owner_idx        on public.classes (owner_id, sort_order);
create index sections_owner_idx       on public.sections (owner_id);
create index sections_class_idx       on public.sections (class_id, sort_order);
create index topics_owner_idx         on public.topics (owner_id);
create index topics_section_idx       on public.topics (section_id, sort_order);
create index topic_content_owner_idx  on public.topic_content (owner_id);
create index materials_owner_idx      on public.materials (owner_id, created_at desc);
create index materials_topic_idx      on public.materials (topic_id);
create index materials_type_idx       on public.materials (owner_id, type);
create index materials_tags_idx       on public.materials using gin (tags);
create index materials_fav_idx        on public.materials (owner_id) where is_favorite;
create index formulas_owner_idx       on public.formulas (owner_id);
create index formulas_topic_idx       on public.formulas (topic_id);
create index notes_owner_idx          on public.notes (owner_id);
create index notes_topic_idx          on public.notes (topic_id);
create index quizzes_owner_idx        on public.quizzes (owner_id);
create index quizzes_topic_idx        on public.quizzes (topic_id);
create index quiz_questions_quiz_idx  on public.quiz_questions (quiz_id, sort_order);
create index quiz_questions_owner_idx on public.quiz_questions (owner_id);
create index quiz_keys_owner_idx      on public.quiz_answer_keys (owner_id);

-- ---------- Тригери updated_at -----------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','classes','sections','topics','topic_content','materials',
                           'formulas','notes','quizzes','quiz_questions','quiz_answer_keys']
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end;
$$;

-- ---------- Профіль для кожного нового користувача ---------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security -----------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Видалення профілю — лише разом з акаунтом (каскадно), тому DELETE-політики немає.

do $$
declare t text;
begin
  foreach t in array array['classes','sections','topics','topic_content','materials',
                           'formulas','notes','quizzes','quiz_questions','quiz_answer_keys']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (owner_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (owner_id = (select auth.uid()))',
      t || '_delete_own', t);
    -- Анонімні відвідувачі не мають жодного доступу до даних.
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end;
$$;

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;
