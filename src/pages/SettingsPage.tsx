import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings,
  Download,
  Upload,
  Sun,
  Moon,
  UserRound,
  KeyRound,
  DatabaseBackup,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Star,
  FileJson,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/misc";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/States";
import { usePageMeta } from "@/context/page-meta";
import { useTheme } from "@/context/theme";
import { useAuth } from "@/context/auth";
import { importWorkspace, setCurrentSection, updateProfile } from "@/lib/api";
import {
  MAX_BACKUP_BYTES,
  TABLE_LABELS,
  backupCounts,
  exportWorkspace,
  findDuplicates,
  parseBackup,
  type DuplicateReport,
  type ParsedBackup,
} from "@/lib/backup";
import { humanizeError } from "@/lib/errors";
import { qk, useCourse, useFormulas, useInvalidate, useMaterials, useProfile, useQuizzes } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn, downloadText } from "@/lib/utils";
import type { TableName } from "@/lib/api";

function ProfileCard() {
  const { user } = useAuth();
  const profile = useProfile();
  const invalidate = useInvalidate();
  const [name, setName] = useState("");
  useEffect(() => setName(profile.data?.display_name ?? ""), [profile.data?.display_name]);
  const save = useMutation({
    mutationFn: () => updateProfile({ display_name: name.trim() || null }),
    onSuccess: async () => {
      await invalidate(qk.profile);
      toast.success("Профіль збережено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" /> Профіль
        </CardTitle>
        <CardDescription>Акаунт: {user?.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Ім'я (необов'язково)" htmlFor="p-name">
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Як до вас звертатися" />
        </Field>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={name === (profile.data?.display_name ?? "")}>
          Зберегти
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const course = useCourse();
  const invalidate = useInvalidate();
  const setCurrent = useMutation({
    mutationFn: setCurrentSection,
    onSuccess: async () => {
      await invalidate(qk.sections);
      toast.success("Поточний розділ змінено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="size-4 text-primary" /> Вигляд і робочий простір
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Тема оформлення</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["dark", "Темна", Moon],
                ["light", "Світла", Sun],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setTheme(v)}
                aria-pressed={theme === v}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border border-border p-3 text-sm font-medium transition",
                  theme === v && "border-primary bg-primary/10 text-primary",
                )}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">Зберігається в цьому браузері.</p>
        </fieldset>
        <Field label="Поточний розділ (показується на головній)" htmlFor="cur-section">
          <NativeSelect
            id="cur-section"
            value={course.currentSection?.id ?? ""}
            onChange={(e) => e.target.value && setCurrent.mutate(e.target.value)}
            disabled={setCurrent.isPending}
          >
            {!course.currentSection && <option value="">— Не обрано —</option>}
            {course.classes.map((c) => (
              <optgroup key={c.id} label={c.title}>
                {(course.sectionsByClass.get(c.id) ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </Field>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new Error("Пароль має містити щонайменше 8 символів.");
      if (password !== confirmPw) throw new Error("Паролі не збігаються.");
      const { error: e } = await supabase!.auth.updateUser({ password });
      if (e) throw e;
    },
    onSuccess: () => {
      setPassword("");
      setConfirmPw("");
      setError(null);
      toast.success("Пароль змінено");
    },
    onError: (e) => setError(humanizeError(e)),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" /> Змінити пароль
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Новий пароль" htmlFor="pw1">
            <Input id="pw1" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Повторіть пароль" htmlFor="pw2" error={error ?? undefined}>
            <Input id="pw2" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </Field>
          <Button type="submit" loading={save.isPending} disabled={!password}>
            Змінити пароль
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ImportDialog({ file, onClose }: { file: { name: string; data: ParsedBackup; dupes: DuplicateReport }; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const counts = backupCounts(file.data);
  const dupTotal = file.dupes.topics + file.dupes.materials + file.dupes.formulas + file.dupes.quizzes;

  const run = useMutation({
    mutationFn: () => importWorkspace(file.data, mode),
    onSuccess: async (r) => {
      setResult(r);
      await qc.invalidateQueries();
      toast.success("Імпорт завершено");
    },
    onError: (e) => toast.error(`Імпорт скасовано, жодних змін не внесено. ${humanizeError(e)}`, { duration: 10000 }),
  });

  const canRun = mode === "merge" || typed.trim().toUpperCase() === "ЗАМІНИТИ";

  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Імпорт даних</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <FileJson className="size-4" /> {file.name}
            {file.data.exported_at && ` · експорт від ${new Date(file.data.exported_at).toLocaleString("uk-UA")}`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4 text-sm">
          {result ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-medium text-success">
                <CheckCircle2 className="size-5" /> Усі дані імпортовано однією транзакцією.
              </p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {Object.entries(result).map(([k, v]) => (
                  <li key={k} className="flex justify-between rounded-md bg-elevated/50 px-3 py-1.5">
                    <span>{TABLE_LABELS[k as TableName] ?? k}</span>
                    <b className="tabular-nums">{v}</b>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 font-medium">Вміст файлу:</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {counts.map((c) => (
                    <li key={c.table} className="flex justify-between rounded-md bg-elevated/50 px-3 py-1.5">
                      <span>{c.label}</span>
                      <b className="tabular-nums">{c.count}</b>
                    </li>
                  ))}
                </ul>
              </div>
              {dupTotal > 0 && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
                  <p className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="size-4 text-warning" /> Можливі дублікати з наявними даними
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Теми: {file.dupes.topics}, матеріали: {file.dupes.materials}, формули: {file.dupes.formulas}, квізи:{" "}
                    {file.dupes.quizzes}. У режимі «Додати» вони з'являться вдруге.
                  </p>
                  {file.dupes.examples.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                      {file.dupes.examples.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <fieldset className="space-y-2">
                <legend className="mb-1 font-medium">Як імпортувати?</legend>
                {(
                  [
                    ["merge", "Додати до наявних даних", "Нічого не видаляється. Усі записи з файлу додаються як нові (з новими ідентифікаторами), зв'язки між ними відновлюються."],
                    ["replace", "Замінити всі мої дані", "Спершу ВСІ ваші класи, розділи, теми, матеріали, формули, нотатки та квізи буде видалено, потім завантажено дані з файлу."],
                  ] as const
                ).map(([v, title, text]) => (
                  <label
                    key={v}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border border-border p-3",
                      mode === v && (v === "replace" ? "border-destructive bg-destructive/5" : "border-primary bg-primary/5"),
                    )}
                  >
                    <input type="radio" name="imp-mode" className="mt-1" checked={mode === v} onChange={() => setMode(v)} />
                    <span>
                      <span className="block font-medium">{title}</span>
                      <span className="block text-muted-foreground">{text}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {mode === "replace" && (
                <Field label="Щоб підтвердити заміну, введіть слово ЗАМІНИТИ" htmlFor="imp-confirm" hint="Рекомендуємо спершу експортувати поточні дані.">
                  <Input id="imp-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
                </Field>
              )}
              <p className="flex gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Імпорт атомарний: якщо щось піде не так, база залишиться без змін. Усі записи належатимуть вашому акаунту
                незалежно від того, хто створив файл.
              </p>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          {result ? (
            <Button onClick={onClose}>Готово</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={run.isPending}>
                Скасувати
              </Button>
              <Button variant={mode === "replace" ? "destructive" : "default"} onClick={() => run.mutate()} disabled={!canRun} loading={run.isPending}>
                <Upload /> {mode === "replace" ? "Замінити дані" : "Імпортувати"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BackupCard() {
  const course = useCourse();
  const materials = useMaterials();
  const formulas = useFormulas();
  const quizzes = useQuizzes();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; data: ParsedBackup; dupes: DuplicateReport } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const exportMut = useMutation({
    mutationFn: exportWorkspace,
    onSuccess: (payload) => {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      downloadText(`physics-teacher-hub-backup-${stamp}.json`, JSON.stringify(payload, null, 2));
      const total = Object.values(payload.data).reduce((s, a) => s + a.length, 0);
      toast.success(`Експортовано ${total} записів`);
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const onFile = async (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (f.size > MAX_BACKUP_BYTES) return setFileError("Файл завеликий (максимум 20 МБ).");
    const parsed = parseBackup(await f.text());
    if (!parsed.ok) return setFileError(parsed.error);
    setPending({
      name: f.name,
      data: parsed.data,
      dupes: findDuplicates(parsed.data, {
        topics: course.topics,
        materials: materials.data ?? [],
        formulas: formulas.data ?? [],
        quizzes: quizzes.data ?? [],
      }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseBackup className="size-4 text-primary" /> Резервна копія
        </CardTitle>
        <CardDescription>
          Файл JSON з усіма вашими класами, темами, матеріалами, формулами, нотатками та квізами (включно з ключами
          відповідей). Зберігайте його в надійному місці.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportMut.mutate()} loading={exportMut.isPending}>
            <Download /> Експортувати дані
          </Button>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload /> Імпортувати дані
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {fileError && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4" /> {fileError}
          </p>
        )}
      </CardContent>
      {pending && <ImportDialog file={pending} onClose={() => setPending(null)} />}
    </Card>
  );
}

export function SettingsPage() {
  usePageMeta("Налаштування", [{ label: "Головна", to: "/" }, { label: "Налаштування" }]);
  const { signOut } = useAuth();
  return (
    <>
      <PageHeader title="Налаштування" icon={Settings} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ProfileCard />
          <AppearanceCard />
          <PasswordCard />
        </div>
        <div className="space-y-5">
          <BackupCard />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="size-4 text-primary" /> Про застосунок
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <b className="text-foreground">Physics Teacher Hub</b> — Уся фізика. Усі матеріали. Один простір.
              </p>
              <p>
                Дані зберігаються у вашому проєкті Supabase й доступні з будь-якого пристрою після входу. Тема оформлення та
                стан меню зберігаються лише в цьому браузері.
              </p>
              <Button variant="outline" onClick={() => signOut()}>
                <LogOut /> Вийти з акаунта
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
