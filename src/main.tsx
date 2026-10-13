import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./lib/zod-uk";
import { App } from "./App";
import { supabase } from "./lib/supabase";

/**
 * Обробка посилань із листів Supabase (підтвердження email, скидання пароля)
 * ДО того, як HashRouter почне інтерпретувати адресу.
 *
 * Supabase повертає користувача на адресу на кшталт
 *   https://site/?code=…&pth_action=recovery#/
 * (PKCE: код у query-рядку). Клієнт Supabase обмінює код на сесію, а ми
 * прибираємо службові параметри й переводимо на потрібний маршрут (#/reset-password).
 * Також підтримано старий формат з токенами в hash (#access_token=…).
 */
async function processAuthRedirect() {
  const url = new URL(window.location.href);
  const sp = url.searchParams;
  const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashLooksLikeAuth = /(^|&)(access_token|error|error_description)=/.test(rawHash);
  const hashParams = hashLooksLikeAuth ? new URLSearchParams(rawHash) : null;

  const hadAuthParams =
    sp.has("code") || sp.has("pth_action") || sp.has("error") || sp.has("error_description") || hashLooksLikeAuth;
  if (!hadAuthParams) return;

  let isRecovery = sp.get("pth_action") === "recovery" || hashParams?.get("type") === "recovery";
  let errorText = sp.get("error_description") ?? hashParams?.get("error_description") ?? null;

  if (supabase) {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") isRecovery = true;
    });
    try {
      if (hashParams?.get("access_token") && hashParams.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({
          access_token: hashParams.get("access_token")!,
          refresh_token: hashParams.get("refresh_token")!,
        });
        if (error) errorText = errorText ?? error.message;
      }
      const { error } = await supabase.auth.initialize();
      if (error && sp.has("code")) {
        errorText =
          errorText ??
          (isRecovery
            ? "Посилання для скидання пароля недійсне або вже використане. Відкрийте його в тому ж браузері, де надсилали запит, або надішліть новий лист."
            : "Не вдалося завершити вхід за посиланням. Якщо ви підтверджували пошту — просто увійдіть із паролем.");
      }
    } finally {
      sub.subscription.unsubscribe();
    }
  }

  if (errorText) {
    try {
      sessionStorage.setItem("pth-auth-message", errorText.replace(/\+/g, " "));
    } catch {
      /* ignore */
    }
  }
  const route = isRecovery ? "/reset-password" : errorText ? "/login" : "/";
  window.history.replaceState(null, "", `${url.pathname}#${route}`);
}

processAuthRedirect().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
