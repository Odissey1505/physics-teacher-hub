import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LayoutGrid, List, Plus, Search, Pencil, Star, MoreVertical, Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Input } from "@/components/ui/form-controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/common/States";
import { TopicCard, type TopicCounts } from "@/components/topics/TopicCard";
import { DeleteContainerDialog, type ContainerKind } from "@/components/topics/DeleteContainerDialog";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta } from "@/context/page-meta";
import { useDialogs } from "@/context/dialogs";
import { reorderItems, setCurrentSection } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useCourse, useFormulas, useInvalidate, useMaterials, useQuizzes } from "@/lib/queries";
import type { Topic } from "@/lib/types";
import { cn, countLabel, matchesQuery, readLocal, writeLocal } from "@/lib/utils";

export function SectionPage() {
  const { sectionId = "" } = useParams();
  const course = useCourse();
  const materials = useMaterials();
  const formulas = useFormulas();
  const quizzes = useQuizzes();
  const dialogs = useDialogs();
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">(() => readLocal("pth-view-topics", "grid"));
  const [toDelete, setToDelete] = useState<{ kind: ContainerKind; id: string; title: string } | null>(null);

  const section = course.sectionById.get(sectionId);
  const cls = section ? course.classById.get(section.class_id) : undefined;
  const topics = useMemo(() => course.topicsBySection.get(sectionId) ?? [], [course.topicsBySection, sectionId]);

  usePageMeta(section?.title ?? "Розділ", [
    { label: "Головна", to: "/" },
    { label: "Мої уроки", to: "/lessons" },
    { label: cls?.title ?? "Клас", to: "/lessons" },
    { label: section?.title ?? "Розділ" },
  ]);

  const counts = useMemo(() => {
    const map = new Map<string, TopicCounts>();
    const get = (id: string) => {
      let c = map.get(id);
      if (!c) map.set(id, (c = { materials: 0, formulas: 0, quizzes: 0 }));
      return c;
    };
    for (const m of materials.data ?? []) if (m.topic_id) get(m.topic_id).materials++;
    for (const f of formulas.data ?? []) if (f.topic_id) get(f.topic_id).formulas++;
    for (const q of quizzes.data ?? []) if (q.topic_id) get(q.topic_id).quizzes++;
    return map;
  }, [materials.data, formulas.data, quizzes.data]);

  const totalMaterials = topics.reduce((s, t) => s + (counts.get(t.id)?.materials ?? 0), 0);
  const numberOf = new Map(topics.map((t, i) => [t.id, i + 1]));
  const visible = query ? topics.filter((t) => matchesQuery(`${t.title} ${t.description}`, query)) : topics;
  const sortable = !query;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderItems("topics", ids),
    onError: async (e) => {
      toast.error(`Порядок не збережено: ${humanizeError(e)}`);
      await invalidate(qk.topics);
    },
    onSuccess: () => invalidate(qk.topics),
  });

  const setCurrent = useMutation({
    mutationFn: () => setCurrentSection(sectionId),
    onSuccess: async () => {
      await invalidate(qk.sections);
      toast.success("Розділ позначено як поточний");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    const next = arrayMove(topics, oldIndex, newIndex);
    // Оптимістично оновлюємо кеш, щоб картки не «стрибали» назад.
    qc.setQueryData<Topic[]>(qk.topics, (old) =>
      (old ?? []).map((t) => {
        const idx = next.findIndex((n) => n.id === t.id);
        return idx >= 0 ? { ...t, sort_order: idx } : t;
      }),
    );
    reorder.mutate(next.map((t) => t.id));
  };

  if (course.isLoading) return <CardGridSkeleton />;
  if (course.error) return <ErrorState error={course.error} onRetry={() => course.refetch()} />;
  if (!section) return <NotFoundPage what="Розділ" />;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{cls?.title}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{section.title}</h1>
            {section.is_current && (
              <Badge>
                <Star className="fill-current" /> Поточний
              </Badge>
            )}
          </div>
          {section.description && <p className="mt-2 max-w-3xl text-muted-foreground">{section.description}</p>}
          <p className="mt-2 text-sm text-muted-foreground">
            {countLabel(topics.length, ["тема", "теми", "тем"])} · {countLabel(totalMaterials, ["матеріал", "матеріали", "матеріалів"])}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={() => dialogs.openTopic(undefined, section.id)}>
            <Plus /> Додати тему
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Дії з розділом">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => dialogs.openSection(section)}>
                <Pencil /> Редагувати розділ
              </DropdownMenuItem>
              {!section.is_current && (
                <DropdownMenuItem onSelect={() => setCurrent.mutate()}>
                  <Star /> Зробити поточним
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setToDelete({ kind: "section", id: section.id, title: section.title })}>
                <Trash2 /> Видалити розділ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук тем у розділі…" className="pl-9" aria-label="Пошук тем" />
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden text-xs text-muted-foreground lg:block">
            {sortable ? "Перетягніть ⋮⋮, щоб змінити порядок" : "Сортування вимкнено під час пошуку"}
          </p>
          <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Вигляд">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setView(v);
                  writeLocal("pth-view-topics", v);
                }}
                aria-pressed={view === v}
                aria-label={v === "grid" ? "Сітка" : "Список"}
                className={cn("grid size-9 place-items-center rounded", view === v && "bg-primary/15 text-primary")}
              >
                {v === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="У цьому розділі ще немає тем"
          action={
            <Button onClick={() => dialogs.openTopic(undefined, section.id)}>
              <Plus /> Додати тему
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={Search} title="Тем не знайдено" description={`За запитом «${query}» нічого немає.`} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((t) => t.id)} strategy={view === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
            <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
              {visible.map((t) => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  number={numberOf.get(t.id) ?? 0}
                  counts={counts.get(t.id) ?? { materials: 0, formulas: 0, quizzes: 0 }}
                  view={view}
                  sortable={sortable}
                  onDelete={() => setToDelete({ kind: "topic", id: t.id, title: t.title })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {toDelete && (
        <DeleteContainerDialog
          kind={toDelete.kind}
          id={toDelete.id}
          title={toDelete.title}
          onClose={() => setToDelete(null)}
          onDeleted={() => toDelete.kind === "section" && navigate("/lessons", { replace: true })}
        />
      )}
    </>
  );
}
