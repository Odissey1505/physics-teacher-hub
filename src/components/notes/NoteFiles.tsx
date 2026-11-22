import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Paperclip,
  Upload,
  FileCode2,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  File as FileIcon,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Maximize2,
  Database,
  ShieldAlert,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/misc";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menu";
import { ErrorState } from "@/components/common/States";
import { useConfirm } from "@/context/confirm";
import { MAX_NOTE_FILE_BYTES, deleteNoteFile, downloadNoteFile, fileExt, guessMime, patchRow, uploadNoteFile } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useInvalidate, useNoteFiles } from "@/lib/queries";
import type { NoteFile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export type FileKind = "html" | "pdf" | "image" | "audio" | "video" | "text" | "other";

export function fileKind(f: Pick<NoteFile, "mime_type" | "file_name">): FileKind {
  const m = f.mime_type;
  const ext = fileExt(f.file_name);
  if (m === "text/html" || ext === "html" || ext === "htm") return "html";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("video/")) return "video";
  if (m === "text/plain") return "text";
  return "other";
}

const KIND_META: Record<FileKind, { label: string; icon: typeof FileIcon; tone: string }> = {
  html: { label: "Інтерактивний HTML", icon: FileCode2, tone: "bg-secondary/15 text-secondary" },
  pdf: { label: "PDF", icon: FileText, tone: "bg-destructive/15 text-destructive" },
  image: { label: "Зображення", icon: FileImage, tone: "bg-success/15 text-success" },
  audio: { label: "Аудіо", icon: FileAudio, tone: "bg-warning/15 text-warning" },
  video: { label: "Відео", icon: FileVideo, tone: "bg-primary/15 text-primary" },
  text: { label: "Текст", icon: FileText, tone: "bg-elevated text-muted-foreground" },
  other: { label: "Файл", icon: FileIcon, tone: "bg-elevated text-muted-foreground" },
};

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toLocaleString("uk-UA", { maximumFractionDigits: 1 })} МБ`;
}

/** Назва з <title> HTML-файлу або з назви файлу. */
async function suggestTitle(file: File) {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (fileKind({ mime_type: guessMime(file), file_name: file.name }) !== "html") return base;
  try {
    const head = await file.slice(0, 20000).text();
    const t = head.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1];
    const txt = t ? new DOMParser().parseFromString(t, "text/html").body.textContent?.trim() : "";
    return txt || base;
  } catch {
    return base;
  }
}

export async function saveBlob(f: NoteFile) {
  const blob = await downloadNoteFile(f);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.file_name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function UploadDialog({ file, topicId, onClose }: { file: File; topicId: string; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [title, setTitle] = useState("");
  const kind = fileKind({ mime_type: guessMime(file), file_name: file.name });
  useEffect(() => {
    let alive = true;
    void suggestTitle(file).then((t) => alive && setTitle((cur) => cur || t));
    return () => {
      alive = false;
    };
  }, [file]);
  const upload = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Вкажіть назву файлу.");
      return uploadNoteFile(topicId, file, title);
    },
    onSuccess: async () => {
      await invalidate(qk.noteFiles);
      toast.success("Файл додано до нотаток");
      onClose();
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !upload.isPending && onClose()}>
      <DialogContent size="md">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            upload.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Додати файл уроку</DialogTitle>
            <DialogDescription>
              {file.name} · {formatSize(file.size)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nf-title">Назва</Label>
              <Input id="nf-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
            </div>
            <p className="flex gap-2 rounded-lg bg-elevated/50 p-3 text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" /> Файл зберігається у приватному сховищі вашого акаунта. Його бачите лише ви; у режим
              презентації він не потрапляє.
            </p>
            {kind === "html" && (
              <p className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <span>
                  HTML-файл відкриватиметься всередині кабінету як повноцінна програма (зі збереженням правок у цьому браузері). Додавайте лише
                  власні або перевірені файли.
                </span>
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={upload.isPending}>
              Скасувати
            </Button>
            <Button type="submit" loading={upload.isPending}>
              <Upload /> {upload.isPending ? "Завантаження…" : "Завантажити"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ file, onClose }: { file: NoteFile; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [title, setTitle] = useState(file.title);
  const save = useMutation({
    mutationFn: () => {
      if (!title.trim()) throw new Error("Вкажіть назву.");
      return patchRow("note_files", file.id, { title: title.trim().slice(0, 200) });
    },
    onSuccess: async () => {
      await invalidate(qk.noteFiles);
      toast.success("Назву змінено");
      onClose();
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Перейменувати файл</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Input aria-label="Назва файлу" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            <Button type="submit" loading={save.isPending}>
              Зберегти
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Розділ «Файли уроку» у вкладці «Нотатки вчителя». */
export function NoteFilesSection({ topicId }: { topicId: string }) {
  const files = useNoteFiles();
  const invalidate = useInvalidate();
  const confirm = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [renaming, setRenaming] = useState<NoteFile | null>(null);
  const list = (files.data ?? []).filter((f) => f.topic_id === topicId);
  const notInstalled = (files.error as Error | null)?.message === "NOTE_FILES_NOT_INSTALLED";

  const del = useMutation({
    mutationFn: deleteNoteFile,
    onSuccess: async () => {
      await invalidate(qk.noteFiles);
      toast.success("Файл видалено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <section className="space-y-3" aria-labelledby="nf-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="nf-heading" className="flex items-center gap-2 font-semibold">
          <Paperclip className="size-4 text-primary" /> Файли уроку
        </h2>
        {!notInstalled && (
          <>
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload /> Додати файл
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".html,.htm,.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.mp4,.txt,.docx,.pptx,.xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (f.size > MAX_NOTE_FILE_BYTES) {
                  toast.error("Файл завеликий: максимум 50 МБ.");
                  return;
                }
                setPending(f);
              }}
            />
          </>
        )}
      </div>

      {files.isLoading ? (
        <Skeleton className="h-20" />
      ) : notInstalled ? (
        <div className="flex gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <Database className="mt-0.5 size-5 shrink-0 text-warning" />
          <p>
            Щоб додавати файли (HTML-сценарії, PDF, зображення), один раз виконайте в Supabase → SQL Editor файл{" "}
            <code className="break-all">supabase/migrations/20261122000004_note_files.sql</code>.
          </p>
        </div>
      ) : files.isError ? (
        <ErrorState error={files.error} onRetry={() => files.refetch()} />
      ) : list.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
        >
          Додайте сценарій уроку (HTML), PDF чи зображення — до 50 МБ. Файл відкриватиметься прямо тут, на весь екран.
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((f) => {
            const k = KIND_META[fileKind(f)];
            const Icon = k.icon;
            return (
              <div key={f.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-primary/50">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${k.tone}`}>
                  <Icon className="size-5" />
                </span>
                <Link to={`/topics/${topicId}/files/${f.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium hover:text-primary">{f.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {k.label} · {formatSize(f.size_bytes)} · {formatDate(f.created_at)}
                  </span>
                </Link>
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link to={`/topics/${topicId}/files/${f.id}`}>
                    <Maximize2 /> Відкрити
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Дії з файлом «${f.title}»`}>
                      <MoreVertical />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link to={`/topics/${topicId}/files/${f.id}`}>
                        <Maximize2 /> Відкрити на весь екран
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        void saveBlob(f).catch((e) => toast.error(humanizeError(e)))
                      }
                    >
                      <Download /> Завантажити на пристрій
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRenaming(f)}>
                      <Pencil /> Перейменувати
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      destructive
                      onSelect={async () => {
                        if (
                          await confirm({
                            title: "Видалити файл?",
                            description: `«${f.title}» буде видалено зі сховища назавжди. Правки, які HTML-файл зберігав у цьому браузері, залишаться в браузері.`,
                            confirmLabel: "Видалити",
                            destructive: true,
                          })
                        )
                          del.mutate(f);
                      }}
                    >
                      <Trash2 /> Видалити
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {pending && <UploadDialog file={pending} topicId={topicId} onClose={() => setPending(null)} />}
      {renaming && <RenameDialog file={renaming} onClose={() => setRenaming(null)} />}
    </section>
  );
}
