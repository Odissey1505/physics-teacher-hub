import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  BookOpenText,
  Files,
  Gamepad2,
  Presentation,
  Plus,
  BookPlus,
  FilePlus2,
  Sigma,
  ListChecks,
  Inbox,
  ArrowRight,
  Star,
  Clock,
  Library,
  Link2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/misc";
import { EmptyState, ErrorState } from "@/components/common/States";
import { FieldLinesDecor } from "@/components/layout/Brand";
import { MaterialCard } from "@/components/materials/MaterialCard";
import { usePageMeta } from "@/context/page-meta";
import { useDialogs } from "@/context/dialogs";
import { TOPIC_ICON_MAP } from "@/lib/constants";
import { useCourse, useMaterials, useQuizzes } from "@/lib/queries";
import { countLabel } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  to,
  loading,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Files;
  to: string;
  loading: boolean;
  tone: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" aria-hidden />
      </div>
      {loading ? <Skeleton className="mt-4 h-8 w-14" /> : <p className="mt-4 text-3xl font-bold tabular-nums">{value}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  );
}

export function DashboardPage() {
  usePageMeta("Головна");
  const dialogs = useDialogs();
  const course = useCourse();
  const materials = useMaterials();
  const quizzes = useQuizzes();

  const all = materials.data ?? [];
  const loading = course.isLoading || materials.isLoading || quizzes.isLoading;
  const stats = {
    topics: course.topics.length,
    materials: all.length,
    quizzes: all.filter((m) => m.type === "quiz" || m.type === "game").length + (quizzes.data?.length ?? 0),
    presentations: all.filter((m) => m.type === "presentation").length,
  };
  const recent = all.slice(0, 6);
  const favorites = all.filter((m) => m.is_favorite).slice(0, 6);

  const current = course.currentSection;
  const currentClass = current ? course.classById.get(current.class_id) : undefined;
  const currentTopics = current ? course.topicsBySection.get(current.id) ?? [] : [];
  const countByTopic = new Map<string, number>();
  for (const m of all) if (m.topic_id) countByTopic.set(m.topic_id, (countByTopic.get(m.topic_id) ?? 0) + 1);

  const quickActions = [
    { label: "Додати тему", icon: BookPlus, run: () => dialogs.openTopic() },
    { label: "Додати матеріал", icon: FilePlus2, run: () => dialogs.openMaterial() },
    { label: "Додати формулу", icon: Sigma, run: () => dialogs.openFormula() },
    { label: "Створити квіз", icon: ListChecks, run: () => dialogs.openQuizCreate() },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-surface to-secondary/15 p-6 sm:p-8">
        <FieldLinesDecor className="absolute -right-24 -top-6 hidden w-[560px] text-primary/40 md:block" />
        <div className="relative max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Вітаємо у Physics Teacher Hub! ⚡</h1>
          <p className="mt-2 text-base text-muted-foreground sm:text-lg">Усі матеріали для уроків фізики — в одному місці.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="gradient" size="lg" onClick={() => dialogs.openQuickSave()}>
              <Plus /> Швидко зберегти посилання
            </Button>
            {current && (
              <Button asChild variant="outline" size="lg">
                <Link to={`/sections/${current.id}`}>
                  <BookOpenText /> До поточного розділу
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {course.error ? <ErrorState error={course.error} onRetry={() => course.refetch()} /> : null}

      <section aria-label="Статистика" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Кількість тем" value={stats.topics} icon={BookOpenText} to="/lessons" loading={loading} tone="bg-primary/15 text-primary" />
        <StatCard label="Усього матеріалів" value={stats.materials} icon={Files} to="/library" loading={loading} tone="bg-secondary/15 text-secondary" />
        <StatCard label="Квізи та ігри" value={stats.quizzes} icon={Gamepad2} to="/quizzes" loading={loading} tone="bg-success/15 text-success" />
        <StatCard label="Збережені презентації" value={stats.presentations} icon={Presentation} to="/presentations" loading={loading} tone="bg-warning/15 text-warning" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Поточний розділ</p>
              <CardTitle className="mt-1 text-lg">
                {current ? `${currentClass?.title ?? ""} — ${current.title}` : "Поточний розділ не обрано"}
              </CardTitle>
              {current && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {countLabel(currentTopics.length, ["тема", "теми", "тем"])} ·{" "}
                  {countLabel(
                    currentTopics.reduce((s, t) => s + (countByTopic.get(t.id) ?? 0), 0),
                    ["матеріал", "матеріали", "матеріалів"],
                  )}
                </p>
              )}
            </div>
            {current && (
              <Button asChild variant="ghost" size="sm">
                <Link to={`/sections/${current.id}`}>
                  Усі теми <ArrowRight />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : !current ? (
              <EmptyState
                title="Оберіть поточний розділ"
                description="Відкрийте «Мої уроки» та позначте розділ, з яким працюєте зараз."
                action={
                  <Button asChild>
                    <Link to="/lessons">Мої уроки</Link>
                  </Button>
                }
              />
            ) : currentTopics.length === 0 ? (
              <EmptyState title="У розділі поки немає тем" action={<Button onClick={() => dialogs.openTopic(undefined, current.id)}><Plus /> Додати тему</Button>} />
            ) : (
              <ol className="space-y-1.5">
                {currentTopics.slice(0, 7).map((t, i) => {
                  const Icon = t.icon ? TOPIC_ICON_MAP[t.icon] : null;
                  return (
                    <motion.li key={t.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <Link
                        to={`/topics/${t.id}`}
                        className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition hover:border-border hover:bg-elevated/50"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                          {Icon ? <Icon className="size-4" /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{countByTopic.get(t.id) ?? 0}</span>
                        <Play className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </Link>
                    </motion.li>
                  );
                })}
                {currentTopics.length > 7 && (
                  <li className="pt-1 text-center">
                    <Link to={`/sections/${current.id}`} className="text-sm text-primary hover:underline">
                      Ще {countLabel(currentTopics.length - 7, ["тема", "теми", "тем"])} →
                    </Link>
                  </li>
                )}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Швидкі дії</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, run }) => (
              <button
                key={label}
                onClick={run}
                className="flex flex-col items-start gap-2 rounded-xl border border-border p-3 text-left text-sm font-medium transition hover:border-primary/60 hover:bg-primary/5"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                {label}
              </button>
            ))}
            <Link
              to="/inbox"
              className="flex flex-col items-start gap-2 rounded-xl border border-border p-3 text-sm font-medium transition hover:border-primary/60 hover:bg-primary/5"
            >
              <Inbox className="size-5 text-primary" aria-hidden /> Скарбничка
            </Link>
            <Link
              to="/library"
              className="flex flex-col items-start gap-2 rounded-xl border border-border p-3 text-sm font-medium transition hover:border-primary/60 hover:bg-primary/5"
            >
              <Library className="size-5 text-primary" aria-hidden /> Бібліотека
            </Link>
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="size-5 text-primary" /> Нещодавно додані
          </h2>
          {all.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/library">
                Бібліотека <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
        {materials.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : materials.isError ? (
          <ErrorState error={materials.error} onRetry={() => materials.refetch()} />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Files}
            title="Матеріалів поки немає"
            description="Додайте перше відео, презентацію чи посилання — вони з'являться тут."
            action={
              <>
                <Button onClick={() => dialogs.openMaterial()}>
                  <Plus /> Додати матеріал
                </Button>
                <Button variant="outline" onClick={() => dialogs.openQuickSave()}>
                  <Link2 /> Швидко зберегти посилання
                </Button>
              </>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((m) => (
              <MaterialCard key={m.id} m={m} topicLabel={course.topicLabel(m.topic_id)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Star className="size-5 text-amber-400" /> Обране
          </h2>
          {favorites.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/favorites">
                Усе обране <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
        {!materials.isLoading && favorites.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            Позначте ☆ матеріали, які використовуєте найчастіше, — вони будуть під рукою на головній.
          </p>
        ) : (
          <div className="grid gap-2">
            {favorites.map((m) => (
              <MaterialCard key={m.id} m={m} view="list" topicLabel={course.topicLabel(m.topic_id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
