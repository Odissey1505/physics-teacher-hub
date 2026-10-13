import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Link2, ListChecks } from "lucide-react";
import { FormDialog } from "@/components/common/FormDialog";
import { TopicPicker } from "@/components/common/TopicPicker";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { insertRow } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useInvalidate } from "@/lib/queries";
import type { Quiz } from "@/lib/types";

/** Вибір: зовнішній квіз (посилання) чи вбудований квіз. */
export function QuizKindDialog({
  onClose,
  onExternal,
  onInternal,
}: {
  onClose: () => void;
  onExternal: () => void;
  onInternal: () => void;
}) {
  const choices = [
    {
      icon: Link2,
      title: "Зовнішній квіз або гра",
      text: "Посилання на Kahoot, Wordwall, Quizizz / Wayground, LearningApps, Google Forms…",
      onClick: onExternal,
    },
    {
      icon: ListChecks,
      title: "Вбудований квіз",
      text: "Питання з вибором, правда/неправда, коротка відповідь — з автоматичним підрахунком балів.",
      onClick: onInternal,
    },
  ];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Додати квіз</DialogTitle>
          <DialogDescription>Оберіть, який квіз ви хочете додати.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3 pb-6">
          {choices.map(({ icon: Icon, title, text, onClick }) => (
            <button
              key={title}
              type="button"
              onClick={onClick}
              className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition hover:border-primary hover:bg-primary/5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
              </span>
            </button>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  title: z.string().trim().min(1, "Вкажіть назву квізу").max(200),
  description: z.string().max(2000),
  topic_id: z.string().nullable(),
});
type FormValues = z.infer<typeof schema>;

export function QuizCreateDialog({ topicId, onClose }: { topicId?: string | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const { register, control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", topic_id: topicId ?? null },
  });

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      insertRow<Quiz>("quizzes", { title: v.title.trim(), description: v.description.trim(), topic_id: v.topic_id }),
    onSuccess: async (quiz) => {
      await invalidate(qk.quizzes);
      toast.success("Квіз створено — додайте питання");
      onClose();
      navigate(`/quizzes/${quiz.id}/edit`);
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <FormDialog
      title="Новий вбудований квіз"
      isDirty={formState.isDirty}
      onClose={onClose}
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      submitting={mutation.isPending}
      submitLabel="Створити й додати питання"
      size="lg"
    >
      <Field label="Назва" htmlFor="qz-title" required error={formState.errors.title?.message}>
        <Input id="qz-title" placeholder="Магнітне поле: швидка перевірка" aria-invalid={!!formState.errors.title} {...register("title")} />
      </Field>
      <Field label="Опис" htmlFor="qz-desc">
        <Textarea id="qz-desc" rows={2} {...register("description")} />
      </Field>
      <Controller
        control={control}
        name="topic_id"
        render={({ field }) => (
          <TopicPicker value={field.value} onChange={field.onChange} idPrefix="qz" noneLabel="— Без прив'язки до теми —" />
        )}
      />
    </FormDialog>
  );
}
