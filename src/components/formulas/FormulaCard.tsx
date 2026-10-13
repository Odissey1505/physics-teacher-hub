import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calculator, Copy, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { MathFormula, TextWithMath } from "@/components/common/Math";
import { FormulaCalculator } from "./FormulaCalculator";
import { useConfirm } from "@/context/confirm";
import { useDialogs } from "@/context/dialogs";
import { deleteRow, duplicateFormula } from "@/lib/api";
import { CALCULATOR_MAP } from "@/lib/calculators";
import { humanizeError } from "@/lib/errors";
import { qk, useInvalidate } from "@/lib/queries";
import type { Formula } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FormulaCard({
  formula,
  topicLabel,
  highlighted,
}: {
  formula: Formula;
  topicLabel?: string;
  highlighted?: boolean;
}) {
  const dialogs = useDialogs();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [calcOpen, setCalcOpen] = useState(false);
  const calc = formula.calculator_key ? CALCULATOR_MAP[formula.calculator_key] : undefined;

  const remove = useMutation({
    mutationFn: () => deleteRow("formulas", formula.id),
    onSuccess: async () => {
      await invalidate(qk.formulas);
      toast.success("Формулу видалено");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });
  const duplicate = useMutation({
    mutationFn: () => duplicateFormula(formula),
    onSuccess: async () => {
      await invalidate(qk.formulas);
      toast.success("Створено копію формули");
    },
    onError: (e) => toast.error(humanizeError(e)),
  });

  return (
    <Card
      id={`formula-${formula.id}`}
      className={cn("flex flex-col p-5 transition", highlighted && "ring-2 ring-primary")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{formula.name}</h3>
          {topicLabel && <p className="mt-0.5 truncate text-xs text-muted-foreground">{topicLabel}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Дії з формулою «${formula.name}»`}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => dialogs.openFormula(formula)}>
              <Pencil /> Редагувати
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => duplicate.mutate()}>
              <Copy /> Дублювати
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={async () => {
                if (
                  await confirm({
                    title: "Видалити формулу?",
                    description: `«${formula.name}» буде видалено назавжди.`,
                    confirmLabel: "Видалити",
                    destructive: true,
                  })
                )
                  remove.mutate();
              }}
            >
              <Trash2 /> Видалити
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="my-4 rounded-lg bg-elevated/50 px-3 py-4 text-xl">
        <MathFormula latex={formula.latex} />
      </div>

      {formula.explanation && <TextWithMath text={formula.explanation} className="text-sm text-muted-foreground" />}

      {formula.quantities.length > 0 && (
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Величини у формулі</caption>
          <tbody>
            {formula.quantities.map((q, i) => (
              <tr key={i} className="border-t border-border first:border-t-0">
                <td className="w-16 py-1.5 pr-2 align-top">
                  <MathFormula latex={q.symbol} display={false} />
                </td>
                <td className="py-1.5 pr-2 align-top">{q.name}</td>
                <td className="py-1.5 text-right align-top text-muted-foreground">{q.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formula.units && <p className="mt-3 text-sm"><span className="text-muted-foreground">Одиниці: </span>{formula.units}</p>}

      {formula.example && (
        <details className="mt-3 rounded-lg border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Приклад розрахунку</summary>
          <TextWithMath text={formula.example} className="mt-2" />
        </details>
      )}

      {calc && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => setCalcOpen((o) => !o)} aria-expanded={calcOpen}>
            <Calculator /> {calcOpen ? "Сховати калькулятор" : "Калькулятор"}
          </Button>
          {calcOpen && <FormulaCalculator template={calc} />}
        </div>
      )}
      {formula.calculator_key && !calc && (
        <Badge variant="warning" className="mt-3 self-start">
          Невідомий калькулятор «{formula.calculator_key}»
        </Badge>
      )}
    </Card>
  );
}
