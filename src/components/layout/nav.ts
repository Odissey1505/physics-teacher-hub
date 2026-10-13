import {
  LayoutDashboard,
  BookOpenText,
  Library,
  Presentation,
  CirclePlay,
  Gamepad2,
  FlaskConical,
  Sigma,
  ClipboardCheck,
  Star,
  Inbox,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Головна", icon: LayoutDashboard, end: true },
  { to: "/lessons", label: "Мої уроки", icon: BookOpenText },
  { to: "/library", label: "Бібліотека матеріалів", icon: Library },
  { to: "/presentations", label: "Презентації", icon: Presentation },
  { to: "/videos", label: "Відео", icon: CirclePlay },
  { to: "/quizzes", label: "Квізи та ігри", icon: Gamepad2 },
  { to: "/experiments", label: "Експерименти", icon: FlaskConical },
  { to: "/formulas", label: "Довідник формул", icon: Sigma },
  { to: "/tests", label: "Тести та контрольні", icon: ClipboardCheck },
  { to: "/favorites", label: "Обране", icon: Star },
  { to: "/inbox", label: "Скарбничка матеріалів", icon: Inbox },
  { to: "/settings", label: "Налаштування", icon: Settings },
];
