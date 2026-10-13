import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Pencil, Copy, Trash2, MonitorPlay, ArrowRight, Files, Sigma, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { useDialogs } from "@/context/dialogs";
import { duplicateTopic } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useInvalidate } from "@/lib/queries";
import { TOPIC_ICON_MAP } from "@/lib/constants";
import type { Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface TopicCounts {
  materials: number;
  formulas: number;
  quizzes: number;
}

export function useDuplicateTopic() {
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (id: string) => duplicateTopic(id),
    onSuccess: async (newId) => {
      await invalidate(qk.topics, qk.materials, qk.formulas, qk.notes, qk.quizzes);
      toast.success("Тему продубльовано разом з матеріалами", {
        action: { label: "Відкрити", onClick: () => navigate(`/topics/${newId}`) },
      });
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
}

export function TopicMenu({ topic, onDelete }: { topic: Topic; onDelete: () => void }) {
  const dialogs = useDialogs();
  const dup = useDuplicateTopic();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Дії з темою «${topic.title}»`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => dialogs.openTopic(topic)}>
          <Pencil /> Редагувати / перемістити
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => dup.mutate(topic.id)} disabled={dup.isPending}>
          <Copy /> Дублювати
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/present/${topic.id}`}>
            <MonitorPlay /> Режим презентації
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={onDelete}>
          <Trash2 /> Видалити
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopicCard({
  topic,
  number,
  counts,
  view,
  sortable,
  onDelete,
}: {
  topic: Topic;
  number: number;
  counts: TopicCounts;
  view: "grid" | "list";
  sortable: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
    disabled: !sortable,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = topic.icon ? TOPIC_ICON_MAP[topic.icon] : null;

  const handle = sortable ? (
    <button
      type="button"
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-elevated active:cursor-grabbing"
      aria-label={`Перетягнути тему «${topic.title}». Пробіл — взяти, стрілки — перемістити.`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  ) : null;

  const numberBadge = (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 font-bold text-primary">
      {Icon ? <Icon className="size-5" aria-label={`Тема ${number}`} /> : number}
    </span>
  );

  const countsEl = (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1" title="Матеріали">
        <Files className="size-3.5" /> {counts.materials}
      </span>
      <span className="inline-flex items-center gap-1" title="Формули">
        <Sigma className="size-3.5" /> {counts.formulas}
      </span>
      <span className="inline-flex items-center gap-1" title="Вбудовані квізи">
        <ListChecks className="size-3.5" /> {counts.quizzes}
      </span>
    </div>
  );

  if (view === "list") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-primary/50",
          isDragging && "z-10 shadow-xl ring-2 ring-primary",
        )}
      >
        {handle}
        {numberBadge}
        <div className="min-w-0 flex-1">
          <Link to={`/topics/${topic.id}`} className="block truncate font-medium hover:text-primary">
            {Icon ? `${number}. ` : ""}
            {topic.title}
          </Link>
          {countsEl}
        </div>
        <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
          <Link to={`/topics/${topic.id}`}>Відкрити</Link>
        </Button>
        <TopicMenu topic={topic} onDelete={onDelete} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-primary/50 hover:shadow-lg",
        isDragging && "z-10 shadow-xl ring-2 ring-primary",
      )}
    >
      {topic.image_url && (
        <img src={topic.image_url} alt="" className="h-28 w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {numberBadge}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Тема {number}</p>
            <Link to={`/topics/${topic.id}`} className="mt-0.5 block font-semibold leading-snug hover:text-primary">
              {topic.title}
            </Link>
          </div>
          <div className="-mr-1 -mt-1 flex">
            {handle}
            <TopicMenu topic={topic} onDelete={onDelete} />
          </div>
        </div>
        {topic.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{topic.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          {countsEl}
          <Button asChild variant="ghost" size="sm">
            <Link to={`/topics/${topic.id}`}>
              Відкрити <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
