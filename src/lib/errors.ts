/** Помилка одночасного редагування: запис змінено на іншому пристрої. */
export class ConflictError extends Error {
  constructor() {
    super("Цей запис уже змінено на іншому пристрої або в іншій вкладці. Ваші зміни не втрачено — оновіть дані й збережіть ще раз.");
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Запис не знайдено — можливо, його видалено.") {
    super(message);
    this.name = "NotFoundError";
  }
}

interface PgLikeError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/** Перетворює помилку Supabase/мережі на зрозуміле українське повідомлення. */
export function humanizeError(err: unknown): string {
  if (!err) return "Сталася невідома помилка.";
  if (err instanceof ConflictError || err instanceof NotFoundError) return err.message;
  const e = err as PgLikeError & { name?: string; status?: number };
  const msg = e.message ?? String(err);

  if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) {
    return "Немає з'єднання з сервером. Перевірте інтернет і спробуйте ще раз — введені дані збережено у формі.";
  }
  if (e.code === "40001" || msg === "CONFLICT") return new ConflictError().message;
  if (e.code === "PGRST301" || /JWT expired|invalid JWT/i.test(msg)) {
    return "Сесія завершилась. Увійдіть знову.";
  }
  if (e.code === "42501" || /row-level security/i.test(msg)) {
    return "Немає доступу до цього запису.";
  }
  if (e.code === "23503") return "Пов'язаний запис (тему, розділ чи клас) не знайдено. Оновіть сторінку.";
  if (e.code === "23514") return "Дані не пройшли перевірку бази даних (занадто довгий текст або некоректне значення).";
  if (e.code === "23505") return "Такий запис уже існує.";
  if (e.code === "PGRST202" || /Could not find the function/i.test(msg)) {
    return "У базі даних немає потрібної функції. Перевірте, чи виконано обидві SQL-міграції.";
  }
  if (e.code === "42P01" || /relation .* does not exist|Could not find the table/i.test(msg)) {
    return "У базі даних немає потрібних таблиць. Виконайте SQL-міграції з папки supabase/migrations.";
  }
  if (/Invalid login credentials/i.test(msg)) return "Невірний email або пароль.";
  if (/Email not confirmed/i.test(msg)) return "Email ще не підтверджено. Перевірте пошту (і папку «Спам»).";
  if (/User already registered/i.test(msg)) return "Користувач із таким email уже зареєстрований.";
  if (/Password should be at least/i.test(msg)) return "Пароль закороткий (мінімум 8 символів).";
  if (/rate limit|too many requests/i.test(msg) || e.status === 429) {
    return "Забагато спроб. Зачекайте кілька хвилин і спробуйте знову.";
  }
  if (/New password should be different/i.test(msg)) return "Новий пароль має відрізнятися від старого.";
  if (/weak password|Password is known to be weak/i.test(msg)) return "Пароль занадто простий. Оберіть надійніший.";
  if (e.code === "P0001" && msg) return msg; // повідомлення з наших SQL-функцій (українською)
  return msg || "Сталася помилка.";
}
