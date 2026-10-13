import {
  Presentation,
  CirclePlay,
  FileText,
  CircleHelp,
  Gamepad2,
  Atom,
  FlaskConical,
  ClipboardCheck,
  ClipboardList,
  Sigma,
  NotebookPen,
  Link2,
  Shapes,
  Magnet,
  Zap,
  Globe,
  Sun,
  Sparkles,
  HeartPulse,
  Cable,
  Layers,
  CircleDot,
  Orbit,
  Cog,
  Gauge,
  Waves,
  Repeat,
  BookOpen,
  Lightbulb,
  Compass,
  type LucideIcon,
} from "lucide-react";
import type { MaterialType } from "./types";

export interface MaterialTypeInfo {
  value: MaterialType;
  label: string;
  icon: LucideIcon;
  /** Зовнішній ресурс — URL обов'язковий. */
  requiresUrl: boolean;
  /** Показувати поле письмового вмісту за замовчуванням. */
  written: boolean;
}

export const MATERIAL_TYPES: MaterialTypeInfo[] = [
  { value: "presentation", label: "Презентація", icon: Presentation, requiresUrl: true, written: false },
  { value: "video", label: "Відео", icon: CirclePlay, requiresUrl: true, written: false },
  { value: "document", label: "PDF / Документ", icon: FileText, requiresUrl: true, written: false },
  { value: "quiz", label: "Квіз", icon: CircleHelp, requiresUrl: true, written: false },
  { value: "game", label: "Навчальна гра", icon: Gamepad2, requiresUrl: true, written: false },
  { value: "simulation", label: "Симуляція", icon: Atom, requiresUrl: true, written: false },
  { value: "experiment", label: "Експеримент / дослід", icon: FlaskConical, requiresUrl: false, written: true },
  { value: "test", label: "Тест", icon: ClipboardList, requiresUrl: false, written: true },
  { value: "control_work", label: "Контрольна робота", icon: ClipboardCheck, requiresUrl: false, written: true },
  { value: "formula", label: "Формула", icon: Sigma, requiresUrl: false, written: true },
  { value: "summary", label: "Конспект", icon: NotebookPen, requiresUrl: false, written: true },
  { value: "link", label: "Зовнішнє посилання", icon: Link2, requiresUrl: true, written: false },
  { value: "other", label: "Інше", icon: Shapes, requiresUrl: false, written: true },
];

export const MATERIAL_TYPE_MAP = Object.fromEntries(MATERIAL_TYPES.map((t) => [t.value, t])) as Record<
  MaterialType,
  MaterialTypeInfo
>;

/** Групи типів для розділів навігації та вкладок теми. */
export const TYPE_GROUPS = {
  presentations: ["presentation"] as MaterialType[],
  videos: ["video"] as MaterialType[],
  quizzes: ["quiz", "game"] as MaterialType[],
  experiments: ["simulation", "experiment"] as MaterialType[],
  tests: ["test", "control_work"] as MaterialType[],
  theory: ["summary", "document", "formula", "link", "other"] as MaterialType[],
};

export const SUGGESTED_TAGS = [
  "Повторення",
  "Для контрольної",
  "Домашнє завдання",
  "Інтерактив",
  "Цікаве відео",
  "Демонстрація",
  "Практика",
  "Важливо",
];

export const VISIBILITY_LABELS = {
  teacher: "Для вчителя",
  students: "Можна демонструвати учням",
} as const;

export const TOPIC_ICONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "magnet", label: "Магніт", icon: Magnet },
  { value: "zap", label: "Блискавка", icon: Zap },
  { value: "globe", label: "Земля", icon: Globe },
  { value: "sun", label: "Сонце", icon: Sun },
  { value: "sparkles", label: "Полярне сяйво", icon: Sparkles },
  { value: "heart-pulse", label: "Живі організми", icon: HeartPulse },
  { value: "cable", label: "Провідник", icon: Cable },
  { value: "layers", label: "Речовини", icon: Layers },
  { value: "circle-dot", label: "Котушка", icon: CircleDot },
  { value: "orbit", label: "Левітація", icon: Orbit },
  { value: "cog", label: "Двигун", icon: Cog },
  { value: "gauge", label: "Прилади", icon: Gauge },
  { value: "waves", label: "Хвилі", icon: Waves },
  { value: "repeat", label: "Повторення", icon: Repeat },
  { value: "atom", label: "Атом", icon: Atom },
  { value: "flask", label: "Дослід", icon: FlaskConical },
  { value: "book-open", label: "Книга", icon: BookOpen },
  { value: "lightbulb", label: "Ідея", icon: Lightbulb },
  { value: "compass", label: "Компас", icon: Compass },
];

export const TOPIC_ICON_MAP = Object.fromEntries(TOPIC_ICONS.map((i) => [i.value, i.icon])) as Record<
  string,
  LucideIcon
>;

export const QUESTION_TYPE_LABELS = {
  multiple_choice: "Вибір варіанта",
  true_false: "Правда / Неправда",
  short_answer: "Коротка відповідь",
} as const;
