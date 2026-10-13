import { z } from "zod";
import { fetchAll, type TableName } from "./api";
import type { Formula, Material, Quiz, Topic } from "./types";
import { normalizeSearch } from "./utils";

export const BACKUP_APP = "physics-teacher-hub";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024; // 20 МБ
const MAX_RECORDS = 50_000;

const TABLE_ORDER: TableName[] = [
  "classes",
  "sections",
  "topics",
  "topic_content",
  "materials",
  "formulas",
  "notes",
  "quizzes",
  "quiz_questions",
  "quiz_answer_keys",
];

export const TABLE_LABELS: Record<TableName, string> = {
  classes: "Класи",
  sections: "Розділи",
  topics: "Теми",
  topic_content: "Теорія та огляди тем",
  materials: "Матеріали",
  formulas: "Формули",
  notes: "Нотатки вчителя",
  quizzes: "Вбудовані квізи",
  quiz_questions: "Питання квізів",
  quiz_answer_keys: "Ключі відповідей",
};

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exported_at: string;
  data: Record<TableName, Record<string, unknown>[]>;
}

/** Експорт усіх даних поточного користувача (RLS гарантує, що лише власних). */
export async function exportWorkspace(): Promise<BackupFile> {
  const data = {} as BackupFile["data"];
  for (const t of TABLE_ORDER) {
    const order =
      t === "topic_content" || t === "quiz_answer_keys" ? [{ column: "created_at" }] : [{ column: "created_at" }];
    const rows = await fetchAll<Record<string, unknown>>(t, order);
    // owner_id у файл не пишемо: при імпорті власником завжди стає поточний акаунт.
    data[t] = rows.map(({ owner_id: _o, ...rest }) => rest);
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exported_at: new Date().toISOString(), data };
}

const idRow = z.object({ id: z.string().min(1) }).passthrough();
const backupSchema = z.object({
  app: z.literal(BACKUP_APP, { errorMap: () => ({ message: "Це не файл резервної копії Physics Teacher Hub" }) }),
  version: z.literal(BACKUP_VERSION, { errorMap: () => ({ message: "Непідтримувана версія файлу резервної копії" }) }),
  exported_at: z.string().optional(),
  data: z.object({
    classes: z.array(idRow.extend({ title: z.string() })).default([]),
    sections: z.array(idRow.extend({ class_id: z.string(), title: z.string() })).default([]),
    topics: z.array(idRow.extend({ section_id: z.string(), title: z.string() })).default([]),
    topic_content: z.array(z.object({ topic_id: z.string() }).passthrough()).default([]),
    materials: z.array(idRow.extend({ type: z.string(), title: z.string() })).default([]),
    formulas: z.array(idRow.extend({ name: z.string(), latex: z.string() })).default([]),
    notes: z.array(idRow.extend({ topic_id: z.string(), title: z.string() })).default([]),
    quizzes: z.array(idRow.extend({ title: z.string() })).default([]),
    quiz_questions: z.array(idRow.extend({ quiz_id: z.string(), qtype: z.string(), prompt: z.string() })).default([]),
    quiz_answer_keys: z.array(z.object({ question_id: z.string() }).passthrough()).default([]),
  }),
});

export type ParsedBackup = z.infer<typeof backupSchema>;

export function parseBackup(text: string): { ok: true; data: ParsedBackup } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "Файл пошкоджено або це не JSON." };
  }
  const res = backupSchema.safeParse(json);
  if (!res.success) {
    const issue = res.error.issues[0];
    const where = issue.path.length ? ` (поле: ${issue.path.join(".")})` : "";
    return { ok: false, error: `${issue.message}${where}` };
  }
  const total = Object.values(res.data.data).reduce((s, arr) => s + arr.length, 0);
  if (total > MAX_RECORDS) return { ok: false, error: `Забагато записів у файлі (${total}). Максимум — ${MAX_RECORDS}.` };

  // Перевірка внутрішніх зв'язків до відправлення на сервер.
  const d = res.data.data;
  const ids = (arr: { id: string }[]) => new Set(arr.map((x) => x.id));
  const classIds = ids(d.classes);
  const sectionIds = ids(d.sections);
  const topicIds = ids(d.topics);
  const quizIds = ids(d.quizzes);
  const questionIds = ids(d.quiz_questions);
  if (d.sections.some((s) => !classIds.has(s.class_id))) return { ok: false, error: "Розділ посилається на клас, якого немає у файлі." };
  if (d.topics.some((t) => !sectionIds.has(t.section_id))) return { ok: false, error: "Тема посилається на розділ, якого немає у файлі." };
  if (d.notes.some((n) => !topicIds.has(n.topic_id))) return { ok: false, error: "Нотатка посилається на тему, якої немає у файлі." };
  if (d.topic_content.some((c) => !topicIds.has(c.topic_id))) return { ok: false, error: "Теорія посилається на тему, якої немає у файлі." };
  if (d.quiz_questions.some((q) => !quizIds.has(q.quiz_id))) return { ok: false, error: "Питання посилається на квіз, якого немає у файлі." };
  if (d.quiz_answer_keys.some((k) => !questionIds.has(k.question_id)))
    return { ok: false, error: "Ключ відповіді посилається на питання, якого немає у файлі." };
  return { ok: true, data: res.data };
}

export interface DuplicateReport {
  topics: number;
  materials: number;
  formulas: number;
  quizzes: number;
  examples: string[];
}

/** Можливі дублікати з наявними даними (за назвою / посиланням). */
export function findDuplicates(
  file: ParsedBackup,
  existing: { topics: Topic[]; materials: Material[]; formulas: Formula[]; quizzes: Quiz[] },
): DuplicateReport {
  const n = (s: unknown) => normalizeSearch(String(s ?? ""));
  const topicTitles = new Set(existing.topics.map((t) => n(t.title)));
  const matKeys = new Set(existing.materials.map((m) => (m.url ? `u:${m.url.trim()}` : `t:${n(m.title)}`)));
  const formulaNames = new Set(existing.formulas.map((f) => n(f.name)));
  const quizTitles = new Set(existing.quizzes.map((q) => n(q.title)));
  const examples: string[] = [];
  const count = <T,>(arr: T[], test: (x: T) => boolean, label: (x: T) => string) =>
    arr.filter((x) => {
      const hit = test(x);
      if (hit && examples.length < 6) examples.push(label(x));
      return hit;
    }).length;
  return {
    topics: count(file.data.topics, (t) => topicTitles.has(n(t.title)), (t) => `Тема: ${t.title}`),
    materials: count(
      file.data.materials,
      (m) => matKeys.has(typeof m.url === "string" && m.url ? `u:${m.url.trim()}` : `t:${n(m.title)}`),
      (m) => `Матеріал: ${m.title}`,
    ),
    formulas: count(file.data.formulas, (f) => formulaNames.has(n(f.name)), (f) => `Формула: ${f.name}`),
    quizzes: count(file.data.quizzes, (q) => quizTitles.has(n(q.title)), (q) => `Квіз: ${q.title}`),
    examples,
  };
}

export function backupCounts(file: ParsedBackup) {
  return TABLE_ORDER.map((t) => ({ table: t, label: TABLE_LABELS[t], count: file.data[t].length }));
}
