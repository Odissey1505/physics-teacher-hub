import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { ClassRow, Formula, Material, MaterialType, Note, Section, Topic } from "@/lib/types";
import { MaterialDialog } from "@/components/dialogs/MaterialDialog";
import { TopicDialog } from "@/components/dialogs/TopicDialog";
import { SectionDialog, ClassDialog } from "@/components/dialogs/StructureDialogs";
import { FormulaDialog } from "@/components/dialogs/FormulaDialog";
import { NoteDialog } from "@/components/dialogs/NoteDialog";
import { QuickSaveDialog } from "@/components/dialogs/QuickSaveDialog";
import { QuizCreateDialog, QuizKindDialog } from "@/components/dialogs/QuizDialogs";
import { MoveMaterialDialog } from "@/components/dialogs/MoveMaterialDialog";

export interface MaterialDefaults {
  type?: MaterialType;
  topicId?: string | null;
  url?: string;
  title?: string;
}

type DialogState =
  | { kind: "material"; material?: Material; defaults?: MaterialDefaults }
  | { kind: "topic"; topic?: Topic; sectionId?: string }
  | { kind: "section"; section?: Section; classId?: string }
  | { kind: "class"; cls?: ClassRow }
  | { kind: "formula"; formula?: Formula; topicId?: string | null }
  | { kind: "note"; note?: Note; topicId?: string }
  | { kind: "quickSave" }
  | { kind: "quizKind"; topicId?: string | null }
  | { kind: "quizCreate"; topicId?: string | null }
  | { kind: "move"; materials: Material[] };

interface DialogsApi {
  openMaterial: (material?: Material, defaults?: MaterialDefaults) => void;
  openTopic: (topic?: Topic, sectionId?: string) => void;
  openSection: (section?: Section, classId?: string) => void;
  openClass: (cls?: ClassRow) => void;
  openFormula: (formula?: Formula, topicId?: string | null) => void;
  openNote: (note?: Note, topicId?: string) => void;
  openQuickSave: () => void;
  openQuizKind: (topicId?: string | null) => void;
  openQuizCreate: (topicId?: string | null) => void;
  openMove: (materials: Material[]) => void;
}

const DialogsContext = createContext<DialogsApi | null>(null);

/** Єдине місце, де відкриваються всі форми створення/редагування (Quick Add, кнопки на сторінках). */
export function DialogsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const close = useCallback(() => setState(null), []);

  const api: DialogsApi = {
    openMaterial: (material, defaults) => setState({ kind: "material", material, defaults }),
    openTopic: (topic, sectionId) => setState({ kind: "topic", topic, sectionId }),
    openSection: (section, classId) => setState({ kind: "section", section, classId }),
    openClass: (cls) => setState({ kind: "class", cls }),
    openFormula: (formula, topicId) => setState({ kind: "formula", formula, topicId }),
    openNote: (note, topicId) => setState({ kind: "note", note, topicId }),
    openQuickSave: () => setState({ kind: "quickSave" }),
    openQuizKind: (topicId) => setState({ kind: "quizKind", topicId }),
    openQuizCreate: (topicId) => setState({ kind: "quizCreate", topicId }),
    openMove: (materials) => setState({ kind: "move", materials }),
  };

  return (
    <DialogsContext.Provider value={api}>
      {children}
      {state?.kind === "material" && (
        <MaterialDialog material={state.material} defaults={state.defaults} onClose={close} />
      )}
      {state?.kind === "topic" && <TopicDialog topic={state.topic} sectionId={state.sectionId} onClose={close} />}
      {state?.kind === "section" && (
        <SectionDialog section={state.section} classId={state.classId} onClose={close} />
      )}
      {state?.kind === "class" && <ClassDialog cls={state.cls} onClose={close} />}
      {state?.kind === "formula" && (
        <FormulaDialog formula={state.formula} topicId={state.topicId} onClose={close} />
      )}
      {state?.kind === "note" && <NoteDialog note={state.note} topicId={state.topicId} onClose={close} />}
      {state?.kind === "quickSave" && <QuickSaveDialog onClose={close} />}
      {state?.kind === "quizKind" && (
        <QuizKindDialog
          onClose={close}
          onExternal={() => setState({ kind: "material", defaults: { type: "quiz", topicId: state.topicId } })}
          onInternal={() => setState({ kind: "quizCreate", topicId: state.topicId })}
        />
      )}
      {state?.kind === "quizCreate" && <QuizCreateDialog topicId={state.topicId} onClose={close} />}
      {state?.kind === "move" && <MoveMaterialDialog materials={state.materials} onClose={close} />}
    </DialogsContext.Provider>
  );
}

export function useDialogs() {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs must be used inside DialogsProvider");
  return ctx;
}
