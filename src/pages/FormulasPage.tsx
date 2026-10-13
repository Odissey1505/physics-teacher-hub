import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Sigma, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { CardGridSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/common/States";
import { FormulaCard } from "@/components/formulas/FormulaCard";
import { usePageMeta } from "@/context/page-meta";
import { useDialogs } from "@/context/dialogs";
import { useCourse, useFormulas } from "@/lib/queries";
import { matchesQuery } from "@/lib/utils";

export function FormulasPage() {
  usePageMeta("Довідник формул", [{ label: "Головна", to: "/" }, { label: "Довідник формул" }]);
  const formulas = useFormulas();
  const course = useCourse();
  const dialogs = useDialogs();
  const [params] = useSearchParams();
  const focus = params.get("focus");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [calcOnly, setCalcOnly] = useState(false);

  // Порядок: за порядком тем у курсі, потім без теми.
  const ordered = useMemo(() => {
    const index = new Map(course.orderedTopics.map((p, i) => [p.topic.id, i]));
    return [...(formulas.data ?? [])].sort((a, b) => {
      const ai = a.topic_id ? (index.get(a.topic_id) ?? 9999) : 10000;
      const bi = b.topic_id ? (index.get(b.topic_id) ?? 9999) : 10000;
      return ai - bi || a.sort_order - b.sort_order || a.name.localeCompare(b.name, "uk");
    });
  }, [formulas.data, course.orderedTopics]);

  const list = ordered.filter((f) => {
    if (topic === "__none" && f.topic_id) return false;
    if (topic && topic !== "__none" && f.topic_id !== topic) return false;
    if (calcOnly && !f.calculator_key) return false;
    if (query && !matchesQuery(`${f.name} ${f.latex} ${f.explanation} ${f.quantities.map((q) => `${q.name} ${q.symbol}`).join(" ")}`, query))
      return false;
    return true;
  });

  useEffect(() => {
    if (!focus || formulas.isLoading) return;
    const el = document.getElementById(`formula-${focus}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focus, formulas.isLoading]);

  return (
    <>
      <PageHeader
        title="Довідник формул"
        description="Формули з поясненнями, величинами, одиницями та калькуляторами."
        icon={Sigma}
        actions={
          <Button onClick={() => dialogs.openFormula()}>
            <Plus /> Додати формулу
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук формули або величини…" className="pl-9" aria-label="Пошук формул" />
        </div>
        <NativeSelect value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Тема" className="md:w-72">
          <option value="">Усі теми</option>
          <option value="__none">Без прив'язки до теми</option>
          {course.orderedTopics.map((p) => (
            <option key={p.topic.id} value={p.topic.id}>
              {p.number}. {p.topic.title}
            </option>
          ))}
        </NativeSelect>
        <Button variant={calcOnly ? "default" : "outline"} onClick={() => setCalcOnly((c) => !c)} aria-pressed={calcOnly}>
          <Calculator /> З калькулятором
        </Button>
      </div>

      {formulas.isLoading ? (
        <CardGridSkeleton />
      ) : formulas.isError ? (
        <ErrorState error={formulas.error} onRetry={() => formulas.refetch()} />
      ) : (formulas.data ?? []).length === 0 ? (
        <EmptyState
          icon={Sigma}
          title="Довідник порожній"
          description="Додайте першу формулу, наприклад силу Ампера — з калькулятором і прикладом розрахунку."
          action={
            <Button onClick={() => dialogs.openFormula()}>
              <Plus /> Додати формулу
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState icon={Search} title="Формул не знайдено" description="Змініть запит або фільтри." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((f) => (
            <FormulaCard
              key={f.id}
              formula={f}
              highlighted={f.id === focus}
              topicLabel={f.topic_id ? course.topicLabel(f.topic_id) : "Без теми"}
            />
          ))}
        </div>
      )}
    </>
  );
}
