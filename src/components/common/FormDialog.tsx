import { useEffect, type FormEventHandler, type ReactNode } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/context/confirm";

/** Попередження браузера при закритті вкладки з незбереженими змінами. */
export function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}

export function FormDialog({
  title,
  description,
  isDirty,
  onClose,
  onSubmit,
  submitLabel = "Зберегти",
  submitting,
  size = "md",
  children,
  extraFooter,
}: {
  title: string;
  description?: ReactNode;
  isDirty: boolean;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  submitting?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  extraFooter?: ReactNode;
}) {
  const confirm = useConfirm();
  useBeforeUnload(isDirty);

  const requestClose = async () => {
    if (submitting) return;
    if (
      isDirty &&
      !(await confirm({
        title: "Закрити без збереження?",
        description: "Ви внесли зміни, які ще не збережено. Якщо закрити форму, їх буде втрачено.",
        confirmLabel: "Закрити без збереження",
        cancelLabel: "Повернутися до форми",
        destructive: true,
      }))
    ) {
      return;
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent size={size} onInteractOutside={(e) => isDirty && e.preventDefault()}>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <DialogBody className="space-y-4">{children}</DialogBody>
          <DialogFooter>
            {extraFooter}
            <Button type="button" variant="outline" onClick={requestClose} disabled={submitting}>
              Скасувати
            </Button>
            <Button type="submit" loading={submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
