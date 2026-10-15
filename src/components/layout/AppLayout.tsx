import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useMatch } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Menu,
  Search,
  Plus,
  Sun,
  Moon,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Settings,
  UserRound,
  BookPlus,
  FilePlus2,
  CirclePlay,
  Presentation,
  CircleHelp,
  Sigma,
  NotebookPen,
  Link2,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import { Brand } from "./Brand";
import { NAV_ITEMS } from "./nav";
import { SearchDialog } from "./SearchDialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { EmptyState, ErrorState } from "@/components/common/States";
import { isNoAccessError } from "@/lib/errors";
import { useAuth } from "@/context/auth";
import { useTheme } from "@/context/theme";
import { useDialogs } from "@/context/dialogs";
import { usePageMetaValue } from "@/context/page-meta";
import { initializeWorkspace } from "@/lib/api";
import { cn, readLocal, writeLocal } from "@/lib/utils";

function SidebarNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Головне меню" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground",
              isActive && "bg-gradient-to-r from-primary/20 to-secondary/10 text-foreground",
              collapsed && "justify-center px-0",
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={cn("size-[18px] shrink-0", isActive && "text-primary")} aria-hidden />
              {!collapsed && <span className="truncate">{label}</span>}
              {collapsed && <span className="sr-only">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function QuickAdd() {
  const dialogs = useDialogs();
  const topicMatch = useMatch("/topics/:topicId/*");
  const topicId = topicMatch?.params.topicId ?? null;
  const sectionMatch = useMatch("/sections/:sectionId");
  const sectionId = sectionMatch?.params.sectionId;

  const items = [
    { label: "Додати тему", icon: BookPlus, run: () => dialogs.openTopic(undefined, sectionId) },
    { label: "Додати матеріал", icon: FilePlus2, run: () => dialogs.openMaterial(undefined, { topicId }) },
    { label: "Додати відео", icon: CirclePlay, run: () => dialogs.openMaterial(undefined, { type: "video", topicId }) },
    {
      label: "Додати презентацію",
      icon: Presentation,
      run: () => dialogs.openMaterial(undefined, { type: "presentation", topicId }),
    },
    { label: "Додати квіз", icon: CircleHelp, run: () => dialogs.openQuizKind(topicId) },
    { label: "Додати формулу", icon: Sigma, run: () => dialogs.openFormula(undefined, topicId) },
    { label: "Додати нотатку", icon: NotebookPen, run: () => dialogs.openNote(undefined, topicId ?? undefined) },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="gradient" size="sm" className="h-9" aria-label="Швидко додати">
          <Plus /> <span className="hidden sm:inline">Додати</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuLabel>Швидко додати{topicId ? " до цієї теми" : ""}</DropdownMenuLabel>
        {items.map(({ label, icon: Icon, run }) => (
          <DropdownMenuItem key={label} onSelect={run}>
            <Icon /> {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => dialogs.openQuickSave()}>
          <Link2 /> Швидко зберегти посилання
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { user, signOut } = useAuth();
  const initial = (user?.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white"
          aria-label="Меню профілю"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="flex items-center gap-2 px-2.5 py-2">
          <UserRound className="size-4 text-muted-foreground" />
          <span className="truncate text-sm">{user?.email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings /> Налаштування
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => signOut()}>
          <LogOut /> Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Breadcrumbs() {
  const { title, crumbs } = usePageMetaValue();
  return (
    <div className="min-w-0">
      {crumbs.length > 0 && (
        <nav aria-label="Навігаційний ланцюжок" className="hidden md:block">
          <ol className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <li key={i} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden />}
                {c.to ? (
                  <Link to={c.to} className="truncate hover:text-foreground hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="truncate" aria-current="page">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <p className="truncate text-sm font-semibold md:text-base">{title}</p>
    </div>
  );
}

/** Акаунт є в проєкті Supabase (спільному з іншими застосунками), але не має доступу до цього кабінету. */
function NoAccess() {
  const { user, signOut } = useAuth();
  return (
    <EmptyState
      icon={Lock}
      title="Немає доступу до Physics Teacher Hub"
      description={
        <>
          Акаунт <b>{user?.email}</b> не входить до списку дозволених. Якщо це ваш кабінет — додайте цей email у таблицю{" "}
          <code>pth_allowed_emails</code> (SQL Editor у Supabase) або увійдіть з іншого акаунта.
        </>
      }
      action={
        <Button onClick={() => signOut()}>
          <LogOut /> Вийти
        </Button>
      }
    />
  );
}

/** Ідемпотентне початкове наповнення: SQL-функція створює дані лише один раз на акаунт. */
function useWorkspaceInit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["workspace-init", user?.id],
    enabled: !!user,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (count, err) => !isNoAccessError(err) && count < 1,
    queryFn: async () => {
      const created = await initializeWorkspace();
      // Оновлюємо всі списки, крім самого запиту ініціалізації (інакше він чекав би сам на себе).
      if (created) await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "workspace-init" });
      return created;
    },
  });
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => readLocal("pth-sidebar-collapsed", false));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const init = useWorkspaceInit();

  useEffect(() => writeLocal("pth-sidebar-collapsed", collapsed), [collapsed]);
  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-white"
      >
        Перейти до вмісту
      </a>

      {/* Десктопна бокова панель */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface/80 backdrop-blur transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-2")}>
          <Link to="/" aria-label="Physics Teacher Hub — на головну">
            <Brand collapsed={collapsed} />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-elevated hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Розгорнути меню" : "Згорнути меню"}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed && "Згорнути меню"}
          </button>
        </div>
      </aside>

      {/* Мобільне меню */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-xs flex-col border-r border-border bg-surface shadow-2xl lg:hidden">
            <DialogPrimitive.Title className="sr-only">Меню</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Навігація застосунку</DialogPrimitive.Description>
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Brand />
              <DialogPrimitive.Close className="rounded-md p-2 hover:bg-elevated" aria-label="Закрити меню">
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur sm:gap-3 sm:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Відкрити меню">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-muted-foreground transition hover:border-primary/60 sm:w-56 lg:w-72"
            aria-label="Пошук"
          >
            <Search className="size-4" />
            <span className="hidden flex-1 text-left sm:inline">Пошук…</span>
            <span className="hidden lg:inline">
              <Kbd>Ctrl K</Kbd>
            </span>
          </button>
          <QuickAdd />
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
            title={theme === "dark" ? "Світла тема" : "Темна тема"}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <ProfileMenu />
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-3 py-5 sm:px-6 sm:py-7">
          {init.isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p>Готуємо ваш кабінет…</p>
            </div>
          ) : init.isError && isNoAccessError(init.error) ? (
            <NoAccess />
          ) : init.isError ? (
            <ErrorState error={init.error} onRetry={() => init.refetch()} />
          ) : (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          )}
        </main>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
