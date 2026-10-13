import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/common/FormDialog";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { fetchUpdatedAt, insertRow, updateVersioned } from "@/lib/api";
import { ConflictError, humanizeError } from "@/lib/errors";
import { qk, useCourse, useInvalidate } from "@/lib/queries";
import type { ClassRow, Section } from "@/lib/types";

/* ---------------- Розділ ---------------- */

const sectionSchema = z.object({
  title: z.string().trim().min(1, "Вкажіть назву розділу").max(200),
  description: z.string().max(5000),
  class_id: z.string().min(1, "Оберіть клас"),
});
type SectionValues = z.infer<typeof sectionSchema>;

export function SectionDialog({
  section,
  classId,
  onClose,
}: {
  section?: Section;
  classId?: string;
  onClose: () => void;
}) {
  const course = useCourse();
  const invalidate = useInvalidate();
  const [conflict, setConflict] = useState(false);
  const { register, handleSubmit, formState } = useForm<SectionValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title: section?.title ?? "",
      description: section?.description ?? "",
      class_id: section?.class_id ?? classId ?? course.classes[0]?.id ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ values, force }: { values: SectionValues; force?: boolean }) => {
      const payload: Record<string, unknown> = {
        title: values.title.trim(),
        description: values.description.trim(),
        class_id: values.class_id,
      };
      if (!section) {
        const siblings = course.sectionsByClass.get(values.class_id) ?? [];
        payload.sort_order = siblings.length ? Math.max(...siblings.map((s) => s.sort_order)) + 1 : 0;
        return insertRow<Section>("sections", payload);
      }
      const version = force ? await fetchUpdatedAt("sections", section.id) : section.updated_at;
      return updateVersioned<Section>("sections", section.id, version, payload);
    },
    onSuccess: async () => {
      await invalidate(qk.sections);
      toast.success(section ? "Розділ оновлено" : "Розділ створено");
      onClose();
    },
    onError: (e) => (e instanceof ConflictError ? setConflict(true) : toast.error(humanizeError(e))),
  });

  return (
    <FormDialog
      title={section ? "Редагувати розділ" : "Новий розділ"}
      isDirty={formState.isDirty}
      onClose={onClose}
      onSubmit={handleSubmit((values) => mutation.mutate({ values }))}
      submitting={mutation.isPending}
    >
      {conflict && (
        <ConflictBanner
          busy={mutation.isPending}
          onOverwrite={handleSubmit((values) => {
            setConflict(false);
            mutation.mutate({ values, force: true });
          })}
          onDiscard={async () => {
            await invalidate(qk.sections);
            onClose();
          }}
        />
      )}
      <Field label="Клас" htmlFor="s-class" required error={formState.errors.class_id?.message}>
        <NativeSelect id="s-class" {...register("class_id")}>
          {course.classes.length === 0 && <option value="">Спершу створіть клас</option>}
          {course.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Назва розділу" htmlFor="s-title" required error={formState.errors.title?.message}>
        <Input id="s-title" placeholder="Розділ 2. …" aria-invalid={!!formState.errors.title} {...register("title")} />
      </Field>
      <Field label="Опис" htmlFor="s-desc">
        <Textarea id="s-desc" rows={3} {...register("description")} />
      </Field>
    </FormDialog>
  );
}

/* ---------------- Клас ---------------- */

const classSchema = z.object({ title: z.string().trim().min(1, "Вкажіть назву класу").max(120) });
type ClassValues = z.infer<typeof classSchema>;

export function ClassDialog({ cls, onClose }: { cls?: ClassRow; onClose: () => void }) {
  const course = useCourse();
  const invalidate = useInvalidate();
  const [conflict, setConflict] = useState(false);
  const { register, handleSubmit, formState } = useForm<ClassValues>({
    resolver: zodResolver(classSchema),
    defaultValues: { title: cls?.title ?? "" },
  });

  const mutation = useMutation({
    mutationFn: async ({ values, force }: { values: ClassValues; force?: boolean }) => {
      if (!cls) {
        const order = course.classes.length ? Math.max(...course.classes.map((c) => c.sort_order)) + 1 : 0;
        return insertRow<ClassRow>("classes", { title: values.title.trim(), sort_order: order });
      }
      const version = force ? await fetchUpdatedAt("classes", cls.id) : cls.updated_at;
      return updateVersioned<ClassRow>("classes", cls.id, version, { title: values.title.trim() });
    },
    onSuccess: async () => {
      await invalidate(qk.classes);
      toast.success(cls ? "Клас перейменовано" : "Клас створено");
      onClose();
    },
    onError: (e) => (e instanceof ConflictError ? setConflict(true) : toast.error(humanizeError(e))),
  });

  return (
    <FormDialog
      title={cls ? "Перейменувати клас" : "Новий клас"}
      isDirty={formState.isDirty}
      onClose={onClose}
      onSubmit={handleSubmit((values) => mutation.mutate({ values }))}
      submitting={mutation.isPending}
      size="sm"
    >
      {conflict && (
        <ConflictBanner
          busy={mutation.isPending}
          onOverwrite={handleSubmit((values) => {
            setConflict(false);
            mutation.mutate({ values, force: true });
          })}
          onDiscard={async () => {
            await invalidate(qk.classes);
            onClose();
          }}
        />
      )}
      <Field label="Назва класу" htmlFor="c-title" required error={formState.errors.title?.message}>
        <Input id="c-title" placeholder="Наприклад: 8 клас" aria-invalid={!!formState.errors.title} {...register("title")} />
      </Field>
    </FormDialog>
  );
}
