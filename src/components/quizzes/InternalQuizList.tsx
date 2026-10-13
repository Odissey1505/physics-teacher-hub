import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ListChecks, MoreVertical, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { CardGridSkeleton, EmptyState, ErrorState } from "@/components/common/States";
import { useConfirm } from "@/context/confirm";
import { useDialogs } from "@/context/dialogs";
import { deleteRow, duplicateQuiz } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useCourse, useInvalidate, useQuizzes } from "@/lib/queries";
import type { Quiz } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function QuizMenu({ quiz }: { quiz: Quiz }) {
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const dup = useMutation({
    mutationFn: () => duplicateQuiz(quiz.id),
    onSuccess: async (id) => {
      await invalidate(qk.quizzes);
      toast.success("Квіз продубльовано", { action: { label: "Відкрити", onClick: () => navigate(`/quizzes/${id}/edit`) } });
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  const del = useMutation({
    mutationFn: () => deleteRow("quizzes", quiz.id),
    onSuccess: async () => {
      await invalidate(qk.quizzes);
      toast.success("Квіз видалено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Дії з квізом «${quiz.title}»`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link to={`/quizzes/${quiz.id}/edit`}>
            <Pencil /> Редагувати питання
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/quizzes/${quiz.id}/play`}>
            <Play /> Пройти квіз
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => dup.mutate()}>
          <Copy /> Дублювати
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={async () => {
            if (
              await confirm({
                title: "Видалити квіз?",
                description: `«${quiz.title}» разом з усіма питаннями та відповідями буде видалено назавжди.`,
                confirmLabel: "Видалити",
                destructive: true,
              })
            )
              del.mutate();
          }}
        >
          <Trash2 /> Видалити
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InternalQuizList({ topicId, showTopic = true }: { topicId?: string | null; showTopic?: boolean }) {
  const quizzes = useQuizzes();
  const course = useCourse();
  const dialogs = useDialogs();
  const list = (quizzes.data ?? []).filter((q) => (topicId === undefined ? true : q.topic_id === topicId));

  if (quizzes.isLoading) return <CardGridSkeleton count={2} />;
  if (quizzes.isError) return <ErrorState error={quizzes.error} onRetry={() => quizzes.refetch()} />;
  if (list.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="Вбудованих квізів поки немає"
        description="Створіть квіз із питаннями — застосунок сам підрахує бали."
        action={
          <Button onClick={() => dialogs.openQuizCreate(topicId ?? null)}>
            <Plus /> Створити квіз
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((q) => (
        <Card key={q.id} className="flex flex-col p-4 transition hover:border-primary/50">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-2">
                <ListChecks /> Вбудований квіз
              </Badge>
              <Link to={`/quizzes/${q.id}/edit`} className="block font-semibold leading-snug hover:text-primary">
                {q.title}
              </Link>
            </div>
            <QuizMenu quiz={q} />
          </div>
          {q.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{q.description}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {showTopic && (q.topic_id ? course.topicLabel(q.topic_id) : "Без теми")} · {formatDate(q.created_at)}
          </p>
          <div className="mt-auto flex gap-2 pt-4">
            <Button asChild size="sm">
              <Link to={`/quizzes/${q.id}/play`}>
                <Play /> Пройти
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to={`/quizzes/${q.id}/edit`}>
                <Pencil /> Питання
              </Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
