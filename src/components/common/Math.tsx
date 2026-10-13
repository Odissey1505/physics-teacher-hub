import { useMemo } from "react";
import { renderLatex, renderRichHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

/** Формула KaTeX; некоректний вираз показується як текст із повідомленням, а не ламає сторінку. */
export function MathFormula({
  latex,
  display = true,
  className,
}: {
  latex: string;
  display?: boolean;
  className?: string;
}) {
  const { html, error } = useMemo(() => renderLatex(latex, display), [latex, display]);
  if (error) {
    return (
      <div className={cn("rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm", className)}>
        <code className="break-all text-foreground">{latex}</code>
        <p className="mt-1 text-xs text-destructive">Помилка у формулі: {error}</p>
      </div>
    );
  }
  return (
    <div
      className={cn("overflow-x-auto", className)}
      // Вихід KaTeX із trust:false — без довільного HTML.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Санітизований форматований текст з формулами $…$. */
export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  const safe = useMemo(() => renderRichHtml(html), [html]);
  return <div className={cn("rich-content", className)} dangerouslySetInnerHTML={{ __html: safe }} />;
}

/** Простий текст з підтримкою формул $…$ (для описів, пояснень). */
export function TextWithMath({ text, className }: { text: string; className?: string }) {
  const safe = useMemo(() => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
    return renderRichHtml(escaped);
  }, [text]);
  return <div className={cn("rich-content", className)} dangerouslySetInnerHTML={{ __html: safe }} />;
}
