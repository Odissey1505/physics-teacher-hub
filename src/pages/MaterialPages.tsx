import { useCallback } from "react";
import { Library, Presentation, CirclePlay, FlaskConical, Star, Inbox, Plus, Link2 } from "lucide-react";
import { PageHeader } from "@/components/common/States";
import { MaterialList } from "@/components/materials/MaterialList";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/context/page-meta";
import { useDialogs } from "@/context/dialogs";
import { TYPE_GROUPS } from "@/lib/constants";
import type { Material, MaterialType } from "@/lib/types";

function TypedPage({
  title,
  description,
  icon,
  types,
  storageKey,
  addType,
  addLabel,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  icon: typeof Library;
  types: MaterialType[];
  storageKey: string;
  addType: MaterialType;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  usePageMeta(title, [{ label: "Головна", to: "/" }, { label: title }]);
  const dialogs = useDialogs();
  const filter = useCallback((m: Material) => types.includes(m.type), [types]);
  const add = (
    <Button onClick={() => dialogs.openMaterial(undefined, { type: addType })}>
      <Plus /> {addLabel}
    </Button>
  );
  return (
    <>
      <PageHeader title={title} description={description} icon={icon} actions={add} />
      <MaterialList
        filter={filter}
        types={types}
        storageKey={storageKey}
        emptyIcon={icon}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={add}
      />
    </>
  );
}

export function LibraryPage() {
  usePageMeta("Бібліотека матеріалів", [{ label: "Головна", to: "/" }, { label: "Бібліотека матеріалів" }]);
  const dialogs = useDialogs();
  return (
    <>
      <PageHeader
        title="Бібліотека матеріалів"
        description="Усі збережені ресурси з усіх тем і Скарбнички."
        icon={Library}
        actions={
          <>
            <Button variant="outline" onClick={() => dialogs.openQuickSave()}>
              <Link2 /> Швидко зберегти
            </Button>
            <Button onClick={() => dialogs.openMaterial()}>
              <Plus /> Додати матеріал
            </Button>
          </>
        }
      />
      <MaterialList
        storageKey="library"
        emptyTitle="Бібліотека поки порожня"
        emptyDescription="Додайте перший ресурс: відео, презентацію, симуляцію чи посилання."
        emptyAction={
          <Button onClick={() => dialogs.openMaterial()}>
            <Plus /> Додати матеріал
          </Button>
        }
      />
    </>
  );
}

export function PresentationsPage() {
  return (
    <TypedPage
      title="Презентації"
      description="Google Slides, PowerPoint онлайн та інші презентації до уроків."
      icon={Presentation}
      types={TYPE_GROUPS.presentations}
      storageKey="presentations"
      addType="presentation"
      addLabel="Додати презентацію"
      emptyTitle="Презентацій поки немає"
      emptyDescription="Збережіть посилання на Google Slides — і переглядайте прямо тут."
    />
  );
}

export function VideosPage() {
  return (
    <TypedPage
      title="Відео"
      description="Навчальні відео, демонстрації дослідів, пояснення."
      icon={CirclePlay}
      types={TYPE_GROUPS.videos}
      storageKey="videos"
      addType="video"
      addLabel="Додати відео"
      emptyTitle="Відео поки немає"
      emptyDescription="Вставте посилання з YouTube — відео відтворюватиметься всередині застосунку."
    />
  );
}

export function ExperimentsPage() {
  return (
    <TypedPage
      title="Експерименти"
      description="Віртуальні симуляції (PhET тощо) та описи реальних дослідів."
      icon={FlaskConical}
      types={TYPE_GROUPS.experiments}
      storageKey="experiments"
      addType="simulation"
      addLabel="Додати симуляцію"
      emptyTitle="Експериментів поки немає"
      emptyDescription="Додайте симуляцію PhET або опишіть хід досліду (тип «Експеримент / дослід»)."
    />
  );
}

export function FavoritesPage() {
  usePageMeta("Обране", [{ label: "Головна", to: "/" }, { label: "Обране" }]);
  const filter = useCallback((m: Material) => m.is_favorite, []);
  return (
    <>
      <PageHeader title="Обране" description="Матеріали, позначені зірочкою." icon={Star} />
      <MaterialList
        filter={filter}
        storageKey="favorites"
        emptyIcon={Star}
        emptyTitle="В обраному поки порожньо"
        emptyDescription="Натисніть ☆ на картці матеріалу, щоб він з'явився тут."
      />
    </>
  );
}

export function InboxPage() {
  usePageMeta("Скарбничка матеріалів", [{ label: "Головна", to: "/" }, { label: "Скарбничка матеріалів" }]);
  const dialogs = useDialogs();
  const filter = useCallback((m: Material) => m.topic_id === null, []);
  const add = (
    <Button variant="gradient" onClick={() => dialogs.openQuickSave()}>
      <Plus /> Швидко зберегти посилання
    </Button>
  );
  return (
    <>
      <PageHeader
        title="Скарбничка матеріалів"
        description="Посилання, збережені «на потім». Перемістіть їх у потрібну тему через меню ⋮ → «Перемістити в тему»."
        icon={Inbox}
        actions={add}
      />
      <MaterialList
        filter={filter}
        storageKey="inbox"
        showTopicFilter={false}
        hideTopicLabel
        emptyIcon={Inbox}
        emptyTitle="Скарбничка порожня"
        emptyDescription="Знайшли цікавий ресурс? Збережіть його сюди за дві секунди, а тему оберете пізніше."
        emptyAction={add}
      />
    </>
  );
}
