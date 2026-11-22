import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Disc3,
  FileAudio,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Users,
  Plus,
  Pencil,
  Trash2,
  Play,
  Trophy,
  ClipboardPaste,
  MoreVertical,
  Loader2,
  Database,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form-controls";
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
import { useTheme } from "@/context/theme";
import { useConfirm } from "@/context/confirm";
import { deleteRow, insertRow, patchRow } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { qk, useWheelGroups } from "@/lib/queries";
import type { WheelGroup, WheelStudent } from "@/lib/types";
import { WheelSound } from "@/lib/wheel-sound";
import { cn, countLabel, readLocal, writeLocal } from "@/lib/utils";

const PALETTE = [
  "#0284c7", "#0d9488", "#16a34a", "#ca8a04", "#ea580c",
  "#dc2626", "#e11d48", "#9333ea", "#4f46e5", "#2563eb",
  "#059669", "#d97706", "#c026d3", "#7c3aed", "#0891b2",
];
const SPIN_MS = 14000;
const MAX_STUDENTS = 300;
const TWO_PI = Math.PI * 2;

/** Розбір вставленого списку: кожен учень з нового рядка; прибираємо нумерацію «1.», «2)» тощо. */
function parseNames(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .map((l) => l.slice(0, 100));
}

/* ---------------- Збереження з невеликою затримкою ---------------- */

function useGroupsState() {
  const query = useWheelGroups();
  const qc = useQueryClient();
  const [groups, setGroups] = useState<WheelGroup[]>([]);
  const pending = useRef(new Map<string, number>());
  const latest = useRef(groups);
  latest.current = groups;

  useEffect(() => {
    if (query.data && pending.current.size === 0) setGroups(query.data);
  }, [query.data]);

  const flush = useCallback(
    async (id: string) => {
      const timer = pending.current.get(id);
      if (timer) window.clearTimeout(timer);
      pending.current.delete(id);
      const g = latest.current.find((x) => x.id === id);
      if (!g) return;
      try {
        await patchRow("wheel_groups", id, { students: g.students });
        if (pending.current.size === 0) void qc.invalidateQueries({ queryKey: qk.wheel });
      } catch (e) {
        toast.error(`Не вдалося зберегти список: ${humanizeError(e)}`);
        void qc.invalidateQueries({ queryKey: qk.wheel });
      }
    },
    [qc],
  );

  const updateStudents = useCallback(
    (id: string, fn: (s: WheelStudent[]) => WheelStudent[]) => {
      setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, students: fn(g.students) } : g)));
      const prev = pending.current.get(id);
      if (prev) window.clearTimeout(prev);
      pending.current.set(id, window.setTimeout(() => void flush(id), 500));
    },
    [flush],
  );

  // Незбережені зміни зберігаємо при виході зі сторінки.
  useEffect(() => {
    const onHide = () => pending.current.forEach((_t, id) => void flush(id));
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [flush]);

  return { query, groups, updateStudents, hasPending: () => pending.current.size > 0 };
}

/* ---------------- Малювання колеса ---------------- */

function drawWheel(canvas: HTMLCanvasElement, students: WheelStudent[], rotation: number, dark: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width) return;
  const w = canvas.width;
  const cx = w / 2;
  const cy = w / 2;
  const radius = w / 2 - 12;
  ctx.clearRect(0, 0, w, w);
  const font = `"Inter", "Segoe UI", system-ui, sans-serif`;

  if (students.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TWO_PI);
    ctx.fillStyle = dark ? "#1e293b" : "#cbd5e1";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = dark ? "#334155" : "#94a3b8";
    ctx.stroke();
    ctx.fillStyle = dark ? "#94a3b8" : "#64748b";
    ctx.font = `bold ${14 * (w / 400)}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Оберіть хоча б одного учня", cx, cy + radius * 0.55);
    return;
  }

  const slice = TWO_PI / students.length;
  students.forEach((s, i) => {
    const angle = rotation + i * slice;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + slice / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    const size = Math.max(12, Math.min(18, 260 / students.length)) * (w / 400);
    ctx.font = `700 ${size}px ${font}`;
    let name = s.name;
    if (name.length > 15 && students.length > 8) name = `${name.substring(0, 13)}…`;
    ctx.fillText(name, radius - 20, 0);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.stroke();
}

/* ---------------- Діалоги ---------------- */

function GroupDialog({
  group,
  onClose,
  onSaved,
  nextOrder,
}: {
  group?: WheelGroup;
  onClose: () => void;
  onSaved: (g: WheelGroup) => void;
  nextOrder: number;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(group?.title ?? "");
  const [names, setNames] = useState("");
  const parsed = parseNames(names);
  const save = useMutation({
    mutationFn: async () => {
      const t = title.trim();
      if (!t) throw new Error("Вкажіть назву класу, наприклад «9-А».");
      if (t.length > 40) throw new Error("Назва класу задовга (до 40 символів).");
      if (group) {
        await patchRow("wheel_groups", group.id, { title: t });
        return { ...group, title: t };
      }
      return insertRow<WheelGroup>("wheel_groups", {
        title: t,
        sort_order: nextOrder,
        students: parsed.slice(0, MAX_STUDENTS).map((name) => ({ name, selected: true })),
      });
    },
    onSuccess: async (g) => {
      await qc.invalidateQueries({ queryKey: qk.wheel });
      toast.success(group ? "Клас перейменовано" : `Клас «${g.title}» створено`);
      onSaved(g);
      onClose();
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent size="md">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>{group ? "Перейменувати клас" : "Новий клас"}</DialogTitle>
            {!group && <DialogDescription>Списки учнів зберігаються лише у вашому акаунті й не потрапляють у код сайту.</DialogDescription>}
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wg-title">Назва класу</Label>
              <Input id="wg-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="9-А" maxLength={40} />
            </div>
            {!group && (
              <div className="space-y-1.5">
                <Label htmlFor="wg-names">Учні (кожен з нового рядка, можна вставити весь список)</Label>
                <Textarea id="wg-names" rows={10} value={names} onChange={(e) => setNames(e.target.value)} placeholder={"Прізвище Ім'я\nПрізвище Ім'я\n…"} />
                <p className="text-xs text-muted-foreground">Розпізнано: {countLabel(parsed.length, ["учень", "учні", "учнів"])}</p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
              Скасувати
            </Button>
            <Button type="submit" loading={save.isPending}>
              {group ? "Зберегти" : "Створити клас"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasteDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (names: string[]) => void }) {
  const [text, setText] = useState("");
  const parsed = parseNames(text);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Вставити список учнів</DialogTitle>
          <DialogDescription>Кожен учень — з нового рядка. Нумерацію («1.», «2)») буде прибрано, дублікати пропущено.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Textarea autoFocus rows={12} value={text} onChange={(e) => setText(e.target.value)} aria-label="Список учнів" />
          <p className="mt-1.5 text-xs text-muted-foreground">Розпізнано: {countLabel(parsed.length, ["учень", "учні", "учнів"])}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Скасувати
          </Button>
          <Button
            disabled={parsed.length === 0}
            onClick={() => {
              onAdd(parsed);
              onClose();
            }}
          >
            Додати
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Сторінка ---------------- */

export default function WheelPage() {
  const { theme, toggle } = useTheme();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { query, groups, updateStudents } = useGroupsState();

  const [currentId, setCurrentId] = useState<string | null>(() => readLocal<string | null>("pth-wheel-class", null));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<{ name: string; cls: string } | null>(null);
  const [muted, setMuted] = useState(() => readLocal("pth-wheel-muted", false));
  const [autoRemove, setAutoRemove] = useState(() => readLocal("pth-wheel-autoremove", false));
  const [audioName, setAudioName] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ index: number; name: string } | null>(null);
  const [groupDialog, setGroupDialog] = useState<{ group?: WheelGroup } | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const rotation = useRef(0);
  const sound = useRef<WheelSound | null>(null);
  if (!sound.current) sound.current = new WheelSound();

  useEffect(() => {
    document.title = "Колесо опитування · Physics Teacher Hub";
    const s = sound.current!;
    return () => s.dispose();
  }, []);
  useEffect(() => {
    sound.current!.setMuted(muted);
    writeLocal("pth-wheel-muted", muted);
  }, [muted]);
  useEffect(() => writeLocal("pth-wheel-autoremove", autoRemove), [autoRemove]);

  // Обраний клас; якщо його ще немає у списку (щойно створено) або видалено — показуємо перший.
  const current = groups.find((g) => g.id === currentId) ?? groups[0] ?? null;
  useEffect(() => {
    if (currentId && groups.some((g) => g.id === currentId)) writeLocal("pth-wheel-class", currentId);
  }, [currentId, groups]);

  const students = useMemo(() => current?.students ?? [], [current]);
  const active = useMemo(() => students.filter((s) => s.selected), [students]);
  const dark = theme === "dark";

  /* Розмір полотна та перемальовування */
  const redraw = useCallback(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, active, rotation.current, dark);
  }, [active, dark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const resize = () => {
      const size = Math.min(box.clientWidth, 560);
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.round(size * scale);
      canvas.height = Math.round(size * scale);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    return () => ro.disconnect();
  }, [redraw, query.isSuccess]);

  useEffect(() => {
    if (!spinning) redraw();
  }, [redraw, spinning]);

  /* Обертання: 14 секунд, 12–18 обертів, сповільнення як в оригіналі */
  const spin = useCallback(() => {
    if (spinning || !current) return;
    const list = current.students.filter((s) => s.selected);
    if (list.length === 0) {
      toast.error("Оберіть хоча б одного учня для вибору!");
      return;
    }
    setWinner(null);
    setSpinning(true);
    const snd = sound.current!;
    snd.startSpin();

    const start = rotation.current;
    const change = (12 + Math.floor(Math.random() * 7)) * TWO_PI + Math.random() * TWO_PI;
    const slice = TWO_PI / list.length;
    const clsTitle = current.title;
    const groupId = current.id;
    let t0: number | null = null;
    let lastSlice = -1;

    const frame = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / SPIN_MS, 1);
      rotation.current = start + change * (1 - Math.pow(1 - p, 4.5));
      const norm = ((rotation.current % TWO_PI) + TWO_PI) % TWO_PI;
      const pointer = (((Math.PI * 1.5 - norm) % TWO_PI) + TWO_PI) % TWO_PI;
      const idx = Math.floor(pointer / slice) % list.length;
      if (idx !== lastSlice) {
        snd.tick();
        lastSlice = idx;
      }
      if (canvasRef.current) drawWheel(canvasRef.current, list, rotation.current, document.documentElement.classList.contains("dark"));
      if (p < 1) {
        requestAnimationFrame(frame);
        return;
      }
      snd.stopSpin();
      const won = list[idx];
      setSpinning(false);
      setWinner({ name: won.name, cls: clsTitle });
      snd.fanfare();
      void confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, disableForReducedMotion: true, zIndex: 100 });
      if (autoRemove) {
        updateStudents(groupId, (ss) => {
          let done = false;
          return ss.map((s) => {
            if (!done && s.selected && s.name === won.name) {
              done = true;
              return { ...s, selected: false };
            }
            return s;
          });
        });
      }
    };
    requestAnimationFrame(frame);
  }, [spinning, current, autoRemove, updateStudents]);

  /* Операції зі списком */
  const toggleStudent = (i: number) => current && updateStudents(current.id, (ss) => ss.map((s, j) => (j === i ? { ...s, selected: !s.selected } : s)));
  const setAll = (v: boolean) => current && updateStudents(current.id, (ss) => ss.map((s) => ({ ...s, selected: v })));
  const addNames = (names: string[]) => {
    if (!current) return;
    const existing = new Set(current.students.map((s) => s.name.toLocaleLowerCase("uk")));
    const fresh = names.filter((n) => {
      const k = n.toLocaleLowerCase("uk");
      if (existing.has(k)) return false;
      existing.add(k);
      return true;
    });
    const room = MAX_STUDENTS - current.students.length;
    const accepted = fresh.slice(0, Math.max(0, room));
    if (accepted.length) updateStudents(current.id, (ss) => [...ss, ...accepted.map((name) => ({ name, selected: true }))]);
    const skipped = names.length - accepted.length;
    if (accepted.length) toast.success(`Додано: ${countLabel(accepted.length, ["учень", "учні", "учнів"])}${skipped ? ` (пропущено повторів: ${skipped})` : ""}`);
    else toast.info("Нових учнів не додано — усі вже є у списку.");
  };
  const removeStudent = (i: number) => {
    if (!current) return;
    const removed = current.students[i];
    const gid = current.id;
    updateStudents(gid, (ss) => ss.filter((_, j) => j !== i));
    toast.success(`«${removed.name}» видалено`, {
      action: { label: "Повернути", onClick: () => updateStudents(gid, (ss) => [...ss.slice(0, i), removed, ...ss.slice(i)]) },
    });
  };
  const onAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    const names = parseNames(newName);
    if (names.length) addNames(names);
    setNewName("");
  };

  const deleteGroup = useMutation({
    mutationFn: (g: WheelGroup) => deleteRow("wheel_groups", g.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.wheel });
      toast.success("Клас видалено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const notInstalled = (query.error as Error | null)?.message === "WHEEL_NOT_INSTALLED";
  const nextOrder = groups.length ? Math.max(...groups.map((g) => g.sort_order)) + 1 : 0;

  /* ---------------- Розмітка ---------------- */
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-3 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft /> <span className="hidden sm:inline">До кабінету</span>
            </Link>
          </Button>
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30">
            <Disc3 className="size-5 animate-spin [animation-duration:10s]" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate bg-gradient-to-r from-sky-500 to-indigo-500 bg-clip-text text-lg font-extrabold leading-tight text-transparent sm:text-xl">
              Колесо Фортуни
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">Рандомайзер для виклику до дошки</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <label
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-elevated px-2.5 py-2 text-xs font-semibold transition hover:brightness-110"
            title="Свій MP3 на цей сеанс (на сервер не завантажується)"
          >
            <FileAudio className="size-5 text-sky-500" aria-hidden />
            <span className="hidden max-w-[7rem] truncate sm:inline">{audioName ?? "Свій MP3"}</span>
            <input
              type="file"
              accept="audio/*"
              className="sr-only"
              aria-label="Обрати свій звуковий файл"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  sound.current!.setCustomFile(f);
                  setAudioName(f.name);
                }
                e.target.value = "";
              }}
            />
          </label>
          {audioName && (
            <Button
              variant="ghost"
              size="icon"
              title="Повернути стандартний звук"
              aria-label="Повернути стандартний звук"
              onClick={() => {
                sound.current!.resetToDefault();
                setAudioName(null);
              }}
            >
              <RotateCcw />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label={muted ? "Увімкнути звук" : "Вимкнути звук"}>
            {muted ? <VolumeX className="text-rose-500" /> : <Volume2 />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Змінити тему">
            {dark ? <Sun className="text-amber-400" /> : <Moon />}
          </Button>
        </div>
      </header>

      {query.isLoading ? (
        <div className="grid flex-1 place-items-center text-muted-foreground">
          <Loader2 className="size-7 animate-spin" aria-label="Завантаження" />
        </div>
      ) : notInstalled ? (
        <div className="mx-auto mt-10 max-w-xl px-4">
          <div className="rounded-2xl border border-warning/50 bg-warning/10 p-6">
            <Database className="mb-3 size-7 text-warning" />
            <h2 className="text-lg font-semibold">Колесо ще не підключено до бази</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Supabase → <b>SQL Editor</b> → New query → вставте весь вміст файлу{" "}
              <code className="break-all">supabase/migrations/20261122000003_wheel.sql</code> → <b>Run</b>. Потім оновіть цю сторінку.
              Наявні дані це не змінює.
            </p>
          </div>
        </div>
      ) : query.isError ? (
        <div className="mx-auto mt-10 max-w-xl px-4">
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : groups.length === 0 ? (
        <div className="mx-auto mt-12 max-w-lg px-4 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white">
            <Users className="size-8" />
          </div>
          <h2 className="text-2xl font-bold">Створіть перший клас</h2>
          <p className="mt-2 text-muted-foreground">
            Вставте список учнів — він збережеться лише у вашому акаунті й буде доступний на всіх ваших пристроях.
          </p>
          <Button className="mt-6" size="lg" onClick={() => setGroupDialog({})}>
            <Plus /> Створити клас
          </Button>
        </div>
      ) : (
        <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-start gap-6 p-3 sm:p-6 lg:grid-cols-12 lg:p-8">
          {/* Ліва панель: класи та учні */}
          <section className="flex flex-col gap-5 rounded-3xl border border-border bg-surface/80 p-5 shadow-xl backdrop-blur sm:p-6 lg:sticky lg:top-24 lg:col-span-5 lg:max-h-[calc(100dvh-8rem)] xl:col-span-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Оберіть клас</span>
                <div className="flex">
                  <Button variant="ghost" size="sm" onClick={() => setGroupDialog({})} disabled={spinning}>
                    <Plus /> Клас
                  </Button>
                  {current && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Дії з класом ${current.title}`} disabled={spinning}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setGroupDialog({ group: current })}>
                          <Pencil /> Перейменувати
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          destructive
                          onSelect={async () => {
                            if (
                              await confirm({
                                title: `Видалити клас «${current.title}»?`,
                                description: `Список із ${countLabel(current.students.length, ["учня", "учнів", "учнів"])} буде видалено назавжди.`,
                                confirmLabel: "Видалити",
                                destructive: true,
                              })
                            )
                              deleteGroup.mutate(current);
                          }}
                        >
                          <Trash2 /> Видалити клас
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-elevated p-1.5 sm:grid-cols-3" role="tablist" aria-label="Класи">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    role="tab"
                    aria-selected={g.id === current?.id}
                    disabled={spinning}
                    onClick={() => setCurrentId(g.id)}
                    className={cn(
                      "truncate rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed",
                      g.id === current?.id && "bg-surface text-sky-500 shadow-sm ring-1 ring-sky-500/50",
                    )}
                  >
                    <Users className="mr-1.5 inline size-4" aria-hidden />
                    {g.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={onAddSubmit} className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ім'я та прізвище учня..."
                aria-label="Новий учень"
                maxLength={100}
                disabled={spinning}
              />
              <Button type="submit" disabled={spinning || !newName.trim()} aria-label="Додати учня">
                <Plus /> <span className="hidden sm:inline">Додати</span>
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-border pt-3 text-xs">
              <span className="whitespace-nowrap font-semibold text-muted-foreground" aria-live="polite">
                Обрано: {active.length} / {students.length}
              </span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap font-medium">
                <button className="text-sky-500 hover:underline disabled:opacity-50" onClick={() => setAll(true)} disabled={spinning}>
                  Обрати всіх
                </button>
                <span className="text-border">•</span>
                <button className="text-muted-foreground hover:underline disabled:opacity-50" onClick={() => setAll(false)} disabled={spinning}>
                  Зняти всіх
                </button>
                <span className="text-border">•</span>
                <button className="inline-flex items-center gap-1 text-sky-500 hover:underline disabled:opacity-50" onClick={() => setPasteOpen(true)} disabled={spinning}>
                  <ClipboardPaste className="size-3.5" /> Вставити список
                </button>
              </div>
            </div>

            <ul className="-mr-1 min-h-[220px] flex-1 space-y-2 overflow-y-auto pr-1" aria-label="Учні">
              {students.length === 0 && (
                <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  У класі поки немає учнів. Додайте по одному або натисніть «Вставити список».
                </li>
              )}
              {students.map((s, i) => (
                <li
                  key={`${i}-${s.name}`}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border p-3 transition",
                    s.selected ? "border-border bg-elevated/60 shadow-sm" : "border-transparent bg-elevated/20 opacity-60",
                  )}
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={s.selected}
                      disabled={spinning}
                      onChange={() => toggleStudent(i)}
                      className="size-5 shrink-0 rounded-md accent-sky-600"
                    />
                    <span className={cn("truncate text-sm font-semibold", !s.selected && "text-muted-foreground line-through")}>{s.name}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing({ index: i, name: s.name })}
                      disabled={spinning}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:text-sky-500"
                      aria-label={`Редагувати ${s.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => removeStudent(i)}
                      disabled={spinning}
                      className="rounded-lg p-1.5 text-muted-foreground transition hover:text-rose-500"
                      aria-label={`Видалити ${s.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <label className="flex cursor-pointer items-center gap-2 border-t border-border pt-3 text-sm font-medium text-muted-foreground">
              <input type="checkbox" checked={autoRemove} onChange={(e) => setAutoRemove(e.target.checked)} className="size-4 accent-sky-600" />
              Авто-зняття галочки при виборі
            </label>
          </section>

          {/* Права панель: колесо */}
          <section className="relative order-first flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-3xl border border-border bg-surface/80 p-6 shadow-xl backdrop-blur sm:min-h-[500px] lg:order-none lg:col-span-7 xl:col-span-8">
            <div className="absolute top-4 z-20 text-rose-500 drop-shadow-md motion-safe:animate-[wheel-pointer_2s_ease-in-out_infinite] sm:top-6" aria-hidden>
              <svg viewBox="0 0 24 24" className="size-8 sm:size-10" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div ref={boxRef} className="relative mt-6 flex aspect-square w-full max-w-[560px] items-center justify-center">
              <canvas
                ref={canvasRef}
                onClick={spin}
                className="size-full cursor-pointer rounded-full drop-shadow-2xl"
                role="img"
                aria-label={`Колесо: ${countLabel(active.length, ["учень", "учні", "учнів"])}`}
              />
              <button
                onClick={spin}
                disabled={spinning}
                className="group absolute inset-0 z-10 m-auto flex size-24 flex-col items-center justify-center rounded-full border-4 border-elevated bg-surface shadow-2xl transition hover:scale-105 sm:size-28"
                aria-label="Крутити колесо"
              >
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-sky-500">Клас</span>
                <span className="max-w-[5.5rem] truncate text-2xl font-extrabold sm:text-3xl">{current?.title}</span>
                <span className="mt-0.5 text-[10px] font-bold text-sky-500">{spinning ? "…" : "КРУТИТИ"}</span>
              </button>
            </div>
            <button
              onClick={spin}
              disabled={spinning}
              className="flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 px-8 py-4 text-lg font-extrabold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 hover:shadow-indigo-500/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:text-xl"
            >
              <Play className="size-5" /> {spinning ? "КРУТИТЬСЯ…" : "КРУТИТИ КОЛЕСО"}
            </button>
          </section>
        </main>
      )}

      {/* Переможець */}
      <Dialog open={!!winner} onOpenChange={(o) => !o && setWinner(null)}>
        <DialogContent size="sm" className="overflow-hidden text-center">
          <div className="pointer-events-none absolute -left-12 -top-12 size-32 rounded-full bg-sky-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 size-32 rounded-full bg-indigo-500/20 blur-2xl" />
          <div className="relative px-6 pb-6 pt-8">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-amber-400/20 text-amber-500">
              <Trophy className="size-8 motion-safe:animate-bounce" />
            </div>
            <span className="block text-xs font-extrabold uppercase tracking-widest text-sky-500">Обрано учня до дошки!</span>
            <DialogTitle className="my-3 break-words text-3xl font-black tracking-tight sm:text-4xl">{winner?.name}</DialogTitle>
            <DialogDescription className="mb-6">Клас: {winner?.cls}</DialogDescription>
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" className="w-full" onClick={() => setWinner(null)}>
                ЗАКРИТИ
              </Button>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  setWinner(null);
                  window.setTimeout(spin, 50);
                }}
              >
                ЩЕ РАЗ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Редагування учня */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent size="sm">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              const v = editing?.name.replace(/\s+/g, " ").trim().slice(0, 100);
              if (editing && v && current) updateStudents(current.id, (ss) => ss.map((s, j) => (j === editing.index ? { ...s, name: v } : s)));
              setEditing(null);
            }}
          >
            <DialogHeader>
              <DialogTitle>Редагувати учня</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Input autoFocus aria-label="Ім'я учня" value={editing?.name ?? ""} maxLength={100} onChange={(e) => setEditing((s) => (s ? { ...s, name: e.target.value } : s))} />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Скасувати
              </Button>
              <Button type="submit">Зберегти</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {groupDialog && (
        <GroupDialog group={groupDialog.group} nextOrder={nextOrder} onClose={() => setGroupDialog(null)} onSaved={(g) => setCurrentId(g.id)} />
      )}
      {pasteOpen && <PasteDialog onClose={() => setPasteOpen(false)} onAdd={addNames} />}
    </div>
  );
}
