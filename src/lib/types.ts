export type MaterialType =
  | "presentation"
  | "video"
  | "document"
  | "quiz"
  | "game"
  | "simulation"
  | "experiment"
  | "test"
  | "control_work"
  | "formula"
  | "summary"
  | "link"
  | "other";

export type Visibility = "teacher" | "students";

interface Row {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  initialized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassRow extends Row {
  title: string;
  sort_order: number;
}

export interface Section extends Row {
  class_id: string;
  title: string;
  description: string;
  sort_order: number;
  is_current: boolean;
}

export interface Topic extends Row {
  section_id: string;
  title: string;
  description: string;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface Definition {
  term: string;
  definition: string;
}

export interface TopicContent {
  topic_id: string;
  owner_id: string;
  summary: string;
  key_concepts: string[];
  definitions: Definition[];
  objectives: string[];
  theory_html: string;
  created_at: string;
  updated_at: string;
}

export interface Material extends Row {
  topic_id: string | null;
  type: MaterialType;
  title: string;
  url: string | null;
  description: string;
  provider: string | null;
  thumbnail_url: string | null;
  content_html: string;
  tags: string[];
  visibility: Visibility;
  is_favorite: boolean;
  sort_order: number;
}

export interface Quantity {
  symbol: string;
  name: string;
  unit: string;
}

export interface Formula extends Row {
  topic_id: string | null;
  name: string;
  latex: string;
  explanation: string;
  quantities: Quantity[];
  units: string;
  example: string;
  calculator_key: string | null;
  sort_order: number;
}

export interface Note extends Row {
  topic_id: string;
  title: string;
  body_html: string;
}

export interface Quiz extends Row {
  topic_id: string | null;
  title: string;
  description: string;
  reveal_mode: "each" | "end";
  show_explanations: boolean;
}

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

/** Дані питання без правильної відповіді — безпечні для показу учням. */
export interface QuizQuestion extends Row {
  quiz_id: string;
  qtype: QuestionType;
  prompt: string;
  options: string[];
  image_url: string | null;
  sort_order: number;
}

export interface QuizAnswerKey {
  question_id: string;
  owner_id: string;
  correct_option: number | null;
  correct_bool: boolean | null;
  accepted_answers: string[];
  case_sensitive: boolean;
  ignore_extra_spaces: boolean;
  explanation: string;
  created_at: string;
  updated_at: string;
}

export interface GradeResult {
  correct: boolean;
  correct_answer: string | null;
  explanation: string;
}
