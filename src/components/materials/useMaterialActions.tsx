import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteRow, duplicateMaterial, patchRow } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useInvalidate } from "@/lib/queries";
import { useConfirm } from "@/context/confirm";
import { useDialogs } from "@/context/dialogs";
import type { Material } from "@/lib/types";

export function useMaterialActions() {
  const invalidate = useInvalidate();
  const confirm = useConfirm();
  const dialogs = useDialogs();

  const favorite = useMutation({
    mutationFn: (m: Material) => patchRow("materials", m.id, { is_favorite: !m.is_favorite }),
    onSuccess: async (_d, m) => {
      await invalidate(qk.materials);
      toast.success(m.is_favorite ? "Прибрано з обраного" : "Додано в обране");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const duplicate = useMutation({
    mutationFn: (m: Material) => duplicateMaterial(m),
    onSuccess: async () => {
      await invalidate(qk.materials);
      toast.success("Створено копію матеріалу");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const toInbox = useMutation({
    mutationFn: (m: Material) => patchRow("materials", m.id, { topic_id: null }),
    onSuccess: async () => {
      await invalidate(qk.materials);
      toast.success("Переміщено у Скарбничку");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const remove = useMutation({
    mutationFn: (m: Material) => deleteRow("materials", m.id),
    onSuccess: async () => {
      await invalidate(qk.materials);
      toast.success("Матеріал видалено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return {
    edit: (m: Material) => dialogs.openMaterial(m),
    move: (m: Material) => dialogs.openMove([m]),
    toggleFavorite: (m: Material) => favorite.mutate(m),
    duplicate: (m: Material) => duplicate.mutate(m),
    toInbox: (m: Material) => toInbox.mutate(m),
    remove: async (m: Material, after?: () => void) => {
      const ok = await confirm({
        title: "Видалити матеріал?",
        description: (
          <>
            <p>
              «{m.title}» буде видалено назавжди. Скасувати цю дію неможливо.
            </p>
            {m.topic_id && <p>Якщо матеріал ще знадобиться — краще перемістіть його у Скарбничку.</p>}
          </>
        ),
        confirmLabel: "Видалити",
        destructive: true,
      });
      if (ok) remove.mutate(m, { onSuccess: () => after?.() });
    },
    pending: favorite.isPending || duplicate.isPending || toInbox.isPending || remove.isPending,
  };
}
