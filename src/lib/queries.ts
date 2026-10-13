import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { ClassRow, Section, Topic } from "./types";

export const qk = {
  classes: ["classes"] as const,
  sections: ["sections"] as const,
  topics: ["topics"] as const,
  materials: ["materials"] as const,
  formulas: ["formulas"] as const,
  notes: ["notes"] as const,
  quizzes: ["quizzes"] as const,
  profile: ["profile"] as const,
  topicContent: (id: string) => ["topic_content", id] as const,
  questions: (quizId: string) => ["quiz_questions", quizId] as const,
  answerKeys: (quizId: string) => ["quiz_answer_keys", quizId] as const,
};

export const useClasses = () => useQuery({ queryKey: qk.classes, queryFn: api.fetchClasses });
export const useSections = () => useQuery({ queryKey: qk.sections, queryFn: api.fetchSections });
export const useTopics = () => useQuery({ queryKey: qk.topics, queryFn: api.fetchTopics });
export const useMaterials = () => useQuery({ queryKey: qk.materials, queryFn: api.fetchMaterials });
export const useFormulas = () => useQuery({ queryKey: qk.formulas, queryFn: api.fetchFormulas });
export const useNotes = () => useQuery({ queryKey: qk.notes, queryFn: api.fetchNotes });
export const useQuizzes = () => useQuery({ queryKey: qk.quizzes, queryFn: api.fetchQuizzes });
export const useProfile = () => useQuery({ queryKey: qk.profile, queryFn: api.fetchProfile });

export const useTopicContent = (topicId: string | undefined) =>
  useQuery({
    queryKey: qk.topicContent(topicId ?? ""),
    queryFn: () => api.fetchTopicContent(topicId!),
    enabled: !!topicId,
  });

export const useQuizQuestions = (quizId: string | undefined) =>
  useQuery({
    queryKey: qk.questions(quizId ?? ""),
    queryFn: () => api.fetchQuizQuestions(quizId!),
    enabled: !!quizId,
  });

/** Інвалідовує всі кеші, пов'язані з таблицею (після створення/зміни/видалення). */
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: (readonly string[])[]) =>
    Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })));
}

export interface TopicPath {
  topic: Topic;
  section?: Section;
  cls?: ClassRow;
  /** Порядковий номер теми в розділі (з 1). */
  number: number;
}

/** Довідник структури курсу: класи → розділи → теми з номерами та шляхами. */
export function useCourse() {
  const classes = useClasses();
  const sections = useSections();
  const topics = useTopics();

  const value = useMemo(() => {
    const cls = classes.data ?? [];
    const secs = sections.data ?? [];
    const tops = topics.data ?? [];
    const classById = new Map(cls.map((c) => [c.id, c]));
    const sectionById = new Map(secs.map((s) => [s.id, s]));
    const topicsBySection = new Map<string, Topic[]>();
    for (const t of tops) {
      const arr = topicsBySection.get(t.section_id) ?? [];
      arr.push(t);
      topicsBySection.set(t.section_id, arr);
    }
    for (const arr of topicsBySection.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    const sectionsByClass = new Map<string, Section[]>();
    for (const s of secs) {
      const arr = sectionsByClass.get(s.class_id) ?? [];
      arr.push(s);
      sectionsByClass.set(s.class_id, arr);
    }
    for (const arr of sectionsByClass.values()) arr.sort((a, b) => a.sort_order - b.sort_order);
    const pathById = new Map<string, TopicPath>();
    for (const [secId, arr] of topicsBySection) {
      const section = sectionById.get(secId);
      const c = section ? classById.get(section.class_id) : undefined;
      arr.forEach((topic, i) => pathById.set(topic.id, { topic, section, cls: c, number: i + 1 }));
    }
    /** Теми у порядку курсу: клас → розділ → тема. */
    const orderedTopics: TopicPath[] = [];
    for (const c of [...cls].sort((a, b) => a.sort_order - b.sort_order)) {
      for (const s of sectionsByClass.get(c.id) ?? []) {
        for (const t of topicsBySection.get(s.id) ?? []) orderedTopics.push(pathById.get(t.id)!);
      }
    }
    const currentSection = secs.find((s) => s.is_current) ?? null;
    return {
      classes: [...cls].sort((a, b) => a.sort_order - b.sort_order),
      sections: secs,
      topics: tops,
      classById,
      sectionById,
      topicsBySection,
      sectionsByClass,
      pathById,
      orderedTopics,
      currentSection,
      topicLabel: (id: string | null | undefined) => {
        if (!id) return "Скарбничка";
        const p = pathById.get(id);
        return p ? `${p.number}. ${p.topic.title}` : "Невідома тема";
      },
    };
  }, [classes.data, sections.data, topics.data]);

  return {
    ...value,
    isLoading: classes.isLoading || sections.isLoading || topics.isLoading,
    error: classes.error ?? sections.error ?? topics.error,
    refetch: () => Promise.all([classes.refetch(), sections.refetch(), topics.refetch()]),
  };
}
