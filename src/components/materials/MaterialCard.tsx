import { Link } from "react-router-dom";
import {
  MoreVertical,
  Star,
  ExternalLink,
  Pencil,
  Copy,
  FolderInput,
  Inbox,
  Trash2,
  Lock,
  Users,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { MATERIAL_TYPE_MAP } from "@/lib/constants";
import { isSafeUrl, providerLabel } from "@/lib/providers";
import { cn, formatDate } from "@/lib/utils";
import type { Material } from "@/lib/types";
import { useMaterialActions } from "./useMaterialActions";

function MaterialMenu({ m }: { m: Material }) {
  const a = useMaterialActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Дії з матеріалом «${m.title}»`}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link to={`/materials/${m.id}`}>
            <Eye /> Відкрити
          </Link>
        </DropdownMenuItem>
        {m.url && isSafeUrl(m.url) && (
          <DropdownMenuItem asChild>
            <a href={m.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Відкрити в новій вкладці
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => a.edit(m)}>
          <Pencil /> Редагувати
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => a.toggleFavorite(m)}>
          <Star /> {m.is_favorite ? "Прибрати з обраного" : "Додати в обране"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => a.duplicate(m)}>
          <Copy /> Дублювати
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => a.move(m)}>
          <FolderInput /> Перемістити в тему…
        </DropdownMenuItem>
        {m.topic_id && (
          <DropdownMenuItem onSelect={() => a.toInbox(m)}>
            <Inbox /> У Скарбничку
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => a.remove(m)}>
          <Trash2 /> Видалити
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FavoriteButton({ m }: { m: Material }) {
  const a = useMaterialActions();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        a.toggleFavorite(m);
      }}
      className={cn(
        "grid size-8 place-items-center rounded-md transition hover:bg-elevated",
        m.is_favorite ? "text-amber-400" : "text-muted-foreground",
      )}
      aria-pressed={m.is_favorite}
      aria-label={m.is_favorite ? "Прибрати з обраного" : "Додати в обране"}
    >
      <Star className={cn("size-4", m.is_favorite && "fill-current")} />
    </button>
  );
}

export function MaterialCard({ m, topicLabel, view = "grid" }: { m: Material; topicLabel?: string; view?: "grid" | "list" }) {
  const info = MATERIAL_TYPE_MAP[m.type];
  const Icon = info.icon;
  const provider = providerLabel(m.provider);

  if (view === "list") {
    return (
      <div className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition hover:border-primary/50">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <Link to={`/materials/${m.id}`} className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium group-hover:text-primary">{m.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {info.label}
            {provider ? ` · ${provider}` : ""}
            {topicLabel ? ` · ${topicLabel}` : ""}
            {m.tags.length ? ` · #${m.tags.join(" #")}` : ""}
          </span>
        </Link>
        {m.visibility === "students" ? (
          <Users className="hidden size-4 text-success sm:block" aria-label="Можна демонструвати учням" />
        ) : (
          <Lock className="hidden size-4 text-muted-foreground sm:block" aria-label="Для вчителя" />
        )}
        <FavoriteButton m={m} />
        <MaterialMenu m={m} />
      </div>
    );
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      {m.thumbnail_url ? (
        <Link to={`/materials/${m.id}`} tabIndex={-1} aria-hidden>
          <img
            src={m.thumbnail_url}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="aspect-video w-full object-cover"
          />
        </Link>
      ) : (
        <div className="h-1.5 bg-gradient-to-r from-primary/60 to-secondary/60" />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>
              <Icon /> {info.label}
            </Badge>
            {provider && <Badge variant="muted">{provider}</Badge>}
          </div>
          <div className="relative z-10 -mr-1.5 -mt-1 flex">
            <FavoriteButton m={m} />
            <MaterialMenu m={m} />
          </div>
        </div>
        <Link to={`/materials/${m.id}`} className="font-semibold leading-snug hover:text-primary">
          <span className="absolute inset-0" aria-hidden />
          <span className="relative">{m.title}</span>
        </Link>
        {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>}
        <div className="relative mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-xs text-muted-foreground">
          {m.visibility === "students" ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Users className="size-3.5" /> Для учнів
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3.5" /> Для вчителя
            </span>
          )}
          {topicLabel && <span className="truncate">· {topicLabel}</span>}
          <span>· {formatDate(m.created_at)}</span>
        </div>
        {m.tags.length > 0 && (
          <div className="relative mt-2 flex flex-wrap gap-1">
            {m.tags.map((t) => (
              <Badge key={t} variant="outline">
                #{t}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
