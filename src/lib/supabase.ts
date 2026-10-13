import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "";

function looksConfigured() {
  if (!url || !key) return false;
  if (url.includes("YOUR-PROJECT-REF") || key.includes("YOUR-")) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Чи вказано у .env.local URL і публічний ключ Supabase. */
export const isSupabaseConfigured = looksConfigured();

/** Захист від випадкового використання service_role ключа у фронтенді. */
export const looksLikeSecretKey = /^sb_secret_/.test(key) || (() => {
  try {
    const payload = JSON.parse(atob(key.split(".")[1] ?? ""));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
})();

export const supabaseUrlForDisplay = url;

export const supabase: SupabaseClient | null =
  isSupabaseConfigured && !looksLikeSecretKey
    ? createClient(url, key, {
        auth: {
          // PKCE: токени повертаються як ?code=… у query-рядку,
          // що не конфліктує з HashRouter (#/маршрут).
          flowType: "pkce",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
          storageKey: "pth-auth",
        },
      })
    : null;

/** Повертає клієнт або кидає зрозумілу помилку (використовується в API-шарі). */
export function db(): SupabaseClient {
  if (!supabase) throw new Error("Supabase не налаштовано. Перевірте файл .env.local.");
  return supabase;
}

/** Адреса застосунку без hash і query — для посилань у листах Supabase. */
export function appBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}
