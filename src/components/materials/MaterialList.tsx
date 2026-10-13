import { useMemo, useState, type ReactNode } from "react";
import { LayoutGrid, List, Search, Star, X, type LucideIcon } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/common/States";
import { MaterialCard } from "./MaterialCard";
import { MATERIAL_TYPES, MATERIAL_TYPE_MAP } from "@/lib/constants";
import { PROVIDERS, providerLabel } from "@/lib/providers";
import { useCourse, useMaterials } from "@/lib/queries";
import type { Material, MaterialType } from "@/lib/types";
import { cn, countLabel, matchesQuery, readLocal, stripHtml, writeLocal } from "@/lib/utils";

type SortKey = "newest" | "alpha" | "updated";

export interface MaterialListProps {
  /** Базовий фільтр сторінки (наприклад, лише відео). */
  filter?: (m: Material) => boolean;
  /** Типи, доступні у фільтрі «Тип». */
  types?: MaterialType[];
  /** Показувати фільтр за темою. */
  showTopicFilter?: boolean;
  /** Ключ для запам'ятовування вигляду (сітка/список). */
  storageKey: string;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  emptyIcon?: LucideIcon;
  emptyAction?: ReactNode;
  compact?: boolean;
  hideTopicLabel?: boolean;
}

export function MaterialList({
  filter,
  types,
  showTopicFilter = true,
  storageKey,
  emptyTitle = "Тут поки немає матеріалів",
  emptyDescription,
  emptyIcon,
  emptyAction,
  compact,
  hideTopicLabel,
}: MaterialListProps) {
  const materials = useMaterials();
  const course = useCourse();
  const [view, setView] = useState<"grid" | "list">(() => readLocal(`pth-view-${storageKey}`, compact ? "list" : "grid"));
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [provider, setProvider] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");

  const base = useMemo(() => (materials.data ?? []).filter((m) => (filter ? filter(m) : true)), [materials.data, filter]);

  const availableTags = useMemo(() => [...new Set(base.flatMap((m) => m.tags))].sort((a, b) => a.localeCompare(b, "uk")), [base]);
  const availableProviders = useMemo(
    () => [...new Set(base.map((m) => m.provider).filter(Boolean) as string[])],
    [base],
  );
  const typeOptions = types ?? MATERIAL_TYPES.map((t) => t.value);

  const items = useMemo(() => {
    const out = base.filter((m) => {
      if (type && m.type !== type) return false;
      if (topic === "__inbox" && m.topic_id !== null) return false;
      if (topic && topic !== "__inbox" && m.topic_id !== topic) return false;
      if (provider && m.provider !== provider) return false;
      if (tag && !m.tags.includes(tag)) return false;
      if (favOnly && !m.is_favorite) return false;
      if (query) {
        const hay = `${m.title} ${m.description} ${m.tags.join(" ")} ${stripHtml(m.content_html)} ${providerLabel(m.provider) ?? ""}`;
        if (!matchesQuery(hay, query)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      if (sort === "alpha") return a.title.localeCompare(b.title, "uk");
      if (sort === "updated") return b.updated_at.localeCompare(a.updated_at);
      return b.created_at.localeCompare(a.created_at);
    });
    return out;
  }, [base, type, topic, provider, tag, favOnly, query, sort]);

  const filtersActive = !!(query || type || topic || provider || tag || favOnly);
  const reset = () => {
    setQuery("");
    setType("");
    setTopic("");
    setProvider("");
    setTag("");
    setFavOnly(false);
  };

  const setViewPersist = (v: "grid" | "list") => {
    setView(v);
    writeLocal(`pth-view-${storageKey}`, v);
  };

  if (materials.isLoading) return <CardGridSkeleton count={compact ? 3 : 6} />;
  if (materials.isError) return <ErrorState error={materials.error} onRetry={() => materials.refetch()} />;

  return (
    <div className="space-y-4">
      {(!compact || base.length > 4) && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Пошук за назвою, описом, тегами…"
                className="pl-9"
                aria-label="Пошук матеріалів"
              />
            </div>
            <div className="flex gap-2">
              <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Сортування" className="w-48">
                <option value="newest">Спершу нові</option>
                <option value="alpha">За алфавітом</option>
                <option value="updated">Нещодавно змінені</option>
              </NativeSelect>
              <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Вигляд">
                <button
                  type="button"
                  onClick={() => setViewPersist("grid")}
                  aria-pressed={view === "grid"}
                  aria-label="Сітка"
                  className={cn("grid size-9 place-items-center rounded", view === "grid" && "bg-primary/15 text-primary")}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewPersist("list")}
                  aria-pressed={view === "list"}
                  aria-label="Список"
                  className={cn("grid size-9 place-items-center rounded", view === "list" && "bg-primary/15 text-primary")}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:flex lg:flex-wrap">
            {typeOptions.length > 1 && (
              <NativeSelect value={type} onChange={(e) => setType(e.target.value)} aria-label="Тип" className="lg:w-44">
                <option value="">Усі типи</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {MATERIAL_TYPE_MAP[t].label}
                  </option>
                ))}
              </NativeSelect>
            )}
            {showTopicFilter && (
              <NativeSelect value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Тема" className="lg:w-64">
                <option value="">Усі теми</option>
                <option value="__inbox">Скарбничка (без теми)</option>
                {course.orderedTopics.map((p) => (
                  <option key={p.topic.id} value={p.topic.id}>
                    {p.number}. {p.topic.title}
                  </option>
                ))}
              </NativeSelect>
            )}
            {availableProviders.length > 0 && (
              <NativeSelect value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="Провайдер" className="lg:w-44">
                <option value="">Усі джерела</option>
                {availableProviders.map((p) => (
                  <option key={p} value={p}>
                    {PROVIDERS[p as keyof typeof PROVIDERS]?.label ?? p}
                  </option>
                ))}
              </NativeSelect>
            )}
            {availableTags.length > 0 && (
              <NativeSelect value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Тег" className="lg:w-44">
                <option value="">Усі теги</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </NativeSelect>
            )}
            <Button
              type="button"
              variant={favOnly ? "default" : "outline"}
              onClick={() => setFavOnly((f) => !f)}
              aria-pressed={favOnly}
            >
              <Star className={favOnly ? "fill-current" : ""} /> Обране
            </Button>
            {filtersActive && (
              <Button type="button" variant="ghost" onClick={reset}>
                <X /> Скинути
              </Button>
            )}
          </div>
        </div>
      )}

      {base.length > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtersActive ? `Знайдено: ${items.length} з ${base.length}` : countLabel(base.length, ["матеріал", "матеріали", "матеріалів"])}
        </p>
      )}

      {base.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Нічого не знайдено"
          description="Спробуйте змінити запит або скинути фільтри."
          action={
            <Button variant="outline" onClick={reset}>
              Скинути фільтри
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <MaterialCard key={m.id} m={m} topicLabel={hideTopicLabel ? undefined : course.topicLabel(m.topic_id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <MaterialCard key={m.id} m={m} view="list" topicLabel={hideTopicLabel ? undefined : course.topicLabel(m.topic_id)} />
          ))}
        </div>
      )}
    </div>
  );
}
