import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Показується, коли запис змінено на іншому пристрої після відкриття форми.
 * Нічого не перезаписується без явної дії вчителя.
 */
export function ConflictBanner({
  onOverwrite,
  onDiscard,
  busy,
}: {
  onOverwrite: () => void;
  onDiscard: () => void;
  busy?: boolean;
}) {
  return (
    <div role="alert" className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="space-y-2">
          <p className="font-medium">Цей запис уже змінено на іншому пристрої або в іншій вкладці.</p>
          <p className="text-muted-foreground">
            Ваші зміни у формі збережено. Можна записати їх поверх новішої версії або закрити форму й переглянути
            актуальні дані.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="destructive" onClick={onOverwrite} loading={busy}>
              Зберегти мої зміни поверх
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDiscard} disabled={busy}>
              Закрити й переглянути новішу версію
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
