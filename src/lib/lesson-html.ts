/**
 * Готує HTML-файл уроку до показу в iframe через `srcdoc`.
 *
 * Чому не blob-адреса: документ із blob: не передає адресу сайту (Referer),
 * і вбудовані YouTube-відео відмовляються відтворюватися («Помилка 153»).
 * Документ srcdoc передає адресу кабінету, тож відео працюють.
 *
 * `<base href="about:srcdoc">` потрібен, щоб посилання на кшталт `href="#етап"`
 * прокручували сам урок, а не завантажували кабінет усередині рамки.
 * Вставляється після <head> / <html> / <!doctype>, щоб не вмикати «режим сумісності» браузера.
 */
export function prepareLessonSrcdoc(html: string): string {
  const BASE = '<base href="about:srcdoc">';
  const text = html.replace(/^﻿/, "");
  for (const re of [/<head(\s[^>]*)?>/i, /<html(\s[^>]*)?>/i, /<!doctype[^>]*>/i]) {
    const m = re.exec(text);
    if (m) {
      const at = m.index + m[0].length;
      return text.slice(0, at) + BASE + text.slice(at);
    }
  }
  return BASE + text;
}
