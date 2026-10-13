import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, BookOpenText, Sigma, NotebookPen, ListChecks, CornerDownLeft } from "lucide-react";
import { MATERIAL_TYPE_MAP } from "@/lib/constants";
import { useCourse, useFormulas, useMaterials, useNotes, useQuizzes } from "@/lib/queries";
import { matchesQuery, normalizeSearch, stripHtml, cn } from "@/lib/utils";
import { providerLabel } from "@/lib/providers";

interface Result {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const GROUP_LIMIT = 8;

/** Глобальний пошук у межах акаунта: теми, матеріали, теги, формули, нотатки, квізи. */
export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const course = useCourse();
  const materials = useMaterials();
  const formulas = useFormulas();
  const notes = useNotes();
  const quizzes = useQuizzes();

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = normalizeSearch(query);
    if (q.length < 2) return [];
    const out: Result[] = [];
    const push = (items: Result[]) => out.push(...items.slice(0, GROUP_LIMIT));

    push(
      course.orderedTopics
        .filter((p) => matchesQuery(`${p.topic.title} ${p.topic.description}`, q))
        .map((p) => ({
          id: p.topic.id,
          group: "Теми",
          title: `${p.number}. ${p.topic.title}`,
          subtitle: [p.cls?.title, p.section?.title].filter(Boolean).join(" · "),
          to: `/topics/${p.topic.id}`,
          icon: BookOpenText,
        })),
    );
    push(
      (materials.data ?? [])
        .filter((m) =>
          matchesQuery(
            `${m.title} ${m.description} ${m.tags.join(" ")} ${MATERIAL_TYPE_MAP[m.type].label} ${providerLabel(m.provider) ?? ""} ${stripHtml(m.content_html)}`,
            q,
          ),
        )
        .map((m) => ({
          id: m.id,
          group: "Матеріали",
          title: m.title,
          subtitle: `${MATERIAL_TYPE_MAP[m.type].label} · ${course.topicLabel(m.topic_id)}${m.tags.length ? ` · #${m.tags.join(" #")}` : ""}`,
          to: `/materials/${m.id}`,
          icon: MATERIAL_TYPE_MAP[m.type].icon,
        })),
    );
    push(
      (formulas.data ?? [])
        .filter((f) => matchesQuery(`${f.name} ${f.explanation} ${f.quantities.map((x) => x.name).join(" ")}`, q))
        .map((f) => ({
          id: f.id,
          group: "Формули",
          title: f.name,
          subtitle: f.topic_id ? course.topicLabel(f.topic_id) : "Довідник формул",
          to: `/formulas?focus=${f.id}`,
          icon: Sigma,
        })),
    );
    push(
      (quizzes.data ?? [])
        .filter((z) => matchesQuery(`${z.title} ${z.description}`, q))
        .map((z) => ({
          id: z.id,
          group: "Вбудовані квізи",
          title: z.title,
          subtitle: z.topic_id ? course.topicLabel(z.topic_id) : "Без теми",
          to: `/quizzes/${z.id}/edit`,
          icon: ListChecks,
        })),
    );
    push(
      (notes.data ?? [])
        .filter((n) => matchesQuery(`${n.title} ${stripHtml(n.body_html)}`, q))
        .map((n) => ({
          id: n.id,
          group: "Нотатки вчителя",
          title: n.title,
          subtitle: course.topicLabel(n.topic_id),
          to: `/topics/${n.topic_id}/notes`,
          icon: NotebookPen,
        })),
    );
    return out;
  }, [query, course, materials.data, formulas.data, notes.data, quizzes.data]);

  useEffect(() => setActive(0), [query]);

  const go = (r: Result) => {
    onOpenChange(false);
    navigate(r.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const loading = materials.isLoading || course.isLoading;
  let lastGroup = "";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-[8vh] z-50 flex max-h-[80vh] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">Пошук</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Пошук за темами, матеріалами, тегами, формулами та нотатками
          </DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-5 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Шукати теми, матеріали, теги, формули, нотатки… (напр. «Ерстед»)"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              aria-label="Пошуковий запит"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            />
          </div>
          <div ref={listRef} id="search-results" role="listbox" className="flex-1 overflow-y-auto p-2">
            {normalizeSearch(query).length < 2 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Введіть щонайменше 2 символи. Пошук охоплює назви, описи, теги та ваші приватні нотатки.
              </p>
            ) : loading ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Завантаження даних…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Нічого не знайдено за запитом «{query}».
              </p>
            ) : (
              results.map((r, i) => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                const Icon = r.icon;
                return (
                  <div key={`${r.group}-${r.id}`}>
                    {header && (
                      <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {header}
                      </p>
                    )}
                    <button
                      type="button"
                      id={`sr-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(r)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
                        i === active && "bg-primary/10",
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                      </span>
                      {i === active && <CornerDownLeft className="size-4 text-muted-foreground" aria-hidden />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
