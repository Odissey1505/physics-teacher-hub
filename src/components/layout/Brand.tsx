import { cn } from "@/lib/utils";

/** Логотип: стилізований атом із силовими лініями. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-9 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#brand-g)" opacity="0.15" />
      <g fill="none" stroke="url(#brand-g)" strokeWidth="3">
        <ellipse cx="32" cy="32" rx="22" ry="8" />
        <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(120 32 32)" />
      </g>
      <circle cx="32" cy="32" r="4" fill="#3B82F6" />
    </svg>
  );
}

export function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-bold tracking-tight">Physics Teacher Hub</p>
          <p className="truncate text-xs text-muted-foreground">Цифровий кабінет учителя</p>
        </div>
      )}
    </div>
  );
}

/** Декоративні силові лінії магнітного поля (не впливають на доступність). */
export function FieldLinesDecor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" className={cn("pointer-events-none", className)} aria-hidden fill="none">
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.5">
        {[20, 40, 60, 80].map((r) => (
          <g key={r}>
            <path d={`M170 100 C 170 ${100 - r * 1.2}, ${170 - r * 2.4} ${100 - r * 1.2}, ${170 - r * 2.4} 100 S 170 ${100 + r * 1.2}, 170 100`} />
            <path d={`M230 100 C 230 ${100 - r * 1.2}, ${230 + r * 2.4} ${100 - r * 1.2}, ${230 + r * 2.4} 100 S 230 ${100 + r * 1.2}, 230 100`} />
          </g>
        ))}
      </g>
      <rect x="170" y="88" width="30" height="24" rx="3" fill="#ef4444" opacity="0.7" />
      <rect x="200" y="88" width="30" height="24" rx="3" fill="#3B82F6" opacity="0.7" />
      <text x="185" y="105" textAnchor="middle" fontSize="13" fill="white" fontWeight="700">N</text>
      <text x="215" y="105" textAnchor="middle" fontSize="13" fill="white" fontWeight="700">S</text>
    </svg>
  );
}
