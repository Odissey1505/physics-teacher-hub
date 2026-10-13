import { useEffect, useState, type ReactNode } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Highlighter,
  Link2,
  Unlink,
  ImagePlus,
  Table as TableIcon,
  Rows3,
  Columns3,
  Trash2,
  Sigma,
  Undo2,
  Redo2,
  Check,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { isSafeUrl } from "@/lib/providers";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";

type PromptMode = "link" | "image" | "math" | null;

function ToolButton({
  onClick,
  active,
  label,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-elevated hover:text-foreground disabled:opacity-40 [&_svg]:size-4",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onPrompt }: { editor: Editor; onPrompt: (m: PromptMode) => void }) {
  const inTable = editor.isActive("table");
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-elevated/40 p-1" role="toolbar" aria-label="Форматування">
      <ToolButton label="Абзац" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow />
      </ToolButton>
      <ToolButton label="Заголовок" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </ToolButton>
      <ToolButton label="Підзаголовок" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolButton label="Жирний" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold />
      </ToolButton>
      <ToolButton label="Курсив" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic />
      </ToolButton>
      <ToolButton label="Підкреслений" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolButton>
      <ToolButton label="Виділити маркером" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolButton label="Маркований список" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List />
      </ToolButton>
      <ToolButton label="Нумерований список" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolButton>
      <ToolButton label="Важлива інформація (виділений блок)" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolButton label="Посилання" active={editor.isActive("link")} onClick={() => onPrompt("link")}>
        <Link2 />
      </ToolButton>
      {editor.isActive("link") && (
        <ToolButton label="Прибрати посилання" onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink />
        </ToolButton>
      )}
      <ToolButton label="Зображення за URL" onClick={() => onPrompt("image")}>
        <ImagePlus />
      </ToolButton>
      <ToolButton label="Формула (LaTeX)" onClick={() => onPrompt("math")}>
        <Sigma />
      </ToolButton>
      <ToolButton
        label="Вставити таблицю"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon />
      </ToolButton>
      {inTable && (
        <>
          <ToolButton label="Додати рядок" onClick={() => editor.chain().focus().addRowAfter().run()}>
            <Rows3 />
          </ToolButton>
          <ToolButton label="Додати стовпець" onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <Columns3 />
          </ToolButton>
          <ToolButton label="Видалити рядок" onClick={() => editor.chain().focus().deleteRow().run()}>
            <Rows3 className="text-destructive" />
          </ToolButton>
          <ToolButton label="Видалити таблицю" onClick={() => editor.chain().focus().deleteTable().run()}>
            <Trash2 />
          </ToolButton>
        </>
      )}
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolButton label="Скасувати" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 />
      </ToolButton>
      <ToolButton label="Повторити" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 />
      </ToolButton>
    </div>
  );
}

function PromptBar({ mode, editor, onDone }: { mode: Exclude<PromptMode, null>; editor: Editor; onDone: () => void }) {
  const [value, setValue] = useState(mode === "link" ? (editor.getAttributes("link").href as string) ?? "" : "");
  const [display, setDisplay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const v = value.trim();
    if (mode === "link") {
      if (!isSafeUrl(v)) return setError("Вкажіть адресу, що починається з http:// або https://");
      editor.chain().focus().extendMarkRange("link").setLink({ href: v }).run();
    } else if (mode === "image") {
      if (!/^https:\/\//i.test(v) || !isSafeUrl(v)) return setError("Для зображень потрібна адреса https://");
      editor.chain().focus().setImage({ src: v }).run();
    } else {
      if (!v) return setError("Введіть формулу у форматі LaTeX, напр. F = BIl\\sin\\alpha");
      const text = display ? `$$${v}$$` : `$${v}$`;
      editor.chain().focus().insertContent(text).run();
    }
    onDone();
  };

  const labels = {
    link: { ph: "https://…", hint: "Адреса посилання" },
    image: { ph: "https://…/малюнок.png", hint: "Адреса зображення (https)" },
    math: { ph: "B = \\frac{F}{I l}", hint: "Формула LaTeX — у тексті вона буде між знаками $…$" },
  }[mode];

  return (
    <div className="space-y-1.5 border-b border-border bg-elevated/30 p-2">
      <div className="flex gap-2">
        <Input
          autoFocus
          value={value}
          placeholder={labels.ph}
          aria-label={labels.hint}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onDone();
            }
          }}
          className="h-8"
        />
        <Button type="button" size="icon-sm" onClick={apply} aria-label="Застосувати">
          <Check />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={onDone} aria-label="Скасувати">
          <X />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{labels.hint}</span>
        {mode === "math" && (
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={display} onChange={(e) => setDisplay(e.target.checked)} />
            окремим рядком ($$…$$)
          </label>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Безпечний редактор форматованого тексту (TipTap). HTML на виході проходить
 * санітизацію перед збереженням і ще раз — перед показом.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Почніть писати…",
  minHeight = 260,
  ariaLabel,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
}) {
  const [prompt, setPrompt] = useState<PromptMode>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        validate: (href) => /^(https?:|mailto:)/i.test(href),
      }),
      Image.configure({ inline: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: sanitizeHtml(value),
    editorProps: {
      attributes: {
        class: "tiptap rich-content px-4 py-3",
        style: `min-height:${minHeight}px`,
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      onChange(sanitizeHtml(html));
    },
  });

  // Якщо значення змінилось ззовні (наприклад, «Скасувати»), оновлюємо редактор.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : sanitizeHtml(editor.getHTML());
    if (current !== value) editor.commands.setContent(sanitizeHtml(value), false);
  }, [value, editor]);

  if (!editor) return <div className="h-64 animate-pulse rounded-lg border border-border bg-elevated" />;

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-surface focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring">
      <Toolbar editor={editor} onPrompt={setPrompt} />
      {prompt && <PromptBar mode={prompt} editor={editor} onDone={() => setPrompt(null)} />}
      <EditorContent editor={editor} />
    </div>
  );
}
