import type { MaterialType } from "./types";

/**
 * Розпізнавання провайдерів за ім'ям хоста та побудова адрес вбудовування
 * у задокументованих форматах. Метадані з чужих сайтів НЕ завантажуються
 * (CORS) — назву й опис завжди можна ввести вручну.
 */

export type ProviderId =
  | "youtube"
  | "google_slides"
  | "google_docs"
  | "google_sheets"
  | "google_forms"
  | "google_drive"
  | "kahoot"
  | "quizizz"
  | "wordwall"
  | "learningapps"
  | "phet"
  | "other";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  suggestedType: MaterialType;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  youtube: { id: "youtube", label: "YouTube", suggestedType: "video" },
  google_slides: { id: "google_slides", label: "Google Slides", suggestedType: "presentation" },
  google_docs: { id: "google_docs", label: "Google Docs", suggestedType: "document" },
  google_sheets: { id: "google_sheets", label: "Google Sheets", suggestedType: "document" },
  google_forms: { id: "google_forms", label: "Google Forms", suggestedType: "test" },
  google_drive: { id: "google_drive", label: "Google Drive", suggestedType: "document" },
  kahoot: { id: "kahoot", label: "Kahoot", suggestedType: "quiz" },
  quizizz: { id: "quizizz", label: "Quizizz / Wayground", suggestedType: "quiz" },
  wordwall: { id: "wordwall", label: "Wordwall", suggestedType: "game" },
  learningapps: { id: "learningapps", label: "LearningApps", suggestedType: "game" },
  phet: { id: "phet", label: "PhET", suggestedType: "simulation" },
  other: { id: "other", label: "Інший сайт", suggestedType: "link" },
};

/** Повертає URL лише для http/https, інакше null. */
export function parseSafeUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u;
  } catch {
    return null;
  }
}

export function isSafeUrl(raw: string | null | undefined) {
  return parseSafeUrl(raw) !== null;
}

function hostIs(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function detectProvider(raw: string | null | undefined): ProviderId | null {
  const u = parseSafeUrl(raw);
  if (!u) return null;
  const h = u.hostname.toLowerCase();
  const p = u.pathname;
  if (hostIs(h, "youtube.com") || hostIs(h, "youtu.be") || hostIs(h, "youtube-nocookie.com")) return "youtube";
  if (h === "docs.google.com") {
    if (p.startsWith("/presentation/")) return "google_slides";
    if (p.startsWith("/document/")) return "google_docs";
    if (p.startsWith("/spreadsheets/")) return "google_sheets";
    if (p.startsWith("/forms/")) return "google_forms";
    return "google_drive";
  }
  if (h === "forms.gle") return "google_forms";
  if (h === "drive.google.com") return "google_drive";
  if (hostIs(h, "kahoot.it") || hostIs(h, "kahoot.com")) return "kahoot";
  if (hostIs(h, "quizizz.com") || hostIs(h, "wayground.com")) return "quizizz";
  if (hostIs(h, "wordwall.net")) return "wordwall";
  if (hostIs(h, "learningapps.org")) return "learningapps";
  if (hostIs(h, "phet.colorado.edu")) return "phet";
  return "other";
}

export function providerLabel(id: string | null | undefined) {
  if (!id) return null;
  return PROVIDERS[id as ProviderId]?.label ?? id;
}

export function getYouTubeId(raw: string): string | null {
  const u = parseSafeUrl(raw);
  if (!u) return null;
  const h = u.hostname.toLowerCase();
  let id: string | null = null;
  if (hostIs(h, "youtu.be")) id = u.pathname.slice(1).split("/")[0];
  else if (u.pathname === "/watch") id = u.searchParams.get("v");
  else {
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    if (m) id = m[1];
  }
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

function youTubeStart(u: URL): number | null {
  const t = u.searchParams.get("t") ?? u.searchParams.get("start");
  if (!t) return null;
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!m) return null;
  const s = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return s > 0 ? s : null;
}

export function getThumbnail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = getYouTubeId(raw);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export interface EmbedInfo {
  src: string;
  /** Співвідношення сторін для контейнера. */
  aspect: "video" | "slides" | "doc" | "app";
  allow?: string;
  /** Пісочниця для iframe; undefined — без обмежень sandbox (лише для перевірених провайдерів). */
  sandbox?: string;
}

const SANDBOX_APP = "allow-scripts allow-same-origin allow-popups allow-forms allow-presentation";

/**
 * Будує адресу вбудовування для провайдерів із задокументованими форматами.
 * Повертає null, якщо сайт не підтримує вбудовування або формат невідомий —
 * тоді показується лише кнопка «Відкрити в новій вкладці».
 */
export function getEmbed(raw: string | null | undefined): EmbedInfo | null {
  const u = parseSafeUrl(raw);
  if (!u || u.protocol !== "https:") return null;
  const provider = detectProvider(raw);
  const p = u.pathname;

  switch (provider) {
    case "youtube": {
      const id = getYouTubeId(u.href);
      if (!id) return null;
      const start = youTubeStart(u);
      return {
        src: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`,
        aspect: "video",
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
      };
    }
    case "google_slides": {
      const m = p.match(/^\/presentation\/d\/(e\/)?([A-Za-z0-9_-]+)/);
      if (!m) return null;
      return {
        src: m[1]
          ? `https://docs.google.com/presentation/d/e/${m[2]}/embed?start=false&loop=false`
          : `https://docs.google.com/presentation/d/${m[2]}/embed?start=false&loop=false`,
        aspect: "slides",
        allow: "fullscreen",
      };
    }
    case "google_docs": {
      const m = p.match(/^\/document\/d\/(e\/)?([A-Za-z0-9_-]+)/);
      if (!m) return null;
      return {
        src: m[1]
          ? `https://docs.google.com/document/d/e/${m[2]}/pub?embedded=true`
          : `https://docs.google.com/document/d/${m[2]}/preview`,
        aspect: "doc",
      };
    }
    case "google_sheets": {
      const m = p.match(/^\/spreadsheets\/d\/(e\/)?([A-Za-z0-9_-]+)/);
      if (!m) return null;
      return {
        src: m[1]
          ? `https://docs.google.com/spreadsheets/d/e/${m[2]}/pubhtml?widget=true&headers=false`
          : `https://docs.google.com/spreadsheets/d/${m[2]}/preview`,
        aspect: "doc",
      };
    }
    case "google_forms": {
      const m = p.match(/^\/forms\/d\/e\/([A-Za-z0-9_-]+)/);
      if (!m) return null; // короткі посилання forms.gle вбудувати не можна
      return { src: `https://docs.google.com/forms/d/e/${m[1]}/viewform?embedded=true`, aspect: "doc" };
    }
    case "google_drive": {
      const m = p.match(/^\/file\/d\/([A-Za-z0-9_-]+)/);
      if (!m) return null;
      return { src: `https://drive.google.com/file/d/${m[1]}/preview`, aspect: "doc", allow: "autoplay; fullscreen" };
    }
    case "learningapps": {
      // Офіційний код вставки LearningApps використовує сторінку watch?v=…
      const v = u.searchParams.get("v");
      if (p.startsWith("/watch") && v && /^[A-Za-z0-9]+$/.test(v)) {
        return { src: `https://learningapps.org/watch?v=${v}`, aspect: "app", allow: "fullscreen", sandbox: SANDBOX_APP };
      }
      return null;
    }
    case "phet": {
      // HTML5-симуляції: /sims/html/<назва>/latest/<назва>_<мова>.html
      if (/^\/sims\/html\/[a-z0-9-]+\/[^/]+\/[a-z0-9-]+_[A-Za-z_]+\.html$/.test(p)) {
        return { src: u.href, aspect: "app", allow: "fullscreen", sandbox: SANDBOX_APP };
      }
      const m = p.match(/^\/(?:[a-z]{2}(?:_[A-Z]{2})?\/)?simulations?\/([a-z0-9-]+)\/?$/);
      if (m) {
        return {
          src: `https://phet.colorado.edu/sims/html/${m[1]}/latest/${m[1]}_all.html?locale=uk`,
          aspect: "app",
          allow: "fullscreen",
          sandbox: SANDBOX_APP,
        };
      }
      return null;
    }
    case "wordwall": {
      // Вбудовується лише офіційна адреса /embed/… з коду «Поділитися → Вставити».
      if (/^\/(?:[a-z]{2}\/)?embed\/[A-Za-z0-9]+/.test(p)) {
        return { src: u.href, aspect: "app", allow: "fullscreen", sandbox: SANDBOX_APP };
      }
      return null;
    }
    default:
      // Kahoot, Quizizz/Wayground та інші сайти забороняють або не документують вбудовування.
      return null;
  }
}

export function embedHint(provider: ProviderId | null): string | null {
  switch (provider) {
    case "kahoot":
      return "Kahoot не дозволяє вбудовування — гра відкриється в новій вкладці.";
    case "quizizz":
      return "Quizizz / Wayground відкривається в новій вкладці.";
    case "wordwall":
      return "Для вбудовування вставте адресу з коду «Вставити» (…/embed/…). Інакше ресурс відкриється в новій вкладці.";
    case "google_forms":
      return "Для вбудовування потрібне повне посилання …/forms/d/e/…/viewform.";
    case "google_slides":
    case "google_docs":
    case "google_drive":
      return "Файл має бути доступний за посиланням, інакше Google покаже запит на вхід.";
    default:
      return null;
  }
}
