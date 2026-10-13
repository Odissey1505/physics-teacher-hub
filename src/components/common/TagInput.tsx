import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { SUGGESTED_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAX_TAGS = 20;

export function TagInput({
  value,
  onChange,
  id,
  extraSuggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  extraSuggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag) return;
    if (value.some((t) => t.toLocaleLowerCase("uk") === tag.toLocaleLowerCase("uk"))) return;
    if (value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const suggestions = [...new Set([...SUGGESTED_TAGS, ...extraSuggestions])].filter(
    (s) => !value.some((t) => t.toLocaleLowerCase("uk") === s.toLocaleLowerCase("uk")),
  );

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-surface px-2 py-1.5 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded-full p-0.5 hover:bg-primary/20"
              aria-label={`Прибрати тег ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          placeholder={value.length ? "" : "Введіть тег і натисніть Enter"}
          className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/80"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 14).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary",
              )}
            >
              <Plus className="size-3" /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
