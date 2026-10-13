import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { FormDialog } from "@/components/common/FormDialog";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { RichTextEditor } from "@/components/common/RichTextEditor";
import { TopicPicker } from "@/components/common/TopicPicker";
import { Field, Input, Label } from "@/components/ui/form-controls";
import { fetchUpdatedAt, insertRow, updateVersioned } from "@/lib/api";
import { ConflictError, humanizeError } from "@/lib/errors";
import { qk, useInvalidate } from "@/lib/queries";
import type { Note } from "@/lib/types";

const schema = z.object({
  title: z.string().trim().min(1, "Вкажіть заголовок нотатки").max(200),
  body_html: z.string().max(200000, "Нотатка задовга"),
  topic_id: z.string({ invalid_type_error: "Оберіть тему" }).min(1, "Оберіть тему"),
});
type FormValues = z.infer<typeof schema>;

export function NoteDialog({ note, topicId, onClose }: { note?: Note; topicId?: string; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [conflict, setConflict] = useState(false);
  const { register, control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: note?.title ?? "",
      body_html: note?.body_html ?? "",
      topic_id: note?.topic_id ?? topicId ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ values, force }: { values: FormValues; force?: boolean }) => {
      const payload = { title: values.title.trim(), body_html: values.body_html, topic_id: values.topic_id };
      if (!note) return insertRow<Note>("notes", payload);
      const version = force ? await fetchUpdatedAt("notes", note.id) : note.updated_at;
      return updateVersioned<Note>("notes", note.id, version, payload);
    },
    onSuccess: async () => {
      await invalidate(qk.notes);
      toast.success(note ? "Нотатку оновлено" : "Нотатку збережено");
      onClose();
    },
    onError: (e) => (e instanceof ConflictError ? setConflict(true) : toast.error(humanizeError(e))),
  });

  return (
    <FormDialog
      title={note ? "Редагувати нотатку" : "Нова нотатка вчителя"}
      description={
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3.5" /> Нотатки приватні й ніколи не показуються в режимі презентації.
        </span>
      }
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
            await invalidate(qk.notes);
            onClose();
          }}
        />
      )}
      <Field label="Заголовок" htmlFor="n-title" required error={formState.errors.title?.message}>
        <Input id="n-title" placeholder="Що не забути на уроці" aria-invalid={!!formState.errors.title} {...register("title")} />
      </Field>
      <Controller
        control={control}
        name="topic_id"
        render={({ field }) => (
          <TopicPicker
            value={field.value || null}
            onChange={(v) => field.onChange(v ?? "")}
            allowNone={false}
            idPrefix="n"
            error={formState.errors.topic_id?.message}
          />
        )}
      />
      <div className="space-y-1.5">
        <Label>Текст нотатки</Label>
        <Controller
          control={control}
          name="body_html"
          render={({ field }) => (
            <RichTextEditor value={field.value} onChange={field.onChange} minHeight={200} ariaLabel="Текст нотатки" />
          )}
        />
      </div>
    </FormDialog>
  );
}
