import DOMPurify from "dompurify";
import katex from "katex";

/**
 * Безпечний показ форматованого тексту (теорія, нотатки, конспекти).
 * 1) DOMPurify залишає лише дозволені теги/атрибути та http(s)/mailto посилання;
 * 2) формули між $…$ (у рядку) і $$…$$ (окремим рядком) рендеряться KaTeX
 *    з trust:false — команди на кшталт \href вимкнені.
 */

const ALLOWED_TAGS = [
  "p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "mark", "code", "pre",
  "ul", "ol", "li", "blockquote", "hr", "a", "img",
  "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col", "span", "div",
];
const ALLOWED_ATTR = ["href", "src", "alt", "title", "colspan", "rowspan", "target", "rel", "data-color", "style"];

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer nofollow");
    }
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src") ?? "";
      if (!/^https:\/\//i.test(src)) el.removeAttribute("src");
      el.setAttribute("loading", "lazy");
      el.setAttribute("referrerpolicy", "no-referrer");
    }
    // Дозволяємо лише безпечні inline-стилі ширини колонок таблиць (TipTap).
    if (el.hasAttribute("style")) {
      const style = el.getAttribute("style") ?? "";
      const safe = style
        .split(";")
        .map((s) => s.trim())
        .filter((s) => /^(min-width|width):\s*\d+(\.\d+)?(px|%|em)$/i.test(s))
        .join("; ");
      if (safe) el.setAttribute("style", safe);
      else el.removeAttribute("style");
    }
  });
}

export function sanitizeHtml(html: string | null | undefined): string {
  installHooks();
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
    FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input"],
  });
}

const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

export function renderLatex(expr: string, displayMode: boolean): { html: string; error: string | null } {
  try {
    return {
      html: katex.renderToString(expr, { displayMode, throwOnError: true, trust: false, strict: "ignore", output: "htmlAndMathml" }),
      error: null,
    };
  } catch (e) {
    return { html: "", error: e instanceof Error ? e.message.replace(/^KaTeX parse error:\s*/, "") : "Помилка у формулі" };
  }
}

function renderMathInto(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (t.parentElement?.closest("code, pre")) continue;
    if (t.data.includes("$")) nodes.push(t);
  }
  for (const node of nodes) {
    const text = node.data;
    MATH_RE.lastIndex = 0;
    if (!MATH_RE.test(text)) continue;
    MATH_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = MATH_RE.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const display = m[1] !== undefined;
      const expr = (m[1] ?? m[2]).trim();
      const { html, error } = renderLatex(expr, display);
      const span = document.createElement("span");
      if (error) {
        span.className = "math-error";
        span.title = `Помилка у формулі: ${error}`;
        span.textContent = m[0];
      } else {
        span.innerHTML = html; // вихід KaTeX з trust:false
      }
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  }
}

/** Санітизований HTML із відрендереними формулами — для dangerouslySetInnerHTML. */
export function renderRichHtml(html: string | null | undefined): string {
  const clean = sanitizeHtml(html);
  if (!clean.includes("$")) return clean;
  const container = document.createElement("div");
  container.innerHTML = clean;
  renderMathInto(container);
  return container.innerHTML;
}

export function isEmptyHtml(html: string | null | undefined) {
  if (!html) return true;
  const text = html.replace(/<(?!img)[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return text.length === 0 && !/<img/i.test(html);
}
