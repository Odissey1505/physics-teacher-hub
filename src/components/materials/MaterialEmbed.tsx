import { ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectProvider, embedHint, getEmbed, isSafeUrl, providerLabel } from "@/lib/providers";
import { cn } from "@/lib/utils";

const ASPECT: Record<string, string> = {
  video: "aspect-video",
  slides: "aspect-[16/9.6]",
  doc: "h-[70vh] min-h-[420px]",
  app: "aspect-[16/10] min-h-[360px]",
};

/** Перегляд ресурсу всередині застосунку, якщо провайдер це дозволяє. Кнопка «Відкрити в новій вкладці» — завжди. */
export function MaterialEmbed({ url, title, large }: { url: string | null; title: string; large?: boolean }) {
  if (!url || !isSafeUrl(url)) return null;
  const embed = getEmbed(url);
  const provider = detectProvider(url);
  const hint = embedHint(provider);

  return (
    <div className="space-y-3">
      {embed ? (
        <div className={cn("overflow-hidden rounded-xl border border-border bg-black/80", ASPECT[embed.aspect], large && "max-h-[78vh]")}>
          <iframe
            src={embed.src}
            title={title}
            className="size-full"
            loading="lazy"
            allow={embed.allow}
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            {...(embed.sandbox ? { sandbox: embed.sandbox } : {})}
          />
        </div>
      ) : (
        <div className="flex gap-2 rounded-xl border border-dashed border-border bg-elevated/30 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            {hint ??
              `${providerLabel(provider) ?? "Цей сайт"} не підтримує вбудований перегляд у застосунку (або формат посилання невідомий). Відкрийте ресурс у новій вкладці.`}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={embed ? "outline" : "default"}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> Відкрити в новій вкладці
          </a>
        </Button>
        {embed && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
