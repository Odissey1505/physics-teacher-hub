import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Info, Lock, Users } from "lucide-react";
import { FormDialog } from "@/components/common/FormDialog";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { TagInput } from "@/components/common/TagInput";
import { TopicPicker } from "@/components/common/TopicPicker";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { Field, Input, NativeSelect, Switch, Textarea, Label } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/misc";
import { MATERIAL_TYPES, MATERIAL_TYPE_MAP, VISIBILITY_LABELS } from "@/lib/constants";
import { PROVIDERS, detectProvider, embedHint, getEmbed, getThumbnail, isSafeUrl } from "@/lib/providers";
import { insertRow, updateVersioned, fetchUpdatedAt } from "@/lib/api";
import { ConflictError, humanizeError } from "@/lib/errors";
import { qk, useInvalidate, useMaterials } from "@/lib/queries";
import type { Material, MaterialType } from "@/lib/types";
import type { MaterialDefaults } from "@/context/dialogs";
import { cn } from "@/lib/utils";

const TYPE_VALUES = MATERIAL_TYPES.map((t) => t.value) as [MaterialType, ...MaterialType[]];

const schema = z
  .object({
    type: z.enum(TYPE_VALUES),
    title: z.string().trim().min(1, "Вкажіть назву").max(300, "Назва задовга (до 300 символів)"),
    url: z
      .string()
      .trim()
      .max(2048, "Посилання задовге")
      .refine((v) => !v || isSafeUrl(v), "Посилання має починатися з http:// або https://"),
    description: z.string().max(5000, "Опис задовгий (до 5000 символів)"),
    topic_id: z.string().nullable(),
    tags: z.array(z.string()).max(20, "Не більше 20 тегів"),
    visibility: z.enum(["teacher", "students"]),
    is_favorite: z.boolean(),
    content_html: z.string().max(300000, "Текст занадто великий"),
  })
  .superRefine((v, ctx) => {
    if (MATERIAL_TYPE_MAP[v.type].requiresUrl && !v.url) {
      ctx.addIssue({ path: ["url"], code: "custom", message: "Для цього типу матеріалу потрібне посилання" });
    }
  });

type FormValues = z.infer<typeof schema>;

export function MaterialDialog({
  material,
  defaults,
  onClose,
}: {
  material?: Material;
  defaults?: MaterialDefaults;
  onClose: () => void;
}) {
  const invalidate = useInvalidate();
  const allMaterials = useMaterials();
  const [conflict, setConflict] = useState(false);
  const typeTouched = useRef(!!material || !!defaults?.type);
  const [showContent, setShowContent] = useState(
    () => !!material?.content_html || MATERIAL_TYPE_MAP[material?.type ?? defaults?.type ?? "link"].written,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: material?.type ?? defaults?.type ?? "link",
      title: material?.title ?? defaults?.title ?? "",
      url: material?.url ?? defaults?.url ?? "",
      description: material?.description ?? "",
      topic_id: material ? material.topic_id : (defaults?.topicId ?? null),
      tags: material?.tags ?? [],
      visibility: material?.visibility ?? "teacher",
      is_favorite: material?.is_favorite ?? false,
      content_html: material?.content_html ?? "",
    },
  });
  const { register, control, handleSubmit, watch, setValue, formState } = form;
  const url = watch("url");
  const type = watch("type");
  const provider = useMemo(() => detectProvider(url), [url]);
  const thumb = useMemo(() => getThumbnail(url), [url]);
  const embeddable = useMemo(() => !!getEmbed(url), [url]);
  const typeInfo = MATERIAL_TYPE_MAP[type];

  const usedTags = useMemo(
    () => [...new Set((allMaterials.data ?? []).flatMap((m) => m.tags))].slice(0, 30),
    [allMaterials.data],
  );

  const mutation = useMutation({
    mutationFn: async ({ values, force }: { values: FormValues; force?: boolean }) => {
      const cleanUrl = values.url.trim() || null;
      const payload = {
        type: values.type,
        title: values.title.trim(),
        url: cleanUrl,
        description: values.description.trim(),
        provider: cleanUrl ? detectProvider(cleanUrl) : null,
        thumbnail_url: getThumbnail(cleanUrl),
        content_html: showContent ? values.content_html : material?.content_html ?? "",
        tags: values.tags,
        visibility: values.visibility,
        is_favorite: values.is_favorite,
        topic_id: values.topic_id,
      };
      if (!material) return insertRow<Material>("materials", payload);
      const version = force ? await fetchUpdatedAt("materials", material.id) : material.updated_at;
      return updateVersioned<Material>("materials", material.id, version, payload);
    },
    onSuccess: async () => {
      // Чекаємо підтвердження бази, оновлюємо списки та статистику, лише потім закриваємо форму.
      await invalidate(qk.materials);
      toast.success(material ? "Матеріал оновлено" : "Матеріал збережено");
      onClose();
    },
    onError: (e) => {
      if (e instanceof ConflictError) setConflict(true);
      else toast.error(humanizeError(e));
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate({ values }));

  return (
    <FormDialog
      title={material ? "Редагувати матеріал" : "Додати матеріал"}
      description="Заповніть назву та посилання — решта полів необов'язкові."
      isDirty={formState.isDirty}
      onClose={onClose}
      onSubmit={onSubmit}
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
            await invalidate(qk.materials);
            onClose();
          }}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
        <Field label="Тип матеріалу" htmlFor="m-type" required>
          <NativeSelect
            id="m-type"
            {...register("type", {
              onChange: (e) => {
                typeTouched.current = true;
                if (MATERIAL_TYPE_MAP[e.target.value as MaterialType].written) setShowContent(true);
              },
            })}
          >
            {MATERIAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Посилання (URL)"
          htmlFor="m-url"
          required={typeInfo.requiresUrl}
          error={formState.errors.url?.message}
          hint={typeInfo.requiresUrl ? undefined : "Необов'язково для письмових матеріалів"}
        >
          <Input
            id="m-url"
            type="url"
            inputMode="url"
            placeholder="https://…"
            aria-invalid={!!formState.errors.url}
            {...register("url", {
              onChange: (e) => {
                const p = detectProvider(e.target.value);
                if (p && !typeTouched.current) {
                  setValue("type", PROVIDERS[p].suggestedType, { shouldDirty: true });
                }
              },
            })}
          />
        </Field>
      </div>

      {provider && (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-elevated/40 p-3 text-sm">
          {thumb && (
            <img src={thumb} alt="" className="h-16 w-28 shrink-0 rounded-md object-cover" referrerPolicy="no-referrer" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{PROVIDERS[provider].label}</Badge>
              <Badge variant={embeddable ? "success" : "muted"}>
                {embeddable ? "Можна переглядати всередині застосунку" : "Відкриватиметься в новій вкладці"}
              </Badge>
            </div>
            {embedHint(provider) && (
              <p className="flex gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" /> {embedHint(provider)}
              </p>
            )}
            {!typeTouched.current && (
              <p className="text-xs text-muted-foreground">
                Тип підібрано автоматично: «{MATERIAL_TYPE_MAP[PROVIDERS[provider].suggestedType].label}». Його можна змінити.
              </p>
            )}
          </div>
          {isSafeUrl(url) && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Перевірити <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      <Field label="Назва" htmlFor="m-title" required error={formState.errors.title?.message}>
        <Input
          id="m-title"
          placeholder="Наприклад: Дослід Ерстеда — відео"
          aria-invalid={!!formState.errors.title}
          {...register("title")}
        />
      </Field>

      <Field label="Опис" htmlFor="m-desc" error={formState.errors.description?.message}>
        <Textarea id="m-desc" rows={3} placeholder="Коротко: для чого цей матеріал, на якому етапі уроку…" {...register("description")} />
      </Field>

      <Controller
        control={control}
        name="topic_id"
        render={({ field }) => <TopicPicker value={field.value} onChange={field.onChange} idPrefix="m" />}
      />

      <Field label="Теги" htmlFor="m-tags">
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput id="m-tags" value={field.value} onChange={field.onChange} extraSuggestions={usedTags} />
          )}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium">Видимість</legend>
          <Controller
            control={control}
            name="visibility"
            render={({ field }) => (
              <div className="grid gap-2" role="radiogroup">
                {(["teacher", "students"] as const).map((v) => (
                  <label
                    key={v}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition",
                      field.value === v && "border-primary bg-primary/10",
                    )}
                  >
                    <input
                      type="radio"
                      className="accent-[var(--primary)]"
                      checked={field.value === v}
                      onChange={() => field.onChange(v)}
                    />
                    {v === "teacher" ? <Lock className="size-4 text-muted-foreground" /> : <Users className="size-4 text-muted-foreground" />}
                    {VISIBILITY_LABELS[v]}
                  </label>
                ))}
              </div>
            )}
          />
          <p className="text-xs text-muted-foreground">У режимі презентації показуються лише матеріали «Можна демонструвати учням».</p>
        </fieldset>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="m-fav">Додати в обране</Label>
            <Controller
              control={control}
              name="is_favorite"
              render={({ field }) => <Switch id="m-fav" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="m-content-toggle">Письмовий вміст (текст, завдання)</Label>
            <Switch id="m-content-toggle" checked={showContent} onCheckedChange={setShowContent} />
          </div>
        </div>
      </div>

      {showContent && (
        <div className="space-y-1.5">
          <Label>Вміст матеріалу</Label>
          <Controller
            control={control}
            name="content_html"
            render={({ field }) => (
              <RichTextEditor
                value={field.value}
                onChange={field.onChange}
                minHeight={180}
                ariaLabel="Вміст матеріалу"
                placeholder="Текст конспекту, хід досліду, завдання тесту… Формули — між знаками $…$"
              />
            )}
          />
          {formState.errors.content_html && (
            <p className="text-xs text-destructive">{formState.errors.content_html.message}</p>
          )}
        </div>
      )}
    </FormDialog>
  );
}
