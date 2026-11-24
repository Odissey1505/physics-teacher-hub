import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, ExternalLink, Loader2, Maximize, Minimize, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/States";
import { fileKind, formatSize, saveBlob } from "@/components/notes/NoteFiles";
import { downloadNoteFile } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { prepareLessonSrcdoc } from "@/lib/lesson-html";
import { useCourse, useNoteFiles } from "@/lib/queries";

/**
 * Повноекранний перегляд файлу уроку з приватного сховища.
 * HTML відкривається як повноцінна сторінка (iframe srcdoc того ж сайту),
 * тож працюють його скрипти, збереження правок (localStorage / IndexedDB), PDF, вкладення та YouTube.
 */
export default function NoteFilePage() {
  const { topicId = "", fileId = "" } = useParams();
  const files = useNoteFiles();
  const course = useCourse();
  const f = files.data?.find((x) => x.id === fileId);
  const path = course.pathById.get(topicId);
  const [fullscreen, setFullscreen] = useState(false);

  const blob = useQuery({
    queryKey: ["note_file_blob", fileId, f?.updated_at],
    queryFn: () => downloadNoteFile(f!),
    enabled: !!f,
    staleTime: Infinity,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const kind = f ? fileKind(f) : "other";
  const url = useMemo(() => {
    if (!blob.data || !f) return null;
    const type = kind === "html" ? "text/html;charset=utf-8" : f.mime_type;
    return URL.createObjectURL(new Blob([blob.data], { type }));
  }, [blob.data, f, kind]);
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  // HTML показуємо через srcdoc (див. lesson-html.ts), blob-адреса лишається для «Нової вкладки».
  const [html, setHtml] = useState<{ id: string; doc: string } | null>(null);
  useEffect(() => {
    let alive = true;
    if (kind === "html" && blob.data) {
      void blob.data.text().then((t) => alive && setHtml({ id: fileId, doc: prepareLessonSrcdoc(t) }));
    }
    return () => {
      alive = false;
    };
  }, [blob.data, kind, fileId]);
  const htmlDoc = html?.id === fileId ? html.doc : null;

  useEffect(() => {
    document.title = f ? `${f.title} · Physics Teacher Hub` : "Файл уроку";
  }, [f]);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const back = `/topics/${topicId}/notes`;

  if (files.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <Loader2 className="size-7 animate-spin text-primary" aria-label="Завантаження" />
      </div>
    );
  }
  if (files.isError || !f) {
    return (
      <div className="mx-auto max-w-xl p-6">
        {files.isError ? (
          <ErrorState error={files.error} onRetry={() => files.refetch()} />
        ) : (
          <p className="rounded-xl border border-border p-6 text-center">Файл не знайдено — можливо, його видалено.</p>
        )}
        <Button asChild variant="outline" className="mt-4">
          <Link to={back}>
            <ArrowLeft /> До нотаток
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-4">
        <Button asChild variant="ghost" size="sm">
          <Link to={back}>
            <ArrowLeft /> <span className="hidden sm:inline">До нотаток</span>
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{f.title}</p>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            <Lock className="mr-1 inline size-3" />
            {path ? `${path.section?.title ?? ""} · Тема ${path.number}` : "Нотатки вчителя"} · {formatSize(f.size_bytes)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={!url}
          onClick={() => url && window.open(url, "_blank", "noopener")}
          title="Відкрити в окремій вкладці"
        >
          <ExternalLink /> <span className="hidden md:inline">Нова вкладка</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void saveBlob(f).catch((e) => toast.error(humanizeError(e)))} title="Завантажити на пристрій">
          <Download /> <span className="hidden md:inline">Завантажити</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={fullscreen ? "Вийти з повноекранного режиму" : "На весь екран"}
          onClick={async () => {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
              else await document.documentElement.requestFullscreen();
            } catch {
              toast.error("Браузер не дозволив повноекранний режим");
            }
          }}
        >
          {fullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </header>

      <main className="relative min-h-0 flex-1">
        {blob.isLoading || ((!url || (kind === "html" && htmlDoc === null)) && !blob.isError) ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p>Завантаження файлу… ({formatSize(f.size_bytes)})</p>
            </div>
          </div>
        ) : blob.isError ? (
          <div className="mx-auto max-w-xl p-6">
            <ErrorState error={blob.error} onRetry={() => blob.refetch()} />
          </div>
        ) : kind === "html" ? (
          <iframe
            key={f.id}
            srcDoc={htmlDoc!}
            title={f.title}
            className="size-full border-0 bg-white"
            allow="fullscreen; clipboard-write; autoplay"
            allowFullScreen
            // Файл учителя працює як окрема сторінка цього сайту: скрипти, збереження, PDF і вкладення.
            // Без allow-top-navigation: файл не може «підмінити» сам кабінет.
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-forms allow-presentation"
          />
        ) : kind === "pdf" ? (
          <iframe src={url!} title={f.title} className="size-full border-0" />
        ) : kind === "image" ? (
          <div className="grid h-full place-items-center overflow-auto p-4">
            <img src={url!} alt={f.title} className="max-h-full max-w-full rounded-lg object-contain" />
          </div>
        ) : kind === "video" ? (
          <div className="grid h-full place-items-center bg-black p-2">
            <video src={url!} controls className="max-h-full max-w-full" />
          </div>
        ) : kind === "audio" ? (
          <div className="grid h-full place-items-center p-6">
            <audio src={url!} controls className="w-full max-w-xl" />
          </div>
        ) : kind === "text" ? (
          <iframe src={url!} title={f.title} className="size-full border-0 bg-white" sandbox="" />
        ) : (
          <div className="grid h-full place-items-center p-6 text-center">
            <div>
              <p className="mb-4 text-muted-foreground">Цей тип файлу браузер не показує. Завантажте його на пристрій.</p>
              <Button onClick={() => void saveBlob(f).catch((e) => toast.error(humanizeError(e)))}>
                <Download /> Завантажити «{f.file_name}»
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
