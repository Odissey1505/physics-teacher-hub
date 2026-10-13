import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { FormDialog } from "@/components/common/FormDialog";
import { TagInput } from "@/components/common/TagInput";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { MATERIAL_TYPES } from "@/lib/constants";
import { PROVIDERS, detectProvider, getThumbnail, isSafeUrl } from "@/lib/providers";
import { insertRow } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useInvalidate } from "@/lib/queries";
import type { MaterialType } from "@/lib/types";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Вставте посилання")
    .max(2048)
    .refine((v) => isSafeUrl(v), "Посилання має починатися з http:// або https://"),
  title: z.string().trim().min(1, "Вкажіть назву").max(300),
  type: z.string(),
  description: z.string().max(5000),
  tags: z.array(z.string()).max(20),
});
type FormValues = z.infer<typeof schema>;

/** «+ Швидко зберегти посилання» — у Скарбничку, без вибору теми. */
export function QuickSaveDialog({ onClose }: { onClose: () => void }) {
  const invalidate = useInvalidate();
  const [more, setMore] = useState(false);
  const { register, control, handleSubmit, formState, setValue, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", title: "", type: "auto", description: "", tags: [] },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = values.url.trim();
      const provider = detectProvider(url);
      const type = (values.type === "auto" ? PROVIDERS[provider ?? "other"].suggestedType : values.type) as MaterialType;
      return insertRow("materials", {
        topic_id: null,
        type,
        title: values.title.trim(),
        url,
        description: values.description.trim(),
        provider,
        thumbnail_url: getThumbnail(url),
        tags: values.tags,
      });
    },
    onSuccess: async () => {
      await invalidate(qk.materials);
      toast.success("Збережено у Скарбничку матеріалів");
      onClose();
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <FormDialog
      title="Швидко зберегти посилання"
      description="Посилання потрапить у «Скарбничку матеріалів». Тему можна обрати пізніше."
      isDirty={formState.isDirty}
      onClose={onClose}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel="Зберегти у Скарбничку"
    >
      <Field label="Посилання" htmlFor="q-url" required error={formState.errors.url?.message}>
        <Input
          id="q-url"
          type="url"
          inputMode="url"
          autoFocus
          placeholder="https://…"
          aria-invalid={!!formState.errors.url}
          {...register("url", {
            onChange: (e) => {
              const p = detectProvider(e.target.value);
              if (p && !getValues("title")) {
                // Назву з чужого сайту не завантажуємо (CORS) — пропонуємо заготовку з назвою сервісу.
                setValue("title", p === "other" ? "" : `${PROVIDERS[p].label}: `, { shouldDirty: true });
              }
            },
          })}
        />
      </Field>
      <Field label="Назва" htmlFor="q-title" required error={formState.errors.title?.message}>
        <Input id="q-title" aria-invalid={!!formState.errors.title} {...register("title")} />
      </Field>
      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        aria-expanded={more}
      >
        <ChevronDown className={`size-4 transition ${more ? "rotate-180" : ""}`} />
        Додатково: тип, опис, теги
      </button>
      {more && (
        <div className="space-y-4">
          <Field label="Тип" htmlFor="q-type">
            <NativeSelect id="q-type" {...register("type")}>
              <option value="auto">Визначити автоматично</option>
              {MATERIAL_TYPES.filter((t) => t.requiresUrl || t.value === "other").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Опис" htmlFor="q-desc">
            <Textarea id="q-desc" rows={2} {...register("description")} />
          </Field>
          <Field label="Теги" htmlFor="q-tags">
            <Controller
              control={control}
              name="tags"
              render={({ field }) => <TagInput id="q-tags" value={field.value} onChange={field.onChange} />}
            />
          </Field>
        </div>
      )}
    </FormDialog>
  );
}
