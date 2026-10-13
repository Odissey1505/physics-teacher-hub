import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Inbox, Trash2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteContainer } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useCourse, useFormulas, useInvalidate, useMaterials, useNotes, useQuizzes } from "@/lib/queries";
import { cn, countLabel } from "@/lib/utils";

export type ContainerKind = "topic" | "section" | "class";

const KIND_LABEL: Record<ContainerKind, { acc: string; nom: string }> = {
  topic: { acc: "тему", nom: "Тема" },
  section: { acc: "розділ", nom: "Розділ" },
  class: { acc: "клас", nom: "Клас" },
};

/**
 * Безпечне видалення теми/розділу/класу: показує, що саме зачепить дія,
 * і пропонує безпечний варіант — перенести матеріали у Скарбничку.
 */
export function DeleteContainerDialog({
  kind,
  id,
  title,
  onClose,
  onDeleted,
}: {
  kind: ContainerKind;
  id: string;
  title: string;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const course = useCourse();
  const materials = useMaterials();
  const formulas = useFormulas();
  const quizzes = useQuizzes();
  const notes = useNotes();
  const invalidate = useInvalidate();
  const [mode, setMode] = useState<"inbox" | "all">("inbox");

  const affected = useMemo(() => {
    let topicIds: string[] = [];
    let sectionCount = 0;
    if (kind === "topic") topicIds = [id];
    if (kind === "section") topicIds = (course.topicsBySection.get(id) ?? []).map((t) => t.id);
    if (kind === "class") {
      const secs = course.sectionsByClass.get(id) ?? [];
      sectionCount = secs.length;
      topicIds = secs.flatMap((s) => (course.topicsBySection.get(s.id) ?? []).map((t) => t.id));
    }
    const set = new Set(topicIds);
    return {
      topics: topicIds.length,
      sections: sectionCount,
      materials: (materials.data ?? []).filter((m) => m.topic_id && set.has(m.topic_id)).length,
      formulas: (formulas.data ?? []).filter((f) => f.topic_id && set.has(f.topic_id)).length,
      quizzes: (quizzes.data ?? []).filter((q) => q.topic_id && set.has(q.topic_id)).length,
      notes: (notes.data ?? []).filter((n) => set.has(n.topic_id)).length,
    };
  }, [kind, id, course, materials.data, formulas.data, quizzes.data, notes.data]);

  const hasContent = affected.materials + affected.formulas + affected.quizzes > 0;

  const mutation = useMutation({
    mutationFn: () => deleteContainer(kind, id, hasContent ? mode : "inbox"),
    onSuccess: async () => {
      await invalidate(qk.classes, qk.sections, qk.topics, qk.materials, qk.formulas, qk.quizzes, qk.notes);
      toast.success(`${KIND_LABEL[kind].nom} «${title}» видалено`);
      onClose();
      onDeleted?.();
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !mutation.isPending && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Видалити {KIND_LABEL[kind].acc}?</DialogTitle>
          <DialogDescription>«{title}»</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 text-sm">
          <div className="flex gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="space-y-1">
              <p className="font-medium">Що буде видалено назавжди:</p>
              <ul className="list-disc pl-4 text-muted-foreground">
                {kind === "class" && <li>{countLabel(affected.sections, ["розділ", "розділи", "розділів"])}</li>}
                {kind !== "topic" && <li>{countLabel(affected.topics, ["тема", "теми", "тем"])}</li>}
                <li>теорія та огляд {kind === "topic" ? "теми" : "тем"}</li>
                {affected.notes > 0 && <li>{countLabel(affected.notes, ["нотатка вчителя", "нотатки вчителя", "нотаток вчителя"])}</li>}
              </ul>
            </div>
          </div>

          {hasContent ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 font-medium">
                Ще прив'язано: {countLabel(affected.materials, ["матеріал", "матеріали", "матеріалів"])},{" "}
                {countLabel(affected.formulas, ["формула", "формули", "формул"])},{" "}
                {countLabel(affected.quizzes, ["квіз", "квізи", "квізів"])}. Що з ними зробити?
              </legend>
              {(
                [
                  {
                    v: "inbox",
                    icon: Inbox,
                    title: "Зберегти (рекомендовано)",
                    text: "Матеріали перейдуть у Скарбничку, формули та квізи залишаться у своїх розділах без прив'язки до теми.",
                  },
                  {
                    v: "all",
                    icon: Trash2,
                    title: "Видалити все разом",
                    text: "Матеріали, формули та квізи цих тем буде видалено назавжди.",
                  },
                ] as const
              ).map(({ v, icon: Icon, title: t, text }) => (
                <label
                  key={v}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border border-border p-3 transition",
                    mode === v && (v === "all" ? "border-destructive bg-destructive/5" : "border-primary bg-primary/5"),
                  )}
                >
                  <input type="radio" name="del-mode" checked={mode === v} onChange={() => setMode(v)} className="mt-1" />
                  <Icon className={cn("mt-0.5 size-4 shrink-0", v === "all" ? "text-destructive" : "text-primary")} />
                  <span>
                    <span className="block font-medium">{t}</span>
                    <span className="block text-muted-foreground">{text}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-muted-foreground">Матеріалів, формул і квізів тут немає.</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Скасувати
          </Button>
          <Button variant="destructive" onClick={() => mutation.mutate()} loading={mutation.isPending}>
            {hasContent && mode === "inbox" ? "Видалити, зберігши матеріали" : "Видалити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
