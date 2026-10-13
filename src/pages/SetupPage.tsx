import { AlertTriangle, Database, FileCode2, KeyRound } from "lucide-react";
import { Brand } from "@/components/layout/Brand";

/** Екран, який показується, якщо в .env.local не вказано дані Supabase. Жодної підміни на localStorage. */
export function SetupPage({ secretKey }: { secretKey?: boolean }) {
  return (
    <div className="field-lines min-h-dvh px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
        <Brand />
        {secretKey ? (
          <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">У .env.local вказано СЕКРЕТНИЙ ключ (service_role / sb_secret_…)</p>
              <p>
                Такий ключ обходить усі правила безпеки й ніколи не повинен потрапляти у фронтенд. Замініть його на
                публічний ключ (publishable <code>sb_publishable_…</code> або legacy <code>anon</code>) і, про всяк
                випадок, перевипустіть секретний ключ у Supabase.
              </p>
            </div>
          </div>
        ) : (
          <h1 className="mt-6 text-2xl font-bold">Потрібно підключити Supabase</h1>
        )}
        <p className="mt-2 text-muted-foreground">
          Застосунок зберігає всі матеріали у вашій базі даних Supabase. Щоб почати, виконайте три кроки — детально
          описано у файлах <b>SUPABASE_SETUP_UA.md</b> та <b>LOCAL_SETUP_UA.md</b>.
        </p>
        <ol className="mt-6 space-y-4">
          <li className="flex gap-3">
            <Database className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">1. Створіть проєкт Supabase і виконайте SQL-міграції</p>
              <p className="text-sm text-muted-foreground">
                SQL Editor → по черзі файли з папки <code>supabase/migrations</code> (спочатку …0001_schema.sql, потім
                …0002_functions.sql).
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <FileCode2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">2. Створіть файл .env.local</p>
              <p className="text-sm text-muted-foreground">Скопіюйте .env.example → .env.local і вкажіть:</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-elevated p-3 text-xs">
{`VITE_SUPABASE_URL=https://ВАШ-ПРОЄКТ.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=ваш_публічний_ключ`}
              </pre>
            </div>
          </li>
          <li className="flex gap-3">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">3. Перезапустіть сервер розробки</p>
              <p className="text-sm text-muted-foreground">
                У терміналі натисніть <kbd>Ctrl + C</kbd>, потім знову <code>npm run dev</code> і відкрийте адресу, яку
                покаже Vite.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
