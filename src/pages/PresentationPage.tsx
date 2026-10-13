import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  ListOrdered,
  Eye,
  Loader2,
  Lightbulb,
  Target,
  BookA,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/menu";
import { ErrorState } from "@/components/common/States";
import { MathFormula, RichText, TextWithMath } from "@/components/common/Math";
import { MaterialEmbed } from "@/components/materials/MaterialEmbed";
import { QuestionView, type AnswerValue } from "@/components/quizzes/QuestionView";
import { BrandMark } from "@/components/layout/Brand";
import { fetchPresentationData, gradeAnswer, type PresentationData } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { MATERIAL_TYPE_MAP } from "@/lib/constants";
import { isEmptyHtml, sanitizeHtml } from "@/lib/sanitize";
import { useCourse } from "@/lib/queries";
import type { GradeResult, QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type Slide =
  | { kind: "title"; label: string }
  | { kind: "overview"; label: string }
  | { kind: "concepts"; label: string }
  | { kind: "theory"; label: string; html: string }
  | { kind: "material"; label: string; m: PresentationData["materials"][number] }
  | { kind: "formula"; label: string; f: PresentationData["formulas"][number] }
  | { kind: "question"; label: string; q: QuizQuestion; n: number; total: number; quizTitle: string };

/** Ділить теорію на слайди за заголовками h2. */
function splitTheory(html: string): { title: string; html: string }[] {
  const clean = sanitizeHtml(html);
  if (isEmptyHtml(clean)) return [];
  const container = document.createElement("div");
  container.innerHTML = clean;
  const parts: { title: string; html: string }[] = [];
  let cur: { title: string; nodes: Node[] } = { title: "Теорія", nodes: [] };
  for (const node of Array.from(container.childNodes)) {
    if (node.nodeName === "H2" || node.nodeName === "H1") {
      if (cur.nodes.length) parts.push({ title: cur.title, html: serialize(cur.nodes) });
      cur = { title: node.textContent?.trim() || "Теорія", nodes: [node] };
    } else cur.nodes.push(node);
  }
  if (cur.nodes.length) parts.push({ title: cur.title, html: serialize(cur.nodes) });
  return parts;
}
function serialize(nodes: Node[]) {
  const d = document.createElement("div");
  nodes.forEach((n) => d.appendChild(n.cloneNode(true)));
  return d.innerHTML;
}

const MATERIAL_ORDER = ["presentation", "video", "simulation", "experiment", "summary", "document", "formula", "link", "other", "test", "control_work", "quiz", "game"];

function QuestionSlide({ q }: { q: QuizQuestion }) {
  const [value, setValue] = useState<AnswerValue>(null);
  const [reveal, setReveal] = useState<GradeResult | null>(null);
  // Відповідь запитується з сервера лише після натискання вчителем «Показати відповідь».
  const mutation = useMutation({
    mutationFn: () => gradeAnswer(q.id, value),
    onSuccess: setReveal,
    onError: (e) => toast.error(humanizeError(e)),
  });
  return (
    <div className="space-y-6">
      <QuestionView question={q} value={value} onChange={setValue} locked={!!reveal} large result={value !== null && reveal ? reveal : null} />
      {reveal && value === null && (
        <div role="status" className="rounded-xl border border-success/50 bg-success/10 p-5 text-xl">
          <p className="font-semibold">Правильна відповідь:</p>
          <TextWithMath text={reveal.correct_answer ?? "—"} />
          {reveal.explanation && <TextWithMath text={reveal.explanation} className="mt-2 text-lg text-muted-foreground" />}
        </div>
      )}
      {!reveal && (
        <Button size="lg" variant="secondary" onClick={() => mutation.mutate()} loading={mutation.isPending}>
          <Eye /> Показати відповідь
        </Button>
      )}
    </div>
  );
}

export default function PresentationPage() {
  const { topicId = "" } = useParams();
  const navigate = useNavigate();
  const course = useCourse();
  const path = course.pathById.get(topicId);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const data = useQuery({
    queryKey: ["presentation", topicId],
    queryFn: () => fetchPresentationData(topicId),
    enabled: !!topicId,
  });

  const slides = useMemo<Slide[]>(() => {
    if (!data.data || !path) return [];
    const d = data.data;
    const out: Slide[] = [{ kind: "title", label: "Титульний слайд" }];
    const c = d.content;
    if (c && (c.summary || c.objectives.length)) out.push({ kind: "overview", label: "Огляд" });
    if (c && (c.key_concepts.length || c.definitions.length)) out.push({ kind: "concepts", label: "Поняття та визначення" });
    for (const part of splitTheory(c?.theory_html ?? "")) out.push({ kind: "theory", label: part.title, html: part.html });
    const mats = [...d.materials].sort(
      (a, b) => MATERIAL_ORDER.indexOf(a.type) - MATERIAL_ORDER.indexOf(b.type) || a.sort_order - b.sort_order,
    );
    const beforeFormulas = mats.filter((m) => ["presentation", "video"].includes(m.type));
    const afterFormulas = mats.filter((m) => !["presentation", "video"].includes(m.type));
    for (const m of beforeFormulas) out.push({ kind: "material", label: m.title, m });
    for (const f of d.formulas) out.push({ kind: "formula", label: f.name, f });
    for (const m of afterFormulas) out.push({ kind: "material", label: m.title, m });
    for (const quiz of d.quizzes) {
      const qs = d.questions.filter((q) => q.quiz_id === quiz.id);
      qs.forEach((q, i) => out.push({ kind: "question", label: `${quiz.title}: питання ${i + 1}`, q, n: i + 1, total: qs.length, quizTitle: quiz.title }));
    }
    return out;
  }, [data.data, path]);

  const total = slides.length;
  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(i, total - 1))), [total]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      // Увесь документ, щоб спливаючі меню (портали) теж були видимі.
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.error("Браузер не дозволив повноекранний режим");
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    document.title = path ? `Презентація: ${path.topic.title}` : "Режим презентації";
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(index + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
      else if (e.key.toLowerCase() === "f" || e.key.toLowerCase() === "а") toggleFullscreen();
      else if (e.key === "Escape" && !document.fullscreenElement) navigate(`/topics/${topicId}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, go, toggleFullscreen, navigate, topicId, path]);

  if (course.isLoading || data.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!path) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="text-center">
          <p className="text-lg">Тему не знайдено.</p>
          <Button asChild className="mt-4">
            <Link to="/">На головну</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (data.isError) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorState error={data.error} onRetry={() => data.refetch()} />
      </div>
    );
  }

  const slide = slides[Math.min(index, total - 1)];
  const c = data.data?.content;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-5">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/topics/${topicId}`}>
            <ArrowLeft /> <span className="hidden sm:inline">Вийти</span>
          </Link>
        </Button>
        <BrandMark className="size-7" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {path.number}. {path.topic.title}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="Перелік слайдів">
              <ListOrdered /> <span className="tabular-nums">{index + 1} / {total}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[70vh] w-80 overflow-y-auto">
            {slides.map((s, i) => (
              <DropdownMenuItem key={i} onSelect={() => go(i)} className={cn(i === index && "bg-primary/10 text-primary")}>
                <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="truncate">{s.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={fullscreen ? "Вийти з повноекранного режиму" : "На весь екран"} title="F">
          {fullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </header>

      <main className="relative flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="mx-auto flex min-h-full max-w-6xl flex-col justify-center px-5 py-8 text-lg sm:px-10 sm:text-xl"
          >
            {slide?.kind === "title" && (
              <div className="field-lines rounded-3xl py-16 text-center">
                <p className="text-xl text-primary">
                  {path.cls?.title} · {path.section?.title}
                </p>
                <p className="mt-6 text-2xl font-medium text-muted-foreground">Тема {path.number}</p>
                <h1 className="mx-auto mt-2 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">{path.topic.title}</h1>
                {path.topic.description && <p className="mx-auto mt-6 max-w-3xl text-xl text-muted-foreground">{path.topic.description}</p>}
              </div>
            )}

            {slide?.kind === "overview" && c && (
              <div className="space-y-8">
                <h2 className="text-4xl font-bold">Про що урок</h2>
                {c.summary && <p className="whitespace-pre-line text-2xl leading-relaxed">{c.summary}</p>}
                {c.objectives.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-2xl font-semibold text-success">
                      <Target className="size-7" /> Сьогодні ми навчимося
                    </h3>
                    <ul className="list-disc space-y-2 pl-8 text-2xl">
                      {c.objectives.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {slide?.kind === "concepts" && c && (
              <div className="space-y-8">
                {c.key_concepts.length > 0 && (
                  <div>
                    <h2 className="mb-4 flex items-center gap-2 text-4xl font-bold">
                      <Lightbulb className="size-9 text-warning" /> Ключові поняття
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {c.key_concepts.map((k) => (
                        <span key={k} className="rounded-full bg-primary/15 px-5 py-2 text-2xl text-primary">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {c.definitions.length > 0 && (
                  <div>
                    <h2 className="mb-4 flex items-center gap-2 text-4xl font-bold">
                      <BookA className="size-9 text-primary" /> Визначення
                    </h2>
                    <dl className="space-y-4">
                      {c.definitions.map((d, i) => (
                        <div key={i} className="rounded-2xl border border-border bg-surface p-5">
                          <dt className="text-2xl font-bold">{d.term}</dt>
                          <dd className="mt-1 text-2xl text-muted-foreground">{d.definition}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}

            {slide?.kind === "theory" && <RichText html={slide.html} className="text-2xl [&_h1]:text-5xl [&_h2]:text-4xl [&_h3]:text-3xl" />}

            {slide?.kind === "formula" && (
              <div className="space-y-8 text-center">
                <h2 className="text-4xl font-bold">{slide.f.name}</h2>
                <div className="rounded-3xl border border-border bg-surface px-6 py-10 text-4xl sm:text-5xl">
                  <MathFormula latex={slide.f.latex} />
                </div>
                {slide.f.explanation && <TextWithMath text={slide.f.explanation} className="mx-auto max-w-4xl text-2xl text-muted-foreground" />}
                {slide.f.quantities.length > 0 && (
                  <div className="mx-auto grid max-w-3xl gap-2 text-left text-2xl">
                    {slide.f.quantities.map((q, i) => (
                      <div key={i} className="flex items-center gap-4 border-b border-border py-2">
                        <span className="w-20">
                          <MathFormula latex={q.symbol} display={false} />
                        </span>
                        <span className="flex-1">{q.name}</span>
                        <span className="text-muted-foreground">{q.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {slide?.kind === "material" && (
              <div className="space-y-5">
                <div>
                  <p className="text-base text-primary">{MATERIAL_TYPE_MAP[slide.m.type].label}</p>
                  <h2 className="text-3xl font-bold sm:text-4xl">{slide.m.title}</h2>
                  {slide.m.description && <p className="mt-2 text-xl text-muted-foreground">{slide.m.description}</p>}
                </div>
                {slide.m.url && <MaterialEmbed url={slide.m.url} title={slide.m.title} large />}
                {!isEmptyHtml(slide.m.content_html) && <RichText html={slide.m.content_html} className="text-2xl" />}
              </div>
            )}

            {slide?.kind === "question" && (
              <div className="space-y-4">
                <p className="text-lg text-primary">
                  {slide.quizTitle} · питання {slide.n} з {slide.total}
                </p>
                <QuestionSlide key={slide.q.id} q={slide.q} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="flex h-16 shrink-0 items-center justify-between gap-3 border-t border-border px-3 sm:px-5">
        <Button variant="outline" size="lg" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Попередній слайд">
          <ChevronLeft /> <span className="hidden sm:inline">Назад</span>
        </Button>
        <div className="hidden flex-1 items-center justify-center gap-1 md:flex" aria-hidden>
          {slides.length <= 40 &&
            slides.map((_, i) => (
              <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-1.5 bg-border")} />
            ))}
        </div>
        <p className="text-xs text-muted-foreground md:hidden">
          {index + 1} / {total}
        </p>
        <Button size="lg" onClick={() => go(index + 1)} disabled={index >= total - 1} aria-label="Наступний слайд">
          <span className="hidden sm:inline">Далі</span> <ChevronRight />
        </Button>
      </footer>
      <p className="sr-only" aria-live="polite">
        Слайд {index + 1} з {total}: {slide?.label}
      </p>
    </div>
  );
}
