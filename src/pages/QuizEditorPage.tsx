import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  Copy,
  GripVertical,
  ListChecks,
  Play,
  Plus,
  Save,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/misc";
import { Field, Input, Label, NativeSelect, Switch, Textarea } from "@/components/ui/form-controls";
import { EmptyState, ErrorState } from "@/components/common/States";
import { TopicPicker } from "@/components/common/TopicPicker";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { useBeforeUnload } from "@/components/common/FormDialog";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta } from "@/context/page-meta";
import { useConfirm } from "@/context/confirm";
import {
  deleteRow,
  duplicateQuiz,
  fetchAnswerKeys,
  fetchUpdatedAt,
  reorderItems,
  saveQuizQuestion,
  updateVersioned,
} from "@/lib/api";
import { ConflictError, humanizeError } from "@/lib/errors";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";
import { isSafeUrl } from "@/lib/providers";
import { qk, useCourse, useInvalidate, useQuizQuestions, useQuizzes } from "@/lib/queries";
import type { QuestionType, Quiz, QuizAnswerKey, QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Draft {
  qtype: QuestionType;
  prompt: string;
  options: string[];
  image_url: string;
  correct_option: number | null;
  correct_bool: boolean | null;
  accepted: string;
  case_sensitive: boolean;
  ignore_extra_spaces: boolean;
  explanation: string;
}

function toDraft(q?: QuizQuestion, k?: QuizAnswerKey): Draft {
  return {
    qtype: q?.qtype ?? "multiple_choice",
    prompt: q?.prompt ?? "",
    options: q?.options?.length ? q.options : ["", "", "", ""],
    image_url: q?.image_url ?? "",
    correct_option: k?.correct_option ?? null,
    correct_bool: k?.correct_bool ?? null,
    accepted: (k?.accepted_answers ?? []).join("\n"),
    case_sensitive: k?.case_sensitive ?? false,
    ignore_extra_spaces: k?.ignore_extra_spaces ?? true,
    explanation: k?.explanation ?? "",
  };
}

function validateDraft(d: Draft): string | null {
  if (!d.prompt.trim()) return "Введіть текст питання.";
  if (d.prompt.length > 2000) return "Питання задовге (до 2000 символів).";
  if (d.image_url.trim() && !(isSafeUrl(d.image_url) && /^https:\/\//i.test(d.image_url.trim())))
    return "Адреса зображення має починатися з https://";
  if (d.qtype === "multiple_choice") {
    const opts = d.options.map((o) => o.trim());
    if (opts.length < 2 || opts.length > 6) return "Потрібно від 2 до 6 варіантів.";
    if (opts.some((o) => !o)) return "Заповніть усі варіанти відповіді або видаліть зайві.";
    if (d.correct_option === null || d.correct_option >= opts.length) return "Позначте правильний варіант.";
  }
  if (d.qtype === "true_false" && d.correct_bool === null) return "Оберіть правильну відповідь: правда чи неправда.";
  if (d.qtype === "short_answer" && !d.accepted.split("\n").some((a) => a.trim()))
    return "Додайте хоча б одну допустиму відповідь.";
  return null;
}

function QuestionEditor({
  quizId,
  question,
  answerKey,
  index,
  defaultOpen,
  onCancelNew,
  onDirtyChange,
}: {
  quizId: string;
  question?: QuizQuestion;
  answerKey?: QuizAnswerKey;
  index: number;
  defaultOpen?: boolean;
  onCancelNew?: () => void;
  onDirtyChange: (id: string, dirty: boolean) => void;
}) {
  const id = question?.id ?? "new";
  const [open, setOpen] = useState(!!defaultOpen);
  const [draft, setDraft] = useState<Draft>(() => toDraft(question, answerKey));
  const [initial, setInitial] = useState(() => JSON.stringify(toDraft(question, answerKey)));
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const invalidate = useInvalidate();
  const confirm = useConfirm();
  const dirty = JSON.stringify(draft) !== initial;

  // Нові дані з сервера (наприклад, після оновлення з іншого пристрою), якщо локальних змін немає.
  useEffect(() => {
    const fresh = JSON.stringify(toDraft(question, answerKey));
    if (!dirty && fresh !== initial) {
      setDraft(toDraft(question, answerKey));
      setInitial(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.updated_at, answerKey?.updated_at]);

  useEffect(() => onDirtyChange(id, dirty), [id, dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(id, false), [id, onDirtyChange]);

  const sortable = useSortable({ id, disabled: !question });
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };

  const save = useMutation({
    mutationFn: async (force?: boolean) => {
      const msg = validateDraft(draft);
      if (msg) throw new Error(msg);
      let version = question?.updated_at;
      if (force && question) version = await fetchUpdatedAt("quiz_questions", question.id);
      return saveQuizQuestion(
        quizId,
        {
          id: question?.id,
          updated_at: version,
          qtype: draft.qtype,
          prompt: draft.prompt.trim(),
          options: draft.qtype === "multiple_choice" ? draft.options.map((o) => o.trim()) : [],
          image_url: draft.image_url.trim() || null,
        },
        {
          correct_option: draft.correct_option,
          correct_bool: draft.correct_bool,
          accepted_answers: draft.accepted.split("\n").map((a) => a.trim()).filter(Boolean),
          case_sensitive: draft.case_sensitive,
          ignore_extra_spaces: draft.ignore_extra_spaces,
          explanation: draft.explanation.trim(),
        },
      );
    },
    onSuccess: async () => {
      setError(null);
      setConflict(false);
      setInitial(JSON.stringify(draft));
      await invalidate(qk.questions(quizId), qk.answerKeys(quizId));
      toast.success(question ? "Питання збережено" : "Питання додано");
      if (!question) onCancelNew?.();
    },
    onError: (e) => {
      const err = e as { code?: string; message?: string };
      if (err.code === "40001" || err.message === "CONFLICT" || e instanceof ConflictError) setConflict(true);
      else setError(humanizeError(e));
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteRow("quiz_questions", question!.id),
    onSuccess: async () => {
      await invalidate(qk.questions(quizId), qk.answerKeys(quizId));
      toast.success("Питання видалено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setError(null);
  };

  return (
    <div ref={sortable.setNodeRef} style={style} className={cn(sortable.isDragging && "z-10")}>
      <Card className={cn("overflow-hidden", sortable.isDragging && "ring-2 ring-primary", dirty && "border-warning/60")}>
        <div className="flex items-center gap-2 p-3">
          {question && (
            <button
              type="button"
              className="grid size-8 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-elevated"
              aria-label={`Перетягнути питання ${index + 1}`}
              {...sortable.attributes}
              {...sortable.listeners}
            >
              <GripVertical className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={open}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-sm font-bold text-primary">
              {question ? index + 1 : "+"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{draft.prompt || "Нове питання"}</span>
              <span className="block text-xs text-muted-foreground">
                {QUESTION_TYPE_LABELS[draft.qtype]}
                {dirty && <span className="ml-2 text-warning">· не збережено</span>}
              </span>
            </span>
            <ChevronDown className={cn("size-4 shrink-0 transition", open && "rotate-180")} />
          </button>
        </div>
        {open && (
          <div className="space-y-4 border-t border-border p-4">
            {conflict && (
              <ConflictBanner
                busy={save.isPending}
                onOverwrite={() => save.mutate(true)}
                onDiscard={async () => {
                  setConflict(false);
                  setDraft(toDraft(question, answerKey));
                  await invalidate(qk.questions(quizId), qk.answerKeys(quizId));
                }}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
              <Field label="Тип питання" htmlFor={`qt-${id}`}>
                <NativeSelect id={`qt-${id}`} value={draft.qtype} onChange={(e) => set("qtype", e.target.value as QuestionType)}>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Зображення (URL, необов'язково)" htmlFor={`qi-${id}`}>
                <Input id={`qi-${id}`} type="url" placeholder="https://…" value={draft.image_url} onChange={(e) => set("image_url", e.target.value)} />
              </Field>
            </div>
            <Field label="Текст питання" htmlFor={`qp-${id}`} required hint="Формули — між знаками $…$">
              <Textarea id={`qp-${id}`} rows={2} value={draft.prompt} onChange={(e) => set("prompt", e.target.value)} />
            </Field>

            {draft.qtype === "multiple_choice" && (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-medium">Варіанти відповіді (позначте правильний)</legend>
                {draft.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${id}`}
                      aria-label={`Варіант ${i + 1} правильний`}
                      checked={draft.correct_option === i}
                      onChange={() => set("correct_option", i)}
                      className="size-4 shrink-0"
                    />
                    <Input
                      aria-label={`Варіант ${i + 1}`}
                      placeholder={`Варіант ${String.fromCharCode(1040 + i)}`}
                      value={o}
                      onChange={(e) => set("options", draft.options.map((x, j) => (j === i ? e.target.value : x)))}
                      className={cn(draft.correct_option === i && "border-success")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Видалити варіант ${i + 1}`}
                      disabled={draft.options.length <= 2}
                      onClick={() => {
                        const next = draft.options.filter((_, j) => j !== i);
                        let co = draft.correct_option;
                        if (co === i) co = null;
                        else if (co !== null && co > i) co -= 1;
                        setDraft((d) => ({ ...d, options: next, correct_option: co }));
                      }}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={draft.options.length >= 6} onClick={() => set("options", [...draft.options, ""])}>
                  <Plus /> Додати варіант
                </Button>
              </fieldset>
            )}

            {draft.qtype === "true_false" && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Правильна відповідь</legend>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <label
                      key={String(v)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm",
                        draft.correct_bool === v && "border-success bg-success/10",
                      )}
                    >
                      <input type="radio" name={`tf-${id}`} checked={draft.correct_bool === v} onChange={() => set("correct_bool", v)} />
                      {v ? "Правда" : "Неправда"}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {draft.qtype === "short_answer" && (
              <div className="space-y-3">
                <Field
                  label="Допустимі відповіді"
                  htmlFor={`qa-${id}`}
                  required
                  hint="Кожен варіант — з нового рядка (наприклад: Тесла / Тл). Відповідь учня має точно збігтися з одним із них."
                >
                  <Textarea id={`qa-${id}`} rows={3} value={draft.accepted} onChange={(e) => set("accepted", e.target.value)} />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    Ігнорувати зайві пробіли
                    <Switch checked={draft.ignore_extra_spaces} onCheckedChange={(v) => set("ignore_extra_spaces", v)} />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    Враховувати регістр (А ≠ а)
                    <Switch checked={draft.case_sensitive} onCheckedChange={(v) => set("case_sensitive", v)} />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Правила перевірки: пробіли на початку й у кінці прибираються, кілька пробілів поспіль рахуються як один
                  (якщо увімкнено); апострофи ’ ʼ ' вважаються однаковими. Розгорнуті пояснення автоматично не оцінюються —
                  використовуйте коротку відповідь лише для слова, числа чи позначення.
                </p>
              </div>
            )}

            <Field label="Пояснення (необов'язково)" htmlFor={`qe-${id}`} hint="Показується після перевірки, якщо в налаштуваннях квізу увімкнено пояснення.">
              <Textarea id={`qe-${id}`} rows={2} value={draft.explanation} onChange={(e) => set("explanation", e.target.value)} />
            </Field>

            {error && (
              <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="size-4" /> {error}
              </p>
            )}

            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
              {question ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (await confirm({ title: "Видалити питання?", description: draft.prompt, confirmLabel: "Видалити", destructive: true }))
                      remove.mutate();
                  }}
                >
                  <Trash2 /> Видалити
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                {(dirty || !question) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!question) onCancelNew?.();
                      else {
                        setDraft(toDraft(question, answerKey));
                        setError(null);
                      }
                    }}
                  >
                    Скасувати
                  </Button>
                )}
                <Button type="button" onClick={() => save.mutate(false)} loading={save.isPending} disabled={!dirty && !!question}>
                  <Save /> Зберегти питання
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function QuizSettings({ quiz }: { quiz: Quiz }) {
  const invalidate = useInvalidate();
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description);
  const [topicId, setTopicId] = useState<string | null>(quiz.topic_id);
  const [reveal, setReveal] = useState(quiz.reveal_mode);
  const [explain, setExplain] = useState(quiz.show_explanations);
  const [conflict, setConflict] = useState(false);
  const dirty =
    title !== quiz.title ||
    description !== quiz.description ||
    topicId !== quiz.topic_id ||
    reveal !== quiz.reveal_mode ||
    explain !== quiz.show_explanations;

  const save = useMutation({
    mutationFn: async (force?: boolean) => {
      if (!title.trim()) throw new Error("Вкажіть назву квізу");
      const version = force ? await fetchUpdatedAt("quizzes", quiz.id) : quiz.updated_at;
      return updateVersioned<Quiz>("quizzes", quiz.id, version, {
        title: title.trim(),
        description: description.trim(),
        topic_id: topicId,
        reveal_mode: reveal,
        show_explanations: explain,
      });
    },
    onSuccess: async () => {
      setConflict(false);
      await invalidate(qk.quizzes);
      toast.success("Налаштування квізу збережено");
    },
    onError: (e) => (e instanceof ConflictError ? setConflict(true) : toast.error(humanizeError(e))),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Налаштування</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {conflict && (
          <ConflictBanner
            busy={save.isPending}
            onOverwrite={() => save.mutate(true)}
            onDiscard={async () => {
              setConflict(false);
              await invalidate(qk.quizzes);
            }}
          />
        )}
        <Field label="Назва" htmlFor="qs-title" required>
          <Input id="qs-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Опис" htmlFor="qs-desc">
          <Textarea id="qs-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </Field>
        <TopicPicker value={topicId} onChange={setTopicId} idPrefix="qs" noneLabel="— Без прив'язки до теми —" />
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Коли показувати правильні відповіді</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["end", "Лише в кінці", "Учні відповідають на всі питання, потім учитель відкриває результати."],
                ["each", "Після кожного питання", "Перевірка — кнопкою «Перевірити» після відповіді."],
              ] as const
            ).map(([v, label, text]) => (
              <label key={v} className={cn("flex cursor-pointer gap-2 rounded-lg border border-border p-3 text-sm", reveal === v && "border-primary bg-primary/5")}>
                <input type="radio" name="reveal" checked={reveal === v} onChange={() => setReveal(v)} className="mt-1" />
                <span>
                  <span className="block font-medium">{label}</span>
                  <span className="block text-muted-foreground">{text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <Label htmlFor="qs-exp">Показувати пояснення після перевірки</Label>
          <Switch id="qs-exp" checked={explain} onCheckedChange={setExplain} />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate(false)} loading={save.isPending} disabled={!dirty}>
            <Save /> Зберегти налаштування
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuizEditorPage() {
  const { quizId = "" } = useParams();
  const quizzes = useQuizzes();
  const course = useCourse();
  const questions = useQuizQuestions(quizId);
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const quiz = quizzes.data?.find((q) => q.id === quizId);
  const questionIds = useMemo(() => (questions.data ?? []).map((q) => q.id), [questions.data]);

  // Ключі відповідей завантажуються лише тут — у редакторі вчителя.
  const keys = useQuery({
    queryKey: [...qk.answerKeys(quizId), questionIds.join(",")],
    queryFn: () => fetchAnswerKeys(questionIds),
    enabled: questionIds.length > 0,
  });
  const keyById = useMemo(() => new Map((keys.data ?? []).map((k) => [k.question_id, k])), [keys.data]);

  const path = quiz?.topic_id ? course.pathById.get(quiz.topic_id) : undefined;
  usePageMeta(quiz?.title ?? "Квіз", [
    { label: "Головна", to: "/" },
    { label: "Квізи та ігри", to: "/quizzes" },
    ...(path ? [{ label: `Тема ${path.number}`, to: `/topics/${path.topic.id}/quizzes` }] : []),
    { label: quiz?.title ?? "Квіз" },
  ]);

  const onDirtyChange = useMemo(
    () => (id: string, dirty: boolean) =>
      setDirtyMap((m) => (m[id] === dirty ? m : { ...m, [id]: dirty })),
    [],
  );
  const anyDirty = Object.values(dirtyMap).some(Boolean);
  useBeforeUnload(anyDirty);
  const blocker = useBlocker(anyDirty);
  const asking = useRef(false);
  useEffect(() => {
    if (blocker.state !== "blocked" || asking.current) return;
    asking.current = true;
    confirm({
      title: "Є незбережені питання",
      description: "Якщо піти зараз, зміни в питаннях буде втрачено.",
      confirmLabel: "Піти без збереження",
      cancelLabel: "Залишитися",
      destructive: true,
    }).then((ok) => {
      asking.current = false;
      if (ok) blocker.proceed?.();
      else blocker.reset?.();
    });
  }, [blocker, confirm]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderItems("quiz_questions", ids),
    onSuccess: () => invalidate(qk.questions(quizId)),
    onError: async (e) => {
      toast.error(`Порядок не збережено: ${humanizeError(e)}`);
      await invalidate(qk.questions(quizId));
    },
  });
  const onDragEnd = (e: DragEndEvent) => {
    const list = questions.data ?? [];
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(
      list,
      list.findIndex((q) => q.id === e.active.id),
      list.findIndex((q) => q.id === e.over!.id),
    );
    qc.setQueryData(qk.questions(quizId), next.map((q, i) => ({ ...q, sort_order: i })));
    reorder.mutate(next.map((q) => q.id));
  };

  const dup = useMutation({
    mutationFn: () => duplicateQuiz(quizId),
    onSuccess: async (id) => {
      await invalidate(qk.quizzes);
      toast.success("Квіз продубльовано");
      navigate(`/quizzes/${id}/edit`);
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  const del = useMutation({
    mutationFn: () => deleteRow("quizzes", quizId),
    onSuccess: async () => {
      setDirtyMap({});
      await invalidate(qk.quizzes);
      toast.success("Квіз видалено");
      navigate("/quizzes", { replace: true });
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  if (quizzes.isLoading) return <Skeleton className="h-64" />;
  if (quizzes.isError) return <ErrorState error={quizzes.error} onRetry={() => quizzes.refetch()} />;
  if (!quiz) return <NotFoundPage what="Квіз" />;

  const list = questions.data ?? [];

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="secondary" className="mb-2">
            <ListChecks /> Вбудований квіз
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{quiz.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {path ? `${path.number}. ${path.topic.title}` : "Без теми"} · {list.length} питань
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="gradient" disabled={list.length === 0}>
            <Link to={`/quizzes/${quiz.id}/play`}>
              <Play /> Пройти квіз
            </Link>
          </Button>
          <Button variant="outline" onClick={() => dup.mutate()} loading={dup.isPending}>
            <Copy /> Дублювати
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={async () => {
              if (
                await confirm({
                  title: "Видалити квіз?",
                  description: `«${quiz.title}» разом з ${list.length} питаннями буде видалено назавжди.`,
                  confirmLabel: "Видалити",
                  destructive: true,
                })
              )
                del.mutate();
            }}
          >
            <Trash2 /> Видалити
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3" aria-label="Питання">
          {questions.isLoading || (questionIds.length > 0 && keys.isLoading) ? (
            <Skeleton className="h-40" />
          ) : questions.isError ? (
            <ErrorState error={questions.error} onRetry={() => questions.refetch()} />
          ) : keys.isError ? (
            <ErrorState error={keys.error} onRetry={() => keys.refetch()} />
          ) : list.length === 0 && !adding ? (
            <EmptyState
              icon={ListChecks}
              title="Питань ще немає"
              description="Додайте питання з вибором варіанта, правда/неправда або короткою відповіддю."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus /> Додати питання
                </Button>
              }
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={list.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {list.map((q, i) => (
                  <QuestionEditor
                    key={q.id}
                    quizId={quizId}
                    question={q}
                    answerKey={keyById.get(q.id)}
                    index={i}
                    onDirtyChange={onDirtyChange}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          {adding && (
            <QuestionEditor quizId={quizId} index={list.length} defaultOpen onCancelNew={() => setAdding(false)} onDirtyChange={onDirtyChange} />
          )}
          {!adding && list.length > 0 && (
            <Button variant="outline" className="w-full border-dashed" onClick={() => setAdding(true)}>
              <Plus /> Додати питання
            </Button>
          )}
          {list.length > 0 && keys.data && keys.data.length < list.length && (
            <p className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="size-4" /> Деякі питання не мають правильної відповіді — збережіть їх ще раз.
            </p>
          )}
          {list.length > 0 && keys.data?.length === list.length && (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> Усі питання мають ключі відповідей.
            </p>
          )}
        </section>
        <aside>
          <QuizSettings key={quiz.updated_at} quiz={quiz} />
        </aside>
      </div>
    </>
  );
}
