import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, MailCheck } from "lucide-react";
import { Brand, FieldLinesDecor } from "@/components/layout/Brand";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { supabase, appBaseUrl } from "@/lib/supabase";
import { humanizeError } from "@/lib/errors";
import { useAuth } from "@/context/auth";

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Physics Teacher Hub`;
  }, [title]);
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <FieldLinesDecor className="absolute -top-10 left-1/2 w-[900px] max-w-none -translate-x-1/2 text-primary/30" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface/95 p-6 shadow-2xl backdrop-blur sm:p-8">
        <Brand />
        <p className="mt-2 text-sm text-muted-foreground">Уся фізика. Усі матеріали. Один простір.</p>
        <h1 className="mt-6 text-xl font-bold">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function PasswordInput(
  props,
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} ref={ref} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-elevated"
        aria-label={show ? "Сховати пароль" : "Показати пароль"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

function Notice({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 flex gap-2 rounded-lg border p-3 text-sm ${
        tone === "error" ? "border-destructive/40 bg-destructive/10" : "border-success/40 bg-success/10"
      }`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone === "error" ? "text-destructive" : "text-success"}`} />
      <div>{children}</div>
    </div>
  );
}

function useAuthMessage() {
  const [msg] = useState(() => {
    try {
      const m = sessionStorage.getItem("pth-auth-message");
      sessionStorage.removeItem("pth-auth-message");
      return m;
    } catch {
      return null;
    }
  });
  return msg;
}

const emailField = z.string().trim().min(1, "Вкажіть email").email("Некоректний email");
const passwordField = z.string().min(8, "Мінімум 8 символів").max(72, "Максимум 72 символи");

/* ---------------- Вхід ---------------- */

const loginSchema = z.object({ email: emailField, password: z.string().min(1, "Вкажіть пароль") });

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectMsg = useAuthMessage();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const { error: e } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    if (e) return setError(humanizeError(e));
    navigate(from, { replace: true });
  });

  return (
    <AuthShell title="Вхід" subtitle="Увійдіть, щоб відкрити свій кабінет на будь-якому пристрої.">
      {redirectMsg && <Notice tone="error">{redirectMsg}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="l-email" error={formState.errors.email?.message}>
          <Input id="l-email" type="email" autoComplete="email" autoFocus {...register("email")} />
        </Field>
        <Field label="Пароль" htmlFor="l-pass" error={formState.errors.password?.message}>
          <PasswordInput id="l-pass" autoComplete="current-password" {...register("password")} />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Увійти
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
        <Link to="/forgot-password" className="text-primary hover:underline">
          Забули пароль?
        </Link>
        <Link to="/register" className="text-primary hover:underline">
          Створити акаунт
        </Link>
      </div>
    </AuthShell>
  );
}

/* ---------------- Реєстрація ---------------- */

const registerSchema = z
  .object({ email: emailField, password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Паролі не збігаються" });

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const { data, error: e } = await supabase!.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: appBaseUrl() },
    });
    if (e) return setError(humanizeError(e));
    if (data.session) {
      toast.success("Акаунт створено!");
      navigate("/", { replace: true });
    } else {
      setSentTo(email.trim()); // увімкнено підтвердження email
    }
  });

  if (sentTo) {
    return (
      <AuthShell title="Підтвердьте email">
        <div className="flex gap-3">
          <MailCheck className="size-6 shrink-0 text-success" />
          <div className="space-y-2 text-sm">
            <p>
              Ми надіслали лист на <b>{sentTo}</b>. Відкрийте посилання з листа, щоб підтвердити акаунт.
            </p>
            <p className="text-muted-foreground">
              Листа немає кілька хвилин? Перевірте «Спам». Якщо такий email уже зареєстровано, лист може не надійти —
              спробуйте увійти або відновити пароль.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link to="/login">До входу</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Реєстрація" subtitle="Кожен акаунт бачить лише власні матеріали.">
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Email" htmlFor="r-email" error={formState.errors.email?.message}>
          <Input id="r-email" type="email" autoComplete="email" autoFocus {...register("email")} />
        </Field>
        <Field label="Пароль" htmlFor="r-pass" error={formState.errors.password?.message} hint="Щонайменше 8 символів">
          <PasswordInput id="r-pass" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Повторіть пароль" htmlFor="r-confirm" error={formState.errors.confirm?.message}>
          <PasswordInput id="r-confirm" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Зареєструватися
        </Button>
      </form>
      <p className="mt-5 text-sm">
        Уже маєте акаунт?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Увійти
        </Link>
      </p>
    </AuthShell>
  );
}

/* ---------------- Забули пароль ---------------- */

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState } = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: emailField })),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    const { error: e } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
      // Маркер pth_action=recovery допомагає відкрити сторінку нового пароля після переходу з листа.
      redirectTo: `${appBaseUrl()}?pth_action=recovery`,
    });
    if (e) return setError(humanizeError(e));
    setSent(true);
  });

  return (
    <AuthShell title="Відновлення пароля" subtitle="Ми надішлемо посилання для встановлення нового пароля.">
      {sent ? (
        <Notice tone="success">
          Якщо акаунт із цим email існує, лист уже в дорозі. Відкрийте посилання <b>у цьому ж браузері</b> — так
          захищений обмін кодом спрацює.
        </Notice>
      ) : (
        <>
          {error && <Notice tone="error">{error}</Notice>}
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Email" htmlFor="f-email" error={formState.errors.email?.message}>
              <Input id="f-email" type="email" autoComplete="email" autoFocus {...register("email")} />
            </Field>
            <Button type="submit" className="w-full" loading={formState.isSubmitting}>
              Надіслати посилання
            </Button>
          </form>
        </>
      )}
      <p className="mt-5 text-sm">
        <Link to="/login" className="text-primary hover:underline">
          ← Повернутися до входу
        </Link>
      </p>
    </AuthShell>
  );
}

/* ---------------- Новий пароль ---------------- */

const resetSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Паролі не збігаються" });

export function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const redirectMsg = useAuthMessage();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error: e } = await supabase!.auth.updateUser({ password });
    if (e) return setError(humanizeError(e));
    toast.success("Пароль змінено");
    navigate("/", { replace: true });
  });

  if (loading) return null;

  if (!session) {
    return (
      <AuthShell title="Посилання недійсне">
        <Notice tone="error">
          {redirectMsg ??
            "Сесію відновлення не знайдено. Посилання могло застаріти або відкрите в іншому браузері. Надішліть новий лист."}
        </Notice>
        <Button asChild className="w-full">
          <Link to="/forgot-password">Надіслати новий лист</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Новий пароль" subtitle={`Для акаунта ${session.user.email}`}>
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="Новий пароль" htmlFor="np-pass" error={formState.errors.password?.message} hint="Щонайменше 8 символів">
          <PasswordInput id="np-pass" autoComplete="new-password" autoFocus {...register("password")} />
        </Field>
        <Field label="Повторіть пароль" htmlFor="np-confirm" error={formState.errors.confirm?.message}>
          <PasswordInput id="np-confirm" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Зберегти пароль
        </Button>
      </form>
    </AuthShell>
  );
}
