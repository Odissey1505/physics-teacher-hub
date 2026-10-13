import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCheck, Pencil, RotateCcw, Trophy, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/common/States";
import { TextWithMath } from "@/components/common/Math";
import { QuestionView, ResultNote, isAnswered, type AnswerValue } from "@/components/quizzes/QuestionView";
import { NotFoundPage } from "./NotFoundPage";
import { usePageMeta } from "@/context/page-meta";
import { gradeAnswer } from "@/lib/api";
import { humanizeError } from "@/lib/errors";
import { useQuizQuestions, useQuizzes } from "@/lib/queries";
import type { GradeResult } from "@/lib/types";
import { cn, plural } from "@/lib/utils";

/**
 * Проходження квізу: по одному питанню. Ключі відповідей у браузер не завантажуються —
 * перевірка виконується SQL-функцією grade_quiz_answer лише після явної дії вчителя.
 */
export default function QuizPlayPage() {
  const { quizId = "" } = useParams();
  const quizzes = useQuizzes();
  const questions = useQuizQuestions(quizId);
  const quiz = quizzes.data?.find((q) => q.id === quizId);
  const list = questions.data ?? [];

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [results, setResults] = useState<Record<string, GradeResult>>({});
  const [finished, setFinished] = useState(false);
  const [revealed, setRevealed] = useState(false);

  usePageMeta(quiz ? `Квіз: ${quiz.title}` : "Квіз", [
    { label: "Квізи та ігри", to: "/quizzes" },
    { label: quiz?.title ?? "Квіз", to: `/quizzes/${quizId}/edit` },
    { label: "Проходження" },
  ]);

  const gradeOne = useMutation({
    mutationFn: async (qid: string) => ({ qid, r: await gradeAnswer(qid, answers[qid] ?? null) }),
    onSuccess: ({ qid, r }) => setResults((s) => ({ ...s, [qid]: r })),
    onError: (e) => toast.error(humanizeError(e)),
  });

  const gradeAll = useMutation({
    mutationFn: async () => {
      const entries = await Promise.all(
        list.map(async (q) => [q.id, results[q.id] ?? (await gradeAnswer(q.id, answers[q.id] ?? null))] as const),
      );
      return Object.fromEntries(entries) as Record<string, GradeResult>;
    },
    onSuccess: (r) => {
      setResults(r);
      setRevealed(true);
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  const restart = () => {
    setIndex(0);
    setAnswers({});
    setResults({});
    setFinished(false);
    setRevealed(false);
  };

  if (quizzes.isLoading || questions.isLoading) return <Skeleton className="h-80" />;
  if (quizzes.isError) return <ErrorState error={quizzes.error} onRetry={() => quizzes.refetch()} />;
  if (questions.isError) return <ErrorState error={questions.error} onRetry={() => questions.refetch()} />;
  if (!quiz) return <NotFoundPage what="Квіз" />;
  if (list.length === 0) {
    return (
      <EmptyState
        title="У квізі ще немає питань"
        action={
          <Button asChild>
            <Link to={`/quizzes/${quiz.id}/edit`}>
              <Pencil /> Додати питання
            </Link>
          </Button>
        }
      />
    );
  }

  const q = list[index];
  const value = answers[q.id] ?? null;
  const result = results[q.id];
  const eachMode = quiz.reveal_mode === "each";
  const answeredCount = list.filter((x) => isAnswered(x, answers[x.id] ?? null)).length;

  /* ---------- Фінальний етап ---------- */
  if (finished) {
    const score = revealed ? list.filter((x) => results[x.id]?.correct).length : 0;
    const pct = revealed ? Math.round((score / list.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 p-6 text-center sm:p-8">
            <Trophy className="mx-auto size-10 text-warning" />
            <h1 className="mt-3 text-2xl font-bold">{quiz.title}</h1>
            {revealed ? (
              <>
                <p className="mt-3 text-5xl font-bold tabular-nums">
                  {score} / {list.length}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {pct}% · {score} {plural(score, ["правильна відповідь", "правильні відповіді", "правильних відповідей"])}
                </p>
              </>
            ) : (
              <p className="mt-3 text-muted-foreground">
                Відповіді записано ({answeredCount} з {list.length}). Результати приховані, доки вчитель їх не відкриє.
              </p>
            )}
          </div>
          <CardContent className="flex flex-wrap justify-center gap-2 pt-5">
            {!revealed && (
              <Button variant="gradient" size="lg" onClick={() => gradeAll.mutate()} loading={gradeAll.isPending}>
                <Eye /> Показати результати
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={restart}>
              <RotateCcw /> Почати знову
            </Button>
          </CardContent>
        </Card>
        {revealed && (
          <div className="space-y-3">
            {list.map((x, i) => (
              <Card key={x.id} className="p-4">
                <div className="mb-2 flex gap-2">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-md text-sm font-bold text-white",
                      results[x.id]?.correct ? "bg-success" : "bg-destructive",
                    )}
                  >
                    {i + 1}
                  </span>
                  <TextWithMath text={x.prompt} className="font-medium" />
                </div>
                {results[x.id] && <ResultNote result={results[x.id]} showExplanation={quiz.show_explanations} />}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Питання ---------- */
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Питання <b className="text-foreground">{index + 1}</b> з {list.length}
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link to={`/quizzes/${quiz.id}/edit`}>
            <Pencil /> Редагувати
          </Link>
        </Button>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-elevated" role="progressbar" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={index + 1}>
        <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all" style={{ width: `${((index + 1) / list.length) * 100}%` }} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <QuestionView
            question={q}
            value={value}
            onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}
            locked={!!result}
            result={eachMode ? result : null}
            showExplanation={quiz.show_explanations}
          />
        </CardContent>
      </Card>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          <ArrowLeft /> Назад
        </Button>
        <div className="flex flex-wrap gap-2">
          {eachMode && !result && (
            <Button variant="secondary" onClick={() => gradeOne.mutate(q.id)} disabled={!isAnswered(q, value)} loading={gradeOne.isPending}>
              <CheckCheck /> Перевірити
            </Button>
          )}
          {index < list.length - 1 ? (
            <Button onClick={() => setIndex((i) => i + 1)}>
              Далі <ArrowRight />
            </Button>
          ) : (
            <Button variant="gradient" onClick={() => setFinished(true)}>
              Завершити <CheckCheck />
            </Button>
          )}
        </div>
      </div>
      {!isAnswered(q, value) && <p className="mt-3 text-center text-xs text-muted-foreground">Можна пропустити питання й повернутися до нього пізніше.</p>}
    </div>
  );
}
