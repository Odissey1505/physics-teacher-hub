import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/context/page-meta";

export function NotFoundPage({ what = "Сторінку" }: { what?: string }) {
  usePageMeta("Не знайдено");
  return (
    <EmptyState
      icon={Compass}
      title={`${what} не знайдено`}
      description="Можливо, запис видалено або посилання застаріло."
      action={
        <Button asChild>
          <Link to="/">На головну</Link>
        </Button>
      }
    />
  );
}
