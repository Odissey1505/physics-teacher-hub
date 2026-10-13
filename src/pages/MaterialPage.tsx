import { Link, useNavigate, useParams } from "react-router-dom";
import { Star, Pencil, Copy, FolderInput, Inbox, Trash2, Lock, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent } from "@/components/ui/misc";
import { RichText } from "@/components/common/Math";
import { ErrorState } from "@/components/common/States";
import { Skeleton } from "@/components/ui/misc";
import { MaterialEmbed } from "@/components/materials/MaterialEmbed";
import { useMaterialActions } from "@/components/materials/useMaterialActions";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta, type Crumb } from "@/context/page-meta";
import { MATERIAL_TYPE_MAP, VISIBILITY_LABELS } from "@/lib/constants";
import { providerLabel } from "@/lib/providers";
import { isEmptyHtml } from "@/lib/sanitize";
import { useCourse, useMaterials } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

export function MaterialPage() {
  const { materialId } = useParams();
  const materials = useMaterials();
  const course = useCourse();
  const actions = useMaterialActions();
  const navigate = useNavigate();
  const m = materials.data?.find((x) => x.id === materialId);
  const path = m?.topic_id ? course.pathById.get(m.topic_id) : undefined;

  const crumbs: Crumb[] = [{ label: "Головна", to: "/" }];
  if (path?.section) crumbs.push({ label: path.section.title, to: `/sections/${path.section.id}` });
  if (path) crumbs.push({ label: `${path.number}. ${path.topic.title}`, to: `/topics/${path.topic.id}` });
  else if (m) crumbs.push({ label: "Скарбничка", to: "/inbox" });
  crumbs.push({ label: m?.title ?? "Матеріал" });
  usePageMeta(m?.title ?? "Матеріал", crumbs);

  if (materials.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-video w-full" />
      </div>
    );
  }
  if (materials.isError) return <ErrorState error={materials.error} onRetry={() => materials.refetch()} />;
  if (!m) return <NotFoundPage what="Матеріал" />;

  const info = MATERIAL_TYPE_MAP[m.type];
  const Icon = info.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-5">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge>
              <Icon /> {info.label}
            </Badge>
            {m.provider && <Badge variant="muted">{providerLabel(m.provider)}</Badge>}
            {m.visibility === "students" ? (
              <Badge variant="success">
                <Users /> {VISIBILITY_LABELS.students}
              </Badge>
            ) : (
              <Badge variant="outline">
                <Lock /> {VISIBILITY_LABELS.teacher}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{m.title}</h1>
          {m.description && <p className="mt-2 whitespace-pre-line text-muted-foreground">{m.description}</p>}
        </div>

        {m.url && <MaterialEmbed url={m.url} title={m.title} />}

        {!isEmptyHtml(m.content_html) && (
          <Card>
            <CardContent className="pt-5">
              <RichText html={m.content_html} />
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-2 pt-5">
            <Button
              variant={m.is_favorite ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => actions.toggleFavorite(m)}
              aria-pressed={m.is_favorite}
            >
              <Star className={m.is_favorite ? "fill-current" : ""} />
              {m.is_favorite ? "В обраному" : "Додати в обране"}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => actions.edit(m)}>
              <Pencil /> Редагувати
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => actions.duplicate(m)}>
              <Copy /> Дублювати
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => actions.move(m)}>
              <FolderInput /> Перемістити в тему…
            </Button>
            {m.topic_id && (
              <Button variant="outline" className="w-full justify-start" onClick={() => actions.toInbox(m)}>
                <Inbox /> У Скарбничку
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10"
              onClick={() => actions.remove(m, () => navigate(path ? `/topics/${path.topic.id}` : "/inbox", { replace: true }))}
            >
              <Trash2 /> Видалити
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-5 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Тема</p>
              {path ? (
                <Link to={`/topics/${path.topic.id}`} className="font-medium text-primary hover:underline">
                  {path.number}. {path.topic.title}
                </Link>
              ) : (
                <Link to="/inbox" className="font-medium text-primary hover:underline">
                  Скарбничка матеріалів
                </Link>
              )}
            </div>
            {m.tags.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Теги</p>
                <div className="flex flex-wrap gap-1">
                  {m.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      #{t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" /> Додано {formatDateTime(m.created_at)}
            </div>
            {m.updated_at !== m.created_at && (
              <p className="text-xs text-muted-foreground">Змінено {formatDateTime(m.updated_at)}</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
