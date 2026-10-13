import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard,
  BookText,
  Presentation,
  CirclePlay,
  Sigma,
  FlaskConical,
  Gamepad2,
  ClipboardCheck,
  NotebookPen,
  Pencil,
  Plus,
  MonitorPlay,
  MoreVertical,
  Copy,
  Trash2,
  Lock,
  Save,
  X,
  Target,
  Lightbulb,
  BookA,
  Clock,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/misc";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/menu";
import { EmptyState, ErrorState } from "@/components/common/States";
import { RichText } from "@/components/common/Math";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { useBeforeUnload } from "@/components/common/FormDialog";
import { MaterialList } from "@/components/materials/MaterialList";
import { MaterialCard } from "@/components/materials/MaterialCard";
import { FormulaCard } from "@/components/formulas/FormulaCard";
import { InternalQuizList } from "@/components/quizzes/InternalQuizList";
import { DeleteContainerDialog } from "@/components/topics/DeleteContainerDialog";
import { useDuplicateTopic } from "@/components/topics/TopicCard";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta } from "@/context/page-meta";
import { useDialogs } from "@/context/dialogs";
import { useConfirm } from "@/context/confirm";
import { deleteRow, fetchTopicContent, saveTopicContent } from "@/lib/api";
import { ConflictError, humanizeError } from "@/lib/errors";
import { TOPIC_ICON_MAP, TYPE_GROUPS } from "@/lib/constants";
import { isEmptyHtml } from "@/lib/sanitize";
import { qk, useCourse, useFormulas, useInvalidate, useMaterials, useNotes, useTopicContent } from "@/lib/queries";
import type { Definition, Material, MaterialType, Note, TopicContent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Огляд", icon: LayoutDashboard },
  { key: "theory", label: "Теорія", icon: BookText },
  { key: "presentations", label: "Презентації", icon: Presentation },
  { key: "videos", label: "Відео", icon: CirclePlay },
  { key: "formulas", label: "Формули", icon: Sigma },
  { key: "experiments", label: "Експерименти", icon: FlaskConical },
  { key: "quizzes", label: "Квізи та ігри", icon: Gamepad2 },
  { key: "tests", label: "Тести та контрольні", icon: ClipboardCheck },
  { key: "notes", label: "Нотатки вчителя", icon: NotebookPen },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** Блокування переходу з незбереженими змінами (усередині застосунку та при закритті вкладки). */
function useUnsavedGuard(dirty: boolean) {
  const confirm = useConfirm();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(dirty);
  const asking = useRef(false);
  useEffect(() => {
    if (blocker.state !== "blocked" || asking.current) return;
    asking.current = true;
    confirm({
      title: "Піти без збереження?",
      description: "Зміни на цій сторінці ще не збережено.",
      confirmLabel: "Піти без збереження",
      cancelLabel: "Залишитися",
      destructive: true,
    }).then((ok) => {
      asking.current = false;
      if (ok) blocker.proceed?.();
      else blocker.reset?.();
    });
  }, [blocker, confirm]);
}

/** Збереження вмісту теми з перевіркою версії (захист від перезапису змін з іншого пристрою). */
function useSaveContent(topicId: string) {
  const qc = useQueryClient();
  const [conflict, setConflict] = useState(false);
  const mutation = useMutation({
    mutationFn: async ({ patch, force }: { patch: Partial<TopicContent>; force?: boolean }) => {
      const current = qc.getQueryData<TopicContent | null>(qk.topicContent(topicId)) ?? null;
      let version = current?.updated_at ?? null;
      if (force) version = (await fetchTopicContent(topicId))?.updated_at ?? null;
      return saveTopicContent(topicId, version, patch);
    },
    onSuccess: (saved) => {
      qc.setQueryData(qk.topicContent(topicId), saved);
      setConflict(false);
    },
    onError: (e) => (e instanceof ConflictError ? setConflict(true) : toast.error(humanizeError(e))),
  });
  return { mutation, conflict, setConflict };
}

/* ---------------- Огляд ---------------- */

function OverviewTab({ topicId, materials }: { topicId: string; materials: Material[] }) {
  const content = useTopicContent(topicId);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [summary, setSummary] = useState("");
  const [concepts, setConcepts] = useState("");
  const [objectives, setObjectives] = useState("");
  const [defs, setDefs] = useState<Definition[]>([]);
  const { mutation, conflict, setConflict } = useSaveContent(topicId);
  const c = content.data;

  const startEdit = () => {
    setSummary(c?.summary ?? "");
    setConcepts((c?.key_concepts ?? []).join("\n"));
    setObjectives((c?.objectives ?? []).join("\n"));
    setDefs(c?.definitions?.length ? c.definitions : [{ term: "", definition: "" }]);
    setEditing(true);
  };
  const dirty =
    editing &&
    (summary !== (c?.summary ?? "") ||
      concepts !== (c?.key_concepts ?? []).join("\n") ||
      objectives !== (c?.objectives ?? []).join("\n") ||
      JSON.stringify(defs.filter((d) => d.term || d.definition)) !== JSON.stringify(c?.definitions ?? []));
  useUnsavedGuard(dirty);

  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 100);
  const save = (force?: boolean) =>
    mutation.mutate(
      {
        patch: {
          summary: summary.trim(),
          key_concepts: lines(concepts),
          objectives: lines(objectives),
          definitions: defs
            .map((d) => ({ term: d.term.trim(), definition: d.definition.trim() }))
            .filter((d) => d.term || d.definition),
        },
        force,
      },
      {
        onSuccess: () => {
          toast.success("Огляд теми збережено");
          setEditing(false);
        },
      },
    );

  const recent = materials.slice(0, 4);

  if (content.isLoading) return <Skeleton className="h-64" />;
  if (content.isError) return <ErrorState error={content.error} onRetry={() => content.refetch()} />;

  if (editing) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-5">
          {conflict && (
            <ConflictBanner
              busy={mutation.isPending}
              onOverwrite={() => save(true)}
              onDiscard={async () => {
                setConflict(false);
                setEditing(false);
                await qc.invalidateQueries({ queryKey: qk.topicContent(topicId) });
              }}
            />
          )}
          <Field label="Короткий підсумок теми" htmlFor="ov-summary">
            <Textarea id="ov-summary" rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={10000} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ключові поняття" htmlFor="ov-concepts" hint="Кожне поняття — з нового рядка">
              <Textarea id="ov-concepts" rows={6} value={concepts} onChange={(e) => setConcepts(e.target.value)} />
            </Field>
            <Field label="Навчальні цілі" htmlFor="ov-obj" hint="Кожна ціль — з нового рядка">
              <Textarea id="ov-obj" rows={6} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Визначення</legend>
            {defs.map((d, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto]">
                <Input
                  aria-label="Термін"
                  placeholder="Термін"
                  value={d.term}
                  onChange={(e) => setDefs((s) => s.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)))}
                />
                <Input
                  aria-label="Визначення"
                  placeholder="Визначення"
                  value={d.definition}
                  onChange={(e) => setDefs((s) => s.map((x, j) => (j === i ? { ...x, definition: e.target.value } : x)))}
                />
                <Button type="button" variant="ghost" size="icon" aria-label="Видалити визначення" onClick={() => setDefs((s) => s.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setDefs((s) => [...s, { term: "", definition: "" }])}>
              <Plus /> Додати визначення
            </Button>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={mutation.isPending}>
              <X /> Скасувати
            </Button>
            <Button onClick={() => save()} loading={mutation.isPending}>
              <Save /> Зберегти
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const empty = !c || (!c.summary && !c.key_concepts.length && !c.objectives.length && !c.definitions.length);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Підсумок</CardTitle>
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil /> Редагувати огляд
            </Button>
          </CardHeader>
          <CardContent>
            {empty ? (
              <p className="text-sm text-muted-foreground">
                Додайте короткий підсумок, ключові поняття, визначення та навчальні цілі — вони з'являться тут і в режимі
                презентації.
              </p>
            ) : (
              <p className="whitespace-pre-line">{c?.summary || "—"}</p>
            )}
          </CardContent>
        </Card>
        {!!c?.definitions.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookA className="size-4 text-primary" /> Визначення
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {c.definitions.map((d, i) => (
                  <div key={i}>
                    <dt className="font-semibold">{d.term}</dt>
                    <dd className="text-sm text-muted-foreground">{d.definition}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="space-y-5">
        {!!c?.key_concepts.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-warning" /> Ключові поняття
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {c.key_concepts.map((k) => (
                <span key={k} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                  {k}
                </span>
              ))}
            </CardContent>
          </Card>
        )}
        {!!c?.objectives.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-success" /> Навчальні цілі
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {c.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" /> Нещодавно додані ресурси
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Тут поки немає матеріалів. Додайте перший ресурс до цієї теми!</p>
            ) : (
              recent.map((m) => <MaterialCard key={m.id} m={m} view="list" />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Теорія ---------------- */

function TheoryTab({ topicId, addMaterial }: { topicId: string; addMaterial: (t?: MaterialType) => void }) {
  const content = useTopicContent(topicId);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [html, setHtml] = useState("");
  const { mutation, conflict, setConflict } = useSaveContent(topicId);
  const saved = content.data?.theory_html ?? "";
  const dirty = editing && html !== saved;
  useUnsavedGuard(dirty);
  const theoryFilter = useCallback((m: Material) => m.topic_id === topicId && TYPE_GROUPS.theory.includes(m.type), [topicId]);

  const save = (force?: boolean) =>
    mutation.mutate(
      { patch: { theory_html: html }, force },
      {
        onSuccess: () => {
          toast.success("Теорію збережено");
          setEditing(false);
        },
      },
    );

  if (content.isLoading) return <Skeleton className="h-64" />;
  if (content.isError) return <ErrorState error={content.error} onRetry={() => content.refetch()} />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Теорія</CardTitle>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHtml(saved);
                setEditing(true);
              }}
            >
              <Pencil /> {isEmptyHtml(saved) ? "Написати теорію" : "Редагувати"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              {conflict && (
                <ConflictBanner
                  busy={mutation.isPending}
                  onOverwrite={() => save(true)}
                  onDiscard={async () => {
                    setConflict(false);
                    setEditing(false);
                    await qc.invalidateQueries({ queryKey: qk.topicContent(topicId) });
                  }}
                />
              )}
              <RichTextEditor
                value={html}
                onChange={setHtml}
                minHeight={360}
                ariaLabel="Текст теорії"
                placeholder="Заголовки, списки, таблиці, зображення. Формули — кнопкою Σ або між знаками $…$"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {content.data?.updated_at ? `Востаннє збережено: ${formatDateTime(content.data.updated_at)}` : "Ще не збережено"}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={mutation.isPending}>
                    <X /> Скасувати
                  </Button>
                  <Button onClick={() => save()} loading={mutation.isPending}>
                    <Save /> Зберегти
                  </Button>
                </div>
              </div>
            </>
          ) : isEmptyHtml(saved) ? (
            <p className="text-sm text-muted-foreground">Теорію ще не написано.</p>
          ) : (
            <RichText html={saved} className="max-w-3xl" />
          )}
        </CardContent>
      </Card>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Конспекти та документи</h2>
          <Button size="sm" variant="outline" onClick={() => addMaterial("summary")}>
            <Plus /> Додати
          </Button>
        </div>
        <MaterialList
          filter={theoryFilter}
          types={TYPE_GROUPS.theory}
          storageKey="topic-theory"
          showTopicFilter={false}
          hideTopicLabel
          compact
          emptyTitle="Тут поки немає матеріалів. Додайте перший ресурс до цієї теми!"
          emptyDescription="Конспекти, PDF, документи Google, посилання."
        />
      </section>
    </div>
  );
}

/* ---------------- Нотатки ---------------- */

function NotesTab({ topicId }: { topicId: string }) {
  const notes = useNotes();
  const dialogs = useDialogs();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const list = (notes.data ?? []).filter((n) => n.topic_id === topicId);
  const del = useMutation({
    mutationFn: (n: Note) => deleteRow("notes", n.id),
    onSuccess: async () => {
      await invalidate(qk.notes);
      toast.success("Нотатку видалено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-elevated/30 p-3 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Lock className="size-4" /> Нотатки приватні: їх бачите лише ви, і вони ніколи не потрапляють у режим презентації.
        </p>
        <Button size="sm" onClick={() => dialogs.openNote(undefined, topicId)}>
          <Plus /> Нова нотатка
        </Button>
      </div>
      {notes.isLoading ? (
        <Skeleton className="h-40" />
      ) : notes.isError ? (
        <ErrorState error={notes.error} onRetry={() => notes.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Нотаток поки немає" description="Що не забути на уроці, ідеї, типові помилки учнів…" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((n) => (
            <Card key={n.id} className="p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{n.title}</h3>
                  <p className="text-xs text-muted-foreground">{formatDateTime(n.updated_at)}</p>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon-sm" aria-label="Редагувати нотатку" onClick={() => dialogs.openNote(n)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Видалити нотатку"
                    onClick={async () => {
                      if (await confirm({ title: "Видалити нотатку?", description: `«${n.title}»`, confirmLabel: "Видалити", destructive: true }))
                        del.mutate(n);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {isEmptyHtml(n.body_html) ? (
                <p className="text-sm text-muted-foreground">Без тексту</p>
              ) : (
                <RichText html={n.body_html} className="text-sm" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Вкладки з матеріалами ---------------- */

function TypedMaterialsTab({
  topicId,
  types,
  storageKey,
  addType,
  addLabel,
  extra,
}: {
  topicId: string;
  types: MaterialType[];
  storageKey: string;
  addType: MaterialType;
  addLabel: string;
  extra?: React.ReactNode;
}) {
  const dialogs = useDialogs();
  const filter = useCallback((m: Material) => m.topic_id === topicId && types.includes(m.type), [topicId, types]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => dialogs.openMaterial(undefined, { type: addType, topicId })}>
          <Plus /> {addLabel}
        </Button>
      </div>
      <MaterialList
        filter={filter}
        types={types}
        storageKey={storageKey}
        showTopicFilter={false}
        hideTopicLabel
        emptyTitle="Тут поки немає матеріалів. Додайте перший ресурс до цієї теми!"
      />
      {extra}
    </div>
  );
}

function FormulasTab({ topicId }: { topicId: string }) {
  const formulas = useFormulas();
  const dialogs = useDialogs();
  const list = (formulas.data ?? []).filter((f) => f.topic_id === topicId);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => dialogs.openFormula(undefined, topicId)}>
          <Plus /> Додати формулу
        </Button>
      </div>
      {formulas.isLoading ? (
        <Skeleton className="h-40" />
      ) : formulas.isError ? (
        <ErrorState error={formulas.error} onRetry={() => formulas.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={Sigma} title="Формул до теми поки немає" description="Додайте формулу з LaTeX-записом, поясненням і калькулятором." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((f) => (
            <FormulaCard key={f.id} formula={f} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Сторінка теми ---------------- */

export function TopicPage() {
  const { topicId = "", tab = "overview" } = useParams();
  const navigate = useNavigate();
  const course = useCourse();
  const materials = useMaterials();
  const dialogs = useDialogs();
  const dup = useDuplicateTopic();
  const [deleting, setDeleting] = useState(false);
  const path = course.pathById.get(topicId);
  const topic = path?.topic;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "overview";

  usePageMeta(topic ? `${path!.number}. ${topic.title}` : "Тема", [
    { label: "Головна", to: "/" },
    { label: path?.cls?.title ?? "Клас", to: "/lessons" },
    { label: path?.section?.title ?? "Розділ", to: path?.section ? `/sections/${path.section.id}` : "/lessons" },
    { label: topic ? `Тема ${path!.number}` : "Тема" },
  ]);

  const topicMaterials = useMemo(
    () => (materials.data ?? []).filter((m) => m.topic_id === topicId),
    [materials.data, topicId],
  );
  const addMaterial = (type?: MaterialType) => dialogs.openMaterial(undefined, { type, topicId });

  if (course.isLoading) return <Skeleton className="h-64" />;
  if (course.error) return <ErrorState error={course.error} onRetry={() => course.refetch()} />;
  if (!topic || !path) return <NotFoundPage what="Тему" />;

  const Icon = topic.icon ? TOPIC_ICON_MAP[topic.icon] : null;

  return (
    <>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
        {topic.image_url && (
          <img src={topic.image_url} alt="" className="h-36 w-full object-cover sm:h-44" referrerPolicy="no-referrer" />
        )}
        <div className="flex flex-col gap-4 p-5 sm:p-6 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/25 text-xl font-bold text-primary">
              {Icon ? <Icon className="size-7" /> : path.number}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {path.section?.title} · Тема {path.number}
              </p>
              <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{topic.title}</h1>
              {topic.description && <p className="mt-2 max-w-3xl whitespace-pre-line text-muted-foreground">{topic.description}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => dialogs.openTopic(topic)}>
              <Pencil /> Редагувати тему
            </Button>
            <Button onClick={() => addMaterial()}>
              <Plus /> Додати матеріал
            </Button>
            <Button asChild variant="gradient">
              <Link to={`/present/${topic.id}`}>
                <MonitorPlay /> Режим презентації
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Інші дії з темою">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => dialogs.openFormula(undefined, topic.id)}>
                  <Sigma /> Додати формулу
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => dialogs.openQuizCreate(topic.id)}>
                  <ListChecks /> Створити квіз
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => dialogs.openNote(undefined, topic.id)}>
                  <NotebookPen /> Додати нотатку
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => dup.mutate(topic.id)}>
                  <Copy /> Дублювати тему
                </DropdownMenuItem>
                <DropdownMenuItem destructive onSelect={() => setDeleting(true)}>
                  <Trash2 /> Видалити тему
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => navigate(`/topics/${topicId}/${v === "overview" ? "" : v}`, { replace: true })}>
        <TabsList aria-label="Розділи теми">
          {TABS.map(({ key, label, icon: TIcon }) => (
            <TabsTrigger key={key} value={key}>
              <TIcon /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab topicId={topicId} materials={topicMaterials} />
        </TabsContent>
        <TabsContent value="theory">
          <TheoryTab topicId={topicId} addMaterial={addMaterial} />
        </TabsContent>
        <TabsContent value="presentations">
          <TypedMaterialsTab topicId={topicId} types={TYPE_GROUPS.presentations} storageKey="topic-pres" addType="presentation" addLabel="Додати презентацію" />
        </TabsContent>
        <TabsContent value="videos">
          <TypedMaterialsTab topicId={topicId} types={TYPE_GROUPS.videos} storageKey="topic-video" addType="video" addLabel="Додати відео" />
        </TabsContent>
        <TabsContent value="formulas">
          <FormulasTab topicId={topicId} />
        </TabsContent>
        <TabsContent value="experiments">
          <TypedMaterialsTab topicId={topicId} types={TYPE_GROUPS.experiments} storageKey="topic-exp" addType="simulation" addLabel="Додати експеримент" />
        </TabsContent>
        <TabsContent value="quizzes">
          <TypedMaterialsTab
            topicId={topicId}
            types={TYPE_GROUPS.quizzes}
            storageKey="topic-quiz"
            addType="quiz"
            addLabel="Додати зовнішній квіз / гру"
            extra={
              <section className="pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">Вбудовані квізи</h2>
                  <Button size="sm" variant="outline" onClick={() => dialogs.openQuizCreate(topicId)}>
                    <Plus /> Створити квіз
                  </Button>
                </div>
                <InternalQuizList topicId={topicId} showTopic={false} />
              </section>
            }
          />
        </TabsContent>
        <TabsContent value="tests">
          <TypedMaterialsTab topicId={topicId} types={TYPE_GROUPS.tests} storageKey="topic-tests" addType="test" addLabel="Додати тест / контрольну" />
        </TabsContent>
        <TabsContent value="notes">
          <NotesTab topicId={topicId} />
        </TabsContent>
      </Tabs>

      {deleting && (
        <DeleteContainerDialog
          kind="topic"
          id={topic.id}
          title={topic.title}
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate(path.section ? `/sections/${path.section.id}` : "/lessons", { replace: true })}
        />
      )}
    </>
  );
}
