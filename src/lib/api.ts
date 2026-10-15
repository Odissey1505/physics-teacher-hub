import { db } from "./supabase";
import { ConflictError, NotFoundError } from "./errors";
import type {
  ClassRow,
  Formula,
  GradeResult,
  Material,
  Note,
  Profile,
  Quiz,
  QuizAnswerKey,
  QuizQuestion,
  Section,
  Topic,
  TopicContent,
} from "./types";

export type TableName =
  | "classes"
  | "sections"
  | "topics"
  | "topic_content"
  | "materials"
  | "formulas"
  | "notes"
  | "quizzes"
  | "quiz_questions"
  | "quiz_answer_keys";

const PAGE = 1000;

/**
 * Усі таблиці й функції Physics Teacher Hub у базі мають префікс pth_ — так застосунок
 * може жити в одному проєкті Supabase з іншими застосунками без конфліктів назв.
 * У коді та у файлах резервних копій використовуються назви без префікса.
 */
export const DB_PREFIX = "pth_";
const tbl = (name: TableName | "profiles") => db().from(`${DB_PREFIX}${name}`);

/** Завантажує всі записи користувача (RLS повертає лише власні) з посторінковою вибіркою. */
export async function fetchAll<T>(
  table: TableName,
  order: { column: string; ascending?: boolean }[] = [{ column: "created_at" }],
  filter?: { column: string; value: string },
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = tbl(table).select("*");
    if (filter) q = q.eq(filter.column, filter.value);
    for (const o of order) q = q.order(o.column, { ascending: o.ascending ?? true });
    q = q.order(table === "topic_content" ? "topic_id" : table === "quiz_answer_keys" ? "question_id" : "id");
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export const fetchClasses = () => fetchAll<ClassRow>("classes", [{ column: "sort_order" }, { column: "created_at" }]);
export const fetchSections = () => fetchAll<Section>("sections", [{ column: "sort_order" }, { column: "created_at" }]);
export const fetchTopics = () => fetchAll<Topic>("topics", [{ column: "sort_order" }, { column: "created_at" }]);
export const fetchMaterials = () => fetchAll<Material>("materials", [{ column: "created_at", ascending: false }]);
export const fetchFormulas = () => fetchAll<Formula>("formulas", [{ column: "sort_order" }, { column: "created_at" }]);
export const fetchNotes = () => fetchAll<Note>("notes", [{ column: "created_at", ascending: false }]);
export const fetchQuizzes = () => fetchAll<Quiz>("quizzes", [{ column: "created_at", ascending: false }]);

export async function fetchTopicContent(topicId: string): Promise<TopicContent | null> {
  const { data, error } = await tbl("topic_content").select("*").eq("topic_id", topicId).maybeSingle();
  if (error) throw error;
  return data as TopicContent | null;
}

/** Питання без ключів відповідей — безпечно для режиму проходження/презентації. */
export async function fetchQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
  return fetchAll<QuizQuestion>("quiz_questions", [{ column: "sort_order" }], { column: "quiz_id", value: quizId });
}

/** Ключі відповідей — ЛИШЕ для редактора квізу або явного «Показати відповідь». */
export async function fetchAnswerKeys(questionIds: string[]): Promise<QuizAnswerKey[]> {
  if (questionIds.length === 0) return [];
  const { data, error } = await tbl("quiz_answer_keys").select("*").in("question_id", questionIds);
  if (error) throw error;
  return (data ?? []) as QuizAnswerKey[];
}

export async function fetchProfile(): Promise<Profile | null> {
  const { data: u } = await db().auth.getUser();
  if (!u.user) return null;
  const { data, error } = await tbl("profiles").select("*").eq("id", u.user.id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(patch: Partial<Pick<Profile, "display_name">>) {
  const { data: u } = await db().auth.getUser();
  if (!u.user) throw new Error("Потрібна авторизація");
  const { error } = await tbl("profiles").upsert({ id: u.user.id, ...patch });
  if (error) throw error;
}

/* ---------------- Загальні CRUD ---------------- */

export async function insertRow<T>(table: TableName, values: Record<string, unknown>): Promise<T> {
  const { data, error } = await tbl(table).insert(values).select().single();
  if (error) throw error;
  return data as T;
}

/**
 * Оновлення з оптимістичною перевіркою версії: запис оновлюється лише якщо
 * updated_at у базі збігається з тим, що бачив користувач. Інакше — ConflictError,
 * і новіші зміни з іншого пристрою не перезаписуються мовчки.
 */
export async function updateVersioned<T>(
  table: TableName,
  id: string,
  expectedUpdatedAt: string,
  patch: Record<string, unknown>,
  idColumn = "id",
): Promise<T> {
  const { data, error } = await tbl(table)
    .update(patch)
    .eq(idColumn, id)
    .eq("updated_at", expectedUpdatedAt)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current, error: e2 } = await tbl(table).select(idColumn).eq(idColumn, id).maybeSingle();
    if (e2) throw e2;
    if (!current) throw new NotFoundError();
    throw new ConflictError();
  }
  return data as T;
}

/** Поточна версія запису — для явного «Зберегти мої зміни поверх» після конфлікту. */
export async function fetchUpdatedAt(table: TableName, id: string, idColumn = "id"): Promise<string> {
  const { data, error } = await tbl(table).select("updated_at").eq(idColumn, id).maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError();
  return (data as { updated_at: string }).updated_at;
}

/** Просте оновлення одного-двох полів (обране, переміщення) — без перевірки версії. */
export async function patchRow(table: TableName, id: string, patch: Record<string, unknown>) {
  const { data, error } = await tbl(table).update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new NotFoundError();
}

export async function patchMany(table: TableName, ids: string[], patch: Record<string, unknown>) {
  if (ids.length === 0) return;
  const { error } = await tbl(table).update(patch).in("id", ids);
  if (error) throw error;
}

export async function deleteRow(table: TableName, id: string) {
  const { error } = await tbl(table).delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Теорія та огляд теми ---------------- */

export async function saveTopicContent(
  topicId: string,
  expectedUpdatedAt: string | null,
  patch: Partial<Omit<TopicContent, "topic_id" | "owner_id" | "created_at" | "updated_at">>,
): Promise<TopicContent> {
  if (expectedUpdatedAt) {
    return updateVersioned<TopicContent>("topic_content", topicId, expectedUpdatedAt, patch, "topic_id");
  }
  const { data, error } = await tbl("topic_content")
    .insert({ topic_id: topicId, ...patch })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new ConflictError(); // уже створено на іншому пристрої
    throw error;
  }
  return data as TopicContent;
}

/* ---------------- Матеріали ---------------- */

export async function duplicateMaterial(m: Material): Promise<Material> {
  return insertRow<Material>("materials", {
    topic_id: m.topic_id,
    type: m.type,
    title: `${m.title} (копія)`.slice(0, 300),
    url: m.url,
    description: m.description,
    provider: m.provider,
    thumbnail_url: m.thumbnail_url,
    content_html: m.content_html,
    tags: m.tags,
    visibility: m.visibility,
    is_favorite: false,
    sort_order: m.sort_order,
  });
}

export async function duplicateFormula(f: Formula): Promise<Formula> {
  return insertRow<Formula>("formulas", {
    topic_id: f.topic_id,
    name: `${f.name} (копія)`.slice(0, 200),
    latex: f.latex,
    explanation: f.explanation,
    quantities: f.quantities,
    units: f.units,
    example: f.example,
    calculator_key: f.calculator_key,
    sort_order: f.sort_order + 1,
  });
}

/* ---------------- Режим презентації ---------------- */

export interface PresentationData {
  content: Pick<TopicContent, "summary" | "key_concepts" | "definitions" | "objectives" | "theory_html"> | null;
  materials: Pick<Material, "id" | "type" | "title" | "url" | "description" | "content_html" | "provider" | "sort_order" | "created_at">[];
  formulas: Pick<Formula, "id" | "name" | "latex" | "explanation" | "quantities" | "units">[];
  quizzes: Pick<Quiz, "id" | "title">[];
  questions: QuizQuestion[];
}

/**
 * Дані для класного екрана. Запитуються ЛИШЕ поля, призначені для показу:
 * матеріали з видимістю «Можна демонструвати учням», без нотаток вчителя
 * і без ключів відповідей. Приватне просто не потрапляє у браузер цієї сторінки.
 */
export async function fetchPresentationData(topicId: string): Promise<PresentationData> {
  const [content, materials, formulas, quizzes] = await Promise.all([
    tbl("topic_content").select("summary,key_concepts,definitions,objectives,theory_html").eq("topic_id", topicId).maybeSingle(),
    tbl("materials")
      .select("id,type,title,url,description,content_html,provider,sort_order,created_at")
      .eq("topic_id", topicId)
      .eq("visibility", "students")
      .order("sort_order")
      .order("created_at"),
    tbl("formulas").select("id,name,latex,explanation,quantities,units").eq("topic_id", topicId).order("sort_order").order("created_at"),
    tbl("quizzes").select("id,title").eq("topic_id", topicId).order("created_at"),
  ]);
  for (const r of [content, materials, formulas, quizzes]) if (r.error) throw r.error;
  const quizIds = (quizzes.data ?? []).map((q) => q.id as string);
  let questions: QuizQuestion[] = [];
  if (quizIds.length) {
    const { data, error } = await tbl("quiz_questions")
      .select("id,owner_id,quiz_id,qtype,prompt,options,image_url,sort_order,created_at,updated_at")
      .in("quiz_id", quizIds)
      .order("sort_order");
    if (error) throw error;
    questions = (data ?? []) as QuizQuestion[];
  }
  return {
    content: content.data as PresentationData["content"],
    materials: (materials.data ?? []) as PresentationData["materials"],
    formulas: (formulas.data ?? []) as PresentationData["formulas"],
    quizzes: (quizzes.data ?? []) as PresentationData["quizzes"],
    questions,
  };
}

/* ---------------- RPC ---------------- */

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(`${DB_PREFIX}${fn}`, args);
  if (error) throw error;
  return data as T;
}

export const initializeWorkspace = () => rpc<boolean>("initialize_workspace");
export const reorderItems = (kind: "topics" | "sections" | "classes" | "quiz_questions", ids: string[]) =>
  rpc<void>("reorder_items", { p_kind: kind, p_ids: ids });
export const setCurrentSection = (sectionId: string) => rpc<void>("set_current_section", { p_section_id: sectionId });
export const deleteContainer = (kind: "topic" | "section" | "class", id: string, mode: "inbox" | "all") =>
  rpc<{ deleted_materials: number; deleted_formulas: number; deleted_quizzes: number }>("delete_container", {
    p_kind: kind,
    p_id: id,
    p_mode: mode,
  });
export const duplicateTopic = (id: string) => rpc<string>("duplicate_topic", { p_topic_id: id });
export const duplicateQuiz = (id: string) => rpc<string>("duplicate_quiz", { p_quiz_id: id });
export const gradeAnswer = (questionId: string, answer: unknown) =>
  rpc<GradeResult>("grade_quiz_answer", { p_question_id: questionId, p_answer: answer });
export const saveQuizQuestion = (quizId: string, question: Record<string, unknown>, key: Record<string, unknown>) =>
  rpc<QuizQuestion>("save_quiz_question", { p_quiz_id: quizId, p_question: question, p_key: key });
export const importWorkspace = (payload: unknown, mode: "merge" | "replace") =>
  rpc<Record<string, number>>("import_workspace", { p_payload: payload, p_mode: mode });
