import { useEffect, useMemo, useState } from "react";
import { NativeSelect, Label } from "@/components/ui/form-controls";
import { useCourse } from "@/lib/queries";

/**
 * Каскадний вибір «Клас → Розділ → Тема».
 * value = null означає «Скарбничка» (без теми), якщо allowNone.
 */
export function TopicPicker({
  value,
  onChange,
  allowNone = true,
  noneLabel = "— Без теми (у Скарбничку) —",
  idPrefix = "tp",
  error,
}: {
  value: string | null;
  onChange: (topicId: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  idPrefix?: string;
  error?: string;
}) {
  const course = useCourse();
  const path = value ? course.pathById.get(value) : undefined;

  const [classId, setClassId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");

  // Синхронізація з обраною темою або поточним розділом.
  useEffect(() => {
    if (path?.section) {
      setSectionId(path.section.id);
      setClassId(path.section.class_id);
    } else if (!classId && course.classes.length) {
      const cur = course.currentSection;
      setClassId(cur?.class_id ?? course.classes[0].id);
      setSectionId(cur?.id ?? course.sectionsByClass.get(course.classes[0].id)?.[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path?.section?.id, course.classes.length]);

  const sections = useMemo(() => course.sectionsByClass.get(classId) ?? [], [course.sectionsByClass, classId]);
  const topics = useMemo(() => course.topicsBySection.get(sectionId) ?? [], [course.topicsBySection, sectionId]);

  if (course.isLoading) {
    return <p className="text-sm text-muted-foreground">Завантаження структури курсу…</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-class`}>Клас</Label>
        <NativeSelect
          id={`${idPrefix}-class`}
          value={classId}
          onChange={(e) => {
            const c = e.target.value;
            setClassId(c);
            const firstSection = course.sectionsByClass.get(c)?.[0]?.id ?? "";
            setSectionId(firstSection);
            if (value) onChange(allowNone ? null : (course.topicsBySection.get(firstSection)?.[0]?.id ?? null));
          }}
        >
          {course.classes.length === 0 && <option value="">Немає класів</option>}
          {course.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-section`}>Розділ</Label>
        <NativeSelect
          id={`${idPrefix}-section`}
          value={sectionId}
          onChange={(e) => {
            setSectionId(e.target.value);
            if (value) onChange(allowNone ? null : (course.topicsBySection.get(e.target.value)?.[0]?.id ?? null));
          }}
        >
          {sections.length === 0 && <option value="">Немає розділів</option>}
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-topic`}>Тема</Label>
        <NativeSelect
          id={`${idPrefix}-topic`}
          value={value ?? ""}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value || null)}
        >
          {allowNone ? <option value="">{noneLabel}</option> : !value && <option value="">— Оберіть тему —</option>}
          {topics.map((t, i) => (
            <option key={t.id} value={t.id}>
              {i + 1}. {t.title}
            </option>
          ))}
        </NativeSelect>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    </div>
  );
}
