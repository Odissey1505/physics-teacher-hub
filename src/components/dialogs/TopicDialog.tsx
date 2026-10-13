import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FormDialog } from "@/components/common/FormDialog";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { TOPIC_ICONS } from "@/lib/constants";
import { fetchUpdatedAt, insertRow, updateVersioned } from "@/lib/api";
import { ConflictError, humanizeError } from "@/lib/errors";
import { qk, useCourse, useInvalidate } from "@/lib/queries";
import { isSafeUrl } from "@/lib/providers";
import type { Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().trim().min(1, "Вкажіть назву теми").max(300, "Назва задовга"),
  description: z.string().max(5000, "Опис задовгий"),
  section_id: z.string().min(1, "Оберіть розділ"),
  icon: z.string().nullable(),
  image_url: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => !v || (isSafeUrl(v) && /^https:\/\//i.test(v)), "Адреса зображення має починатися з https://"),
});
type FormValues = z.infer<typeof schema>;

export function TopicDialog({ topic, sectionId, onClose }: { topic?: Topic; sectionId?: string; onClose: () => void }) {
  const course = useCourse();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [conflict, setConflict] = useState(false);

  const defaultSection = topic?.section_id ?? sectionId ?? course.currentSection?.id ?? course.sections[0]?.id ?? "";

  const { register, control, handleSubmit, formState, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: topic?.title ?? "",
      description: topic?.description ?? "",
      section_id: defaultSection,
      icon: topic?.icon ?? null,
      image_url: topic?.image_url ?? "",
    },
  });
  const imageUrl = watch("image_url");

  const mutation = useMutation({
    mutationFn: async ({ values, force }: { values: FormValues; force?: boolean }) => {
      const payload: Record<string, unknown> = {
        title: values.title.trim(),
        description: values.description.trim(),
        section_id: values.section_id,
        icon: values.icon,
        image_url: values.image_url.trim() || null,
      };
      if (!topic) {
        const siblings = course.topicsBySection.get(values.section_id) ?? [];
        payload.sort_order = siblings.length ? Math.max(...siblings.map((t) => t.sort_order)) + 1 : 0;
        return insertRow<Topic>("topics", payload);
      }
      if (values.section_id !== topic.section_id) {
        // Переміщення в інший розділ — тема стає останньою.
        const siblings = course.topicsBySection.get(values.section_id) ?? [];
        payload.sort_order = siblings.length ? Math.max(...siblings.map((t) => t.sort_order)) + 1 : 0;
      }
      const version = force ? await fetchUpdatedAt("topics", topic.id) : topic.updated_at;
      return updateVersioned<Topic>("topics", topic.id, version, payload);
    },
    onSuccess: async (saved) => {
      await invalidate(qk.topics);
      toast.success(topic ? "Тему оновлено" : "Тему створено");
      onClose();
      if (!topic) navigate(`/topics/${saved.id}`);
    },
    onError: (e) => (e instanceof ConflictError ? setConflict(true) : toast.error(humanizeError(e))),
  });

  return (
    <FormDialog
      title={topic ? "Редагувати тему" : "Нова тема"}
      isDirty={formState.isDirty}
      onClose={onClose}
      onSubmit={handleSubmit((values) => mutation.mutate({ values }))}
      submitting={mutation.isPending}
      size="lg"
    >
      {conflict && (
        <ConflictBanner
          busy={mutation.isPending}
          onOverwrite={handleSubmit((values) => {
            setConflict(false);
            mutation.mutate({ values, force: true });
          })}
          onDiscard={async () => {
            await invalidate(qk.topics);
            onClose();
          }}
        />
      )}
      <Field label="Назва теми" htmlFor="t-title" required error={formState.errors.title?.message}>
        <Input id="t-title" aria-invalid={!!formState.errors.title} {...register("title")} />
      </Field>
      <Field label="Опис" htmlFor="t-desc" error={formState.errors.description?.message}>
        <Textarea id="t-desc" rows={3} placeholder="Про що ця тема, ключові питання уроку…" {...register("description")} />
      </Field>
      <Field
        label="Розділ"
        htmlFor="t-section"
        required
        error={formState.errors.section_id?.message}
        hint={topic ? "Змініть розділ, щоб перемістити тему." : undefined}
      >
        <NativeSelect id="t-section" {...register("section_id")}>
          {course.sections.length === 0 && <option value="">Спершу створіть розділ</option>}
          {course.classes.map((c) => (
            <optgroup key={c.id} label={c.title}>
              {(course.sectionsByClass.get(c.id) ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Іконка (необов'язково)</legend>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Іконка теми">
              <button
                type="button"
                role="radio"
                aria-checked={field.value === null}
                onClick={() => field.onChange(null)}
                className={cn(
                  "h-10 rounded-lg border border-border px-3 text-xs text-muted-foreground transition hover:border-primary",
                  field.value === null && "border-primary bg-primary/10 text-primary",
                )}
              >
                Номер
              </button>
              {TOPIC_ICONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  title={label}
                  aria-label={label}
                  onClick={() => field.onChange(value)}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition hover:border-primary hover:text-primary",
                    field.value === value && "border-primary bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>
      <Field
        label="Зображення-обкладинка (URL, необов'язково)"
        htmlFor="t-img"
        error={formState.errors.image_url?.message}
      >
        <Input id="t-img" type="url" placeholder="https://…" {...register("image_url")} />
      </Field>
      {imageUrl && /^https:\/\//.test(imageUrl) && (
        <img src={imageUrl} alt="Попередній перегляд обкладинки" className="h-28 w-full rounded-lg object-cover" referrerPolicy="no-referrer" />
      )}
    </FormDialog>
  );
}
