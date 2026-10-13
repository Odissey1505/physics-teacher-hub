import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface Crumb {
  label: string;
  to?: string;
}

interface PageMeta {
  title: string;
  crumbs: Crumb[];
}

const PageMetaContext = createContext<{ meta: PageMeta; setMeta: (m: PageMeta) => void } | null>(null);

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<PageMeta>({ title: "", crumbs: [] });
  return <PageMetaContext.Provider value={{ meta, setMeta }}>{children}</PageMetaContext.Provider>;
}

/** Сторінка повідомляє заголовок і «хлібні крихти» для верхньої панелі. */
export function usePageMeta(title: string, crumbs: Crumb[] = []) {
  const ctx = useContext(PageMetaContext);
  const key = JSON.stringify([title, crumbs]);
  useEffect(() => {
    ctx?.setMeta({ title, crumbs });
    document.title = title ? `${title} · Physics Teacher Hub` : "Physics Teacher Hub";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function usePageMetaValue() {
  return useContext(PageMetaContext)?.meta ?? { title: "", crumbs: [] };
}
