import { useId, useMemo, useState } from "react";
import { MathFormula } from "@/components/common/Math";
import { Input, NativeSelect } from "@/components/ui/form-controls";
import { type CalcTemplate, formatNumber, runCalculator } from "@/lib/calculators";
import { cn } from "@/lib/utils";

/** Калькулятор за явно налаштованим шаблоном: обрати невідому, ввести решту з одиницями. */
export function FormulaCalculator({ template }: { template: CalcTemplate }) {
  const uid = useId();
  const solvable = template.variables.filter((v) => template.solve[v.key]);
  const [target, setTarget] = useState(solvable[0]?.key ?? "");
  const [inputs, setInputs] = useState<Record<string, { raw: string; unitId: string }>>(() =>
    Object.fromEntries(template.variables.map((v) => [v.key, { raw: "", unitId: v.units[0].id }])),
  );
  const [outUnit, setOutUnit] = useState<Record<string, string>>({});

  const targetVar = template.variables.find((v) => v.key === target)!;
  const others = template.variables.filter((v) => v.key !== target);
  const allFilled = others.every((v) => inputs[v.key]?.raw.trim());

  const outcome = useMemo(() => (allFilled ? runCalculator(template, target, inputs) : null), [allFilled, template, target, inputs]);
  const outUnitId = outUnit[target] ?? targetVar.units[0].id;
  const outUnitObj = targetVar.units.find((u) => u.id === outUnitId) ?? targetVar.units[0];

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-elevated/30 p-3 text-sm">
      <div className="text-base">
        <MathFormula latex={template.latex} />
      </div>
      {template.note && <p className="text-xs text-muted-foreground">{template.note}</p>}

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Що знайти?</legend>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {solvable.map((v) => (
            <label
              key={v.key}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1",
                target === v.key && "border-primary bg-primary/10 text-primary",
              )}
            >
              <input type="radio" name={`${uid}-target`} className="sr-only" checked={target === v.key} onChange={() => setTarget(v.key)} />
              <MathFormula latex={v.symbol} display={false} /> <span className="text-xs">{v.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        {others.map((v) => (
          <div key={v.key} className="grid grid-cols-[3rem_1fr_7rem] items-center gap-2">
            <label htmlFor={`${uid}-${v.key}`} className="text-right" title={v.name}>
              <MathFormula latex={v.symbol} display={false} />
            </label>
            <Input
              id={`${uid}-${v.key}`}
              inputMode="decimal"
              placeholder={v.name}
              aria-label={v.name}
              value={inputs[v.key].raw}
              onChange={(e) => setInputs((s) => ({ ...s, [v.key]: { ...s[v.key], raw: e.target.value } }))}
              className="h-9"
            />
            <NativeSelect
              aria-label={`Одиниця: ${v.name}`}
              value={inputs[v.key].unitId}
              onChange={(e) => setInputs((s) => ({ ...s, [v.key]: { ...s[v.key], unitId: e.target.value } }))}
              className="h-9"
              disabled={v.units.length === 1}
            >
              {v.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ))}
      </div>

      <div aria-live="polite" className="rounded-md bg-surface p-3">
        {!allFilled ? (
          <p className="text-muted-foreground">Заповніть усі поля, щоб отримати результат.</p>
        ) : outcome && !outcome.ok ? (
          <p className="text-destructive">{outcome.error}</p>
        ) : outcome && outcome.ok ? (
          <div className="flex flex-wrap items-center gap-2">
            <MathFormula latex={targetVar.symbol} display={false} />
            <span>=</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatNumber(targetVar.angle ? outcome.valueSI : outcome.valueSI / outUnitObj.factor)}
            </span>
            <NativeSelect
              aria-label="Одиниця результату"
              value={outUnitId}
              onChange={(e) => setOutUnit((s) => ({ ...s, [target]: e.target.value }))}
              className="h-8 w-28"
              disabled={targetVar.units.length === 1}
            >
              {targetVar.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Підтримувані одиниці:{" "}
        {template.variables.map((v) => `${v.name} — ${v.units.map((u) => u.label).join(", ")}`).join("; ")}. Десятковий
        роздільник — кома або крапка; можна писати 1,5e-3.
      </p>
    </div>
  );
}
