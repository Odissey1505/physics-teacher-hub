import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Базовий шлях налаштовується через VITE_BASE_PATH.
// За замовчуванням "./" — відносні шляхи працюють і в корені домену,
// і в підпапці репозиторію (наприклад, на GitHub Pages у майбутньому).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE_PATH || "./",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    server: { port: 5173 },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            editor: [
              "@tiptap/react",
              "@tiptap/starter-kit",
              "@tiptap/extension-table",
              "@tiptap/extension-link",
              "@tiptap/extension-image",
            ],
            katex: ["katex"],
          },
        },
      },
    },
  };
});
