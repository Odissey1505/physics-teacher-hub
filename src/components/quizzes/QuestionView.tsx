import { CheckCircle2, XCircle } from "lucide-react";
import { TextWithMath } from "@/components/common/Math";
import { Input } from "@/components/ui/form-controls";
import type { GradeResult, QuizQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export type AnswerValue = number | boolean | string | null;

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];

/** Показ питання учням: лише текст і варіанти, без ключа відповіді. */
export function QuestionView({
  question,
  value,
  onChange,
  locked,
  result,
  large,
  showExplanation = true,
}: {
  question: QuizQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  locked?: boolean;
  result?: GradeResult | null;
  large?: boolean;
  showExplanation?: boolean;
}) {
  return (
    <div className="space-y-5">
      <TextWithMath text={question.prompt} className={cn("font-semibold leading-snug", large ? "text-3xl" : "text-xl")} />
      {question.image_url && /^https:\/\//.test(question.image_url) && (
        <img
          src={question.image_url}
          alt="Ілюстрація до питання"
          className="max-h-80 rounded-xl border border-border object-contain"
          referrerPolicy="no-referrer"
        />
      )}

      {question.qtype === "multiple_choice" && (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Варіанти відповіді">
          {question.options.map((o, i) => {
            const selected = value === i;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={locked}
                onClick={() => onChange(i)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 border-border p-4 text-left transition hover:border-primary/60 disabled:cursor-default",
                  large && "p-5 text-xl",
                  selected && "border-primary bg-primary/10",
                  result && selected && (result.correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"),
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg bg-elevated font-bold",
                    selected && "bg-primary text-white",
                  )}
                >
                  {LETTERS[i]}
                </span>
                <TextWithMath text={o} />
              </button>
            );
          })}
        </div>
      )}

      {question.qtype === "true_false" && (
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Правда чи неправда">
          {[true, false].map((v) => {
            const selected = value === v;
            return (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={locked}
                onClick={() => onChange(v)}
                className={cn(
                  "rounded-xl border-2 border-border p-5 text-lg font-semibold transition hover:border-primary/60 disabled:cursor-default",
                  large && "text-2xl",
                  selected && "border-primary bg-primary/10",
                  result && selected && (result.correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"),
                )}
              >
                {v ? "✓ Правда" : "✗ Неправда"}
              </button>
            );
          })}
        </div>
      )}

      {question.qtype === "short_answer" && (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          placeholder="Введіть відповідь…"
          aria-label="Ваша відповідь"
          className={cn("h-14 max-w-xl text-lg", large && "h-16 text-2xl")}
          maxLength={500}
        />
      )}

      {result && <ResultNote result={result} showExplanation={showExplanation} />}
    </div>
  );
}

export function ResultNote({ result, showExplanation = true }: { result: GradeResult; showExplanation?: boolean }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border p-4",
        result.correct ? "border-success/50 bg-success/10" : "border-destructive/50 bg-destructive/10",
      )}
    >
      <p className="flex items-center gap-2 font-semibold">
        {result.correct ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-destructive" />}
        {result.correct ? "Правильно!" : "Неправильно"}
      </p>
      {!result.correct && result.correct_answer && (
        <div className="mt-1 text-sm">
          Правильна відповідь: <TextWithMath text={result.correct_answer} className="inline [&_p]:inline" />
        </div>
      )}
      {showExplanation && result.explanation && <TextWithMath text={result.explanation} className="mt-2 text-sm text-muted-foreground" />}
    </div>
  );
}

export function isAnswered(q: QuizQuestion, v: AnswerValue) {
  if (q.qtype === "short_answer") return typeof v === "string" && v.trim().length > 0;
  return v !== null && v !== undefined;
}
