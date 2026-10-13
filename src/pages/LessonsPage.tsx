import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpenText, FolderPlus, GraduationCap, MoreVertical, Pencil, Plus, Star, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { CardGridSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/common/States";
import { DeleteContainerDialog, type ContainerKind } from "@/components/topics/DeleteContainerDialog";
import { usePageMeta } from "@/context/page-meta";
import { useDialogs } from "@/context/dialogs";
import { setCurrentSection } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useCourse, useInvalidate, useMaterials } from "@/lib/queries";
import { countLabel } from "@/lib/utils";

export function LessonsPage() {
  usePageMeta("Мої уроки", [{ label: "Головна", to: "/" }, { label: "Мої уроки" }]);
  const course = useCourse();
  const materials = useMaterials();
  const dialogs = useDialogs();
  const invalidate = useInvalidate();
  const [toDelete, setToDelete] = useState<{ kind: ContainerKind; id: string; title: string } | null>(null);

  const setCurrent = useMutation({
    mutationFn: setCurrentSection,
    onSuccess: async () => {
      await invalidate(qk.sections);
      toast.success("Поточний розділ змінено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const countByTopic = new Map<string, number>();
  for (const m of materials.data ?? []) if (m.topic_id) countByTopic.set(m.topic_id, (countByTopic.get(m.topic_id) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Мої уроки"
        description="Структура курсу: клас → розділ → тема → матеріали."
        icon={BookOpenText}
        actions={
          <>
            <Button variant="outline" onClick={() => dialogs.openClass()}>
              <GraduationCap /> Додати клас
            </Button>
            <Button onClick={() => dialogs.openSection()} disabled={course.classes.length === 0}>
              <FolderPlus /> Додати розділ
            </Button>
          </>
        }
      />

      {course.isLoading ? (
        <CardGridSkeleton count={3} />
      ) : course.error ? (
        <ErrorState error={course.error} onRetry={() => course.refetch()} />
      ) : course.classes.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Класів поки немає"
          description="Створіть клас, а в ньому — розділи й теми."
          action={
            <Button onClick={() => dialogs.openClass()}>
              <Plus /> Додати клас
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {course.classes.map((cls) => {
            const sections = course.sectionsByClass.get(cls.id) ?? [];
            return (
              <section key={cls.id} aria-labelledby={`cls-${cls.id}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 id={`cls-${cls.id}`} className="flex items-center gap-2 text-xl font-semibold">
                    <GraduationCap className="size-5 text-primary" /> {cls.title}
                  </h2>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => dialogs.openSection(undefined, cls.id)}>
                      <Plus /> Розділ
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Дії з класом ${cls.title}`}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => dialogs.openClass(cls)}>
                          <Pencil /> Перейменувати
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setToDelete({ kind: "class", id: cls.id, title: cls.title })}>
                          <Trash2 /> Видалити клас
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {sections.length === 0 ? (
                  <EmptyState
                    title="У цьому класі ще немає розділів"
                    action={
                      <Button size="sm" onClick={() => dialogs.openSection(undefined, cls.id)}>
                        <Plus /> Додати розділ
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {sections.map((s) => {
                      const topics = course.topicsBySection.get(s.id) ?? [];
                      const mats = topics.reduce((sum, t) => sum + (countByTopic.get(t.id) ?? 0), 0);
                      return (
                        <Card key={s.id} className="relative flex flex-col p-5 transition hover:border-primary/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {s.is_current && (
                                <Badge className="mb-2">
                                  <Star className="fill-current" /> Поточний розділ
                                </Badge>
                              )}
                              <Link to={`/sections/${s.id}`} className="block text-lg font-semibold leading-snug hover:text-primary">
                                {s.title}
                              </Link>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={`Дії з розділом ${s.title}`}>
                                  <MoreVertical />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => dialogs.openSection(s)}>
                                  <Pencil /> Редагувати
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => dialogs.openTopic(undefined, s.id)}>
                                  <Plus /> Додати тему
                                </DropdownMenuItem>
                                {!s.is_current && (
                                  <DropdownMenuItem onSelect={() => setCurrent.mutate(s.id)}>
                                    <Star /> Зробити поточним
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem destructive onSelect={() => setToDelete({ kind: "section", id: s.id, title: s.title })}>
                                  <Trash2 /> Видалити розділ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                          <p className="mt-3 text-sm text-muted-foreground">
                            {countLabel(topics.length, ["тема", "теми", "тем"])} · {countLabel(mats, ["матеріал", "матеріали", "матеріалів"])}
                          </p>
                          <Button asChild variant="outline" size="sm" className="mt-4 self-start">
                            <Link to={`/sections/${s.id}`}>
                              Відкрити <ArrowRight />
                            </Link>
                          </Button>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {toDelete && (
        <DeleteContainerDialog kind={toDelete.kind} id={toDelete.id} title={toDelete.title} onClose={() => setToDelete(null)} />
      )}
    </>
  );
}
