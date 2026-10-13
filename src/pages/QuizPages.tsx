import { useCallback } from "react";
import { Gamepad2, ClipboardCheck, Plus, ListChecks, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/States";
import { MaterialList } from "@/components/materials/MaterialList";
import { InternalQuizList } from "@/components/quizzes/InternalQuizList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/menu";
import { usePageMeta } from "@/context/page-meta";
import { useDialogs } from "@/context/dialogs";
import { TYPE_GROUPS } from "@/lib/constants";
import { useMaterials, useQuizzes } from "@/lib/queries";
import type { Material } from "@/lib/types";

export function QuizzesPage() {
  usePageMeta("Квізи та ігри", [{ label: "Головна", to: "/" }, { label: "Квізи та ігри" }]);
  const dialogs = useDialogs();
  const materials = useMaterials();
  const quizzes = useQuizzes();
  const filter = useCallback((m: Material) => TYPE_GROUPS.quizzes.includes(m.type), []);
  const externalCount = (materials.data ?? []).filter(filter).length;

  return (
    <>
      <PageHeader
        title="Квізи та ігри"
        description="Зовнішні квізи й ігри (Kahoot, Wordwall, Quizizz / Wayground, LearningApps) та ваші вбудовані квізи."
        icon={Gamepad2}
        actions={
          <>
            <Button variant="outline" onClick={() => dialogs.openMaterial(undefined, { type: "quiz" })}>
              <Link2 /> Додати посилання
            </Button>
            <Button onClick={() => dialogs.openQuizCreate()}>
              <Plus /> Створити квіз
            </Button>
          </>
        }
      />
      <Tabs defaultValue="external">
        <TabsList className="w-auto">
          <TabsTrigger value="external">
            <Gamepad2 /> Зовнішні ({externalCount})
          </TabsTrigger>
          <TabsTrigger value="internal">
            <ListChecks /> Вбудовані ({quizzes.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="external">
          <MaterialList
            filter={filter}
            types={TYPE_GROUPS.quizzes}
            storageKey="quizzes"
            emptyIcon={Gamepad2}
            emptyTitle="Зовнішніх квізів та ігор поки немає"
            emptyDescription="Збережіть посилання на Kahoot, Wordwall чи LearningApps — сервіс визначиться автоматично."
            emptyAction={
              <Button onClick={() => dialogs.openMaterial(undefined, { type: "quiz" })}>
                <Plus /> Додати квіз або гру
              </Button>
            }
          />
        </TabsContent>
        <TabsContent value="internal">
          <InternalQuizList />
        </TabsContent>
      </Tabs>
    </>
  );
}

export function TestsPage() {
  usePageMeta("Тести та контрольні", [{ label: "Головна", to: "/" }, { label: "Тести та контрольні" }]);
  const dialogs = useDialogs();
  const filter = useCallback((m: Material) => TYPE_GROUPS.tests.includes(m.type), []);
  return (
    <>
      <PageHeader
        title="Тести та контрольні"
        description="Тести, контрольні роботи (посилання або власний текст) і вбудовані квізи з автоперевіркою."
        icon={ClipboardCheck}
        actions={
          <>
            <Button variant="outline" onClick={() => dialogs.openMaterial(undefined, { type: "control_work" })}>
              <Plus /> Контрольна
            </Button>
            <Button onClick={() => dialogs.openMaterial(undefined, { type: "test" })}>
              <Plus /> Тест
            </Button>
          </>
        }
      />
      <MaterialList
        filter={filter}
        types={TYPE_GROUPS.tests}
        storageKey="tests"
        emptyIcon={ClipboardCheck}
        emptyTitle="Тестів і контрольних поки немає"
        emptyDescription="Додайте посилання на Google Forms або напишіть завдання прямо в застосунку."
      />
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ListChecks className="size-5 text-primary" /> Вбудовані квізи
          </h2>
          <Button size="sm" variant="outline" onClick={() => dialogs.openQuizCreate()}>
            <Plus /> Створити квіз
          </Button>
        </div>
        <InternalQuizList />
      </section>
    </>
  );
}
