import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { ThemeProvider, useTheme } from "@/context/theme";
import { AuthProvider, useAuth } from "@/context/auth";
import { ConfirmProvider } from "@/context/confirm";
import { DialogsProvider } from "@/context/dialogs";
import { PageMetaProvider } from "@/context/page-meta";
import { AppLayout } from "@/components/layout/AppLayout";
import { isSupabaseConfigured, looksLikeSecretKey } from "@/lib/supabase";
import { SetupPage } from "@/pages/SetupPage";
import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from "@/pages/AuthPages";
import { DashboardPage } from "@/pages/DashboardPage";
import { LessonsPage } from "@/pages/LessonsPage";
import { SectionPage } from "@/pages/SectionPage";
import { TopicPage } from "@/pages/TopicPage";
import { MaterialPage } from "@/pages/MaterialPage";
import {
  LibraryPage,
  PresentationsPage,
  VideosPage,
  ExperimentsPage,
  FavoritesPage,
  InboxPage,
} from "@/pages/MaterialPages";
import { QuizzesPage, TestsPage } from "@/pages/QuizPages";
import { FormulasPage } from "@/pages/FormulasPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Важкі сторінки (редактор квізів, презентація) завантажуються за потреби.
const QuizEditorPage = lazy(() => import("@/pages/QuizEditorPage"));
const QuizPlayPage = lazy(() => import("@/pages/QuizPlayPage"));
const PresentationPage = lazy(() => import("@/pages/PresentationPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true, // свіжі дані після повернення у вкладку / з іншого пристрою
      retry: (count, error) => {
        const msg = (error as { message?: string })?.message ?? "";
        if (/JWT|permission|row-level|does not exist/i.test(msg)) return false;
        return count < 2;
      },
    },
  },
});

function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center text-muted-foreground">
      <Loader2 className="size-7 animate-spin" aria-label="Завантаження" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullScreenLoader />}>{children}</Suspense>;
}

function Shell() {
  return (
    <ConfirmProvider>
      <Outlet />
    </ConfirmProvider>
  );
}

const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: "/login", element: <PublicOnly><LoginPage /></PublicOnly> },
      { path: "/register", element: <PublicOnly><RegisterPage /></PublicOnly> },
      { path: "/forgot-password", element: <PublicOnly><ForgotPasswordPage /></PublicOnly> },
      // Сторінка нового пароля працює з тимчасовою сесією відновлення.
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        path: "/present/:topicId",
        element: (
          <RequireAuth>
            <Lazy>
              <PresentationPage />
            </Lazy>
          </RequireAuth>
        ),
      },
      {
        element: (
          <RequireAuth>
            <PageMetaProvider>
              <DialogsProvider>
                <AppLayout />
              </DialogsProvider>
            </PageMetaProvider>
          </RequireAuth>
        ),
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/lessons", element: <LessonsPage /> },
          { path: "/sections/:sectionId", element: <SectionPage /> },
          { path: "/topics/:topicId/:tab?", element: <TopicPage /> },
          { path: "/materials/:materialId", element: <MaterialPage /> },
          { path: "/library", element: <LibraryPage /> },
          { path: "/presentations", element: <PresentationsPage /> },
          { path: "/videos", element: <VideosPage /> },
          { path: "/quizzes", element: <QuizzesPage /> },
          { path: "/quizzes/:quizId/edit", element: <Lazy><QuizEditorPage /></Lazy> },
          { path: "/quizzes/:quizId/play", element: <Lazy><QuizPlayPage /></Lazy> },
          { path: "/experiments", element: <ExperimentsPage /> },
          { path: "/formulas", element: <FormulasPage /> },
          { path: "/tests", element: <TestsPage /> },
          { path: "/favorites", element: <FavoritesPage /> },
          { path: "/inbox", element: <InboxPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors closeButton duration={4000} />;
}

export function App() {
  if (!isSupabaseConfigured || looksLikeSecretKey) {
    return (
      <ThemeProvider>
        <SetupPage secretKey={looksLikeSecretKey} />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <ThemedToaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
