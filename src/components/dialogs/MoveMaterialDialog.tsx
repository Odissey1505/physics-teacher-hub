import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormDialog } from "@/components/common/FormDialog";
import { TopicPicker } from "@/components/common/TopicPicker";
import { patchMany } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useCourse, useInvalidate } from "@/lib/queries";
import type { Material } from "@/lib/types";

export function MoveMaterialDialog({ materials, onClose }: { materials: Material[]; onClose: () => void }) {
  const invalidate = useInvalidate();
  const course = useCourse();
  const initial = materials.length === 1 ? materials[0].topic_id : null;
  const [topicId, setTopicId] = useState<string | null>(initial);

  const mutation = useMutation({
    mutationFn: () => patchMany("materials", materials.map((m) => m.id), { topic_id: topicId }),
    onSuccess: async () => {
      await invalidate(qk.materials);
      toast.success(topicId ? `Переміщено в тему «${course.topicLabel(topicId)}»` : "Переміщено у Скарбничку");
      onClose();
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <FormDialog
      title={materials.length === 1 ? `Перемістити «${materials[0].title}»` : `Перемістити ${materials.length} матеріали`}
      description="Оберіть тему або залиште «Без теми», щоб перемістити у Скарбничку."
      isDirty={false}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      submitting={mutation.isPending}
      submitLabel="Перемістити"
      size="lg"
    >
      <TopicPicker value={topicId} onChange={setTopicId} idPrefix="mv" />
    </FormDialog>
  );
}
