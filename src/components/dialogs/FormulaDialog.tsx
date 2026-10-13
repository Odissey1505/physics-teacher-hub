import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/common/FormDialog";
import { ConflictBanner } from "@/components/common/ConflictBanner";
import { MathFormula } from "@/components/common/Math";
import { TopicPicker } from "@/components/common/TopicPicker";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { CALCULATORS } from "@/lib/calculators";
import { fetchUpdatedAt, insertRow, updateVersioned } from "@/lib/api";
import { ConflictError, humanizeError } from "@/lib/errors";
import { qk, useInvalidate } from "@/lib/queries";
import type { Formula } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1, "Вкажіть назву формули").max(200),
  latex: z.string().trim().min(1, "Введіть формулу у форматі LaTeX").max(2000),
  explanation: z.string().max(5000),
  quantities: z
    .array(
      z.object({
        symbol: z.string().trim().min(1, "Позначення").max(40),
        name: z.string().trim().min(1, "Назва").max(120),
        unit: z.string().trim().max(40),
      }),
    )
    .max(20),
  units: z.string().max(1000),
  example: z.string().max(5000),
  topic_id: z.string().nullable(),
  calculator_key: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function FormulaDialog({
  formula,
  topicId,
  onClose,
}: {
  formula?: Formula;
  topicId?: string | null;
  onClose: () => void;
}) {
  const invalidate = useInvalidate();
  const [conflict, setConflict] = useState(false);
  const { register, control, handleSubmit, formState, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: formula?.name ?? "",
      latex: formula?.latex ?? "",
      explanation: formula?.explanation ?? "",
      quantities: formula?.quantities ?? [],
      units: formula?.units ?? "",
      example: formula?.example ?? "",
      topic_id: formula ? formula.topic_id : (topicId ?? null),
      calculator_key: formula?.calculator_key ?? "",
    },
  });
  const quantities = useFieldArray({ control, name: "quantities" });
  const latex = watch("latex");

  const mutation = useMutation({
    mutationFn: async ({ values, force }: { values: FormValues; force?: boolean }) => {
      const payload = {
        name: values.name.trim(),
        latex: values.latex.trim(),
        explanation: values.explanation.trim(),
        quantities: values.quantities,
        units: values.units.trim(),
        example: values.example.trim(),
        topic_id: values.topic_id,
        calculator_key: values.calculator_key || null,
      };
      if (!formula) return insertRow<Formula>("formulas", payload);
      const version = force ? await fetchUpdatedAt("formulas", formula.id) : formula.updated_at;
      return updateVersioned<Formula>("formulas", formula.id, version, payload);
    },
    onSuccess: async () => {
      await invalidate(qk.formulas);
      toast.success(formula ? "Формулу оновлено" : "Формулу додано");
      onClose();
    },
    onError: (e) => (e instanceof ConflictError ? setConflict(true) : toast.error(humanizeError(e))),
  });

  return (
    <FormDialog
      title={formula ? "Редагувати формулу" : "Нова формула"}
      isDirty={formState.isDirty}
      onClose={onClose}
      onSubmit={handleSubmit((values) => mutation.mutate({ values }))}
      submitting={mutation.isPending}
      size="lg"
    >
      {conflict && (
        <ConflictBanner
          busy={mutation.isPending}
          onOverwrite={handleSubmit((values) => {
            setConflict(false);
            mutation.mutate({ values, force: true });
          })}
          onDiscard={async () => {
            await invalidate(qk.formulas);
            onClose();
          }}
        />
      )}
      <Field label="Назва" htmlFor="f-name" required error={formState.errors.name?.message}>
        <Input id="f-name" placeholder="Сила Ампера" aria-invalid={!!formState.errors.name} {...register("name")} />
      </Field>
      <Field
        label="Формула (LaTeX)"
        htmlFor="f-latex"
        required
        error={formState.errors.latex?.message}
        hint={
          <>
            Наприклад: <code>F_A = B I l \sin\alpha</code>, дріб — <code>\frac{"{a}{b}"}</code>, індекс — <code>B_0</code>
          </>
        }
      >
        <Textarea id="f-latex" rows={2} className="font-mono" spellCheck={false} aria-invalid={!!formState.errors.latex} {...register("latex")} />
      </Field>
      {latex.trim() && (
        <div className="rounded-lg border border-border bg-elevated/40 p-4 text-lg" aria-live="polite">
          <p className="mb-1 text-xs text-muted-foreground">Попередній перегляд</p>
          <MathFormula latex={latex} />
        </div>
      )}
      <Field label="Пояснення" htmlFor="f-expl">
        <Textarea id="f-expl" rows={3} placeholder="Що описує формула, коли застосовується. Формули в тексті — між $…$" {...register("explanation")} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Фізичні величини</legend>
        {quantities.fields.length === 0 && (
          <p className="text-xs text-muted-foreground">Додайте величини, що входять у формулу.</p>
        )}
        {quantities.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[5rem_1fr_6rem_auto] items-start gap-2">
            <Input aria-label="Позначення (LaTeX)" placeholder="B" className="font-mono" {...register(`quantities.${i}.symbol`)} />
            <Input aria-label="Назва величини" placeholder="магнітна індукція" {...register(`quantities.${i}.name`)} />
            <Input aria-label="Одиниця" placeholder="Тл" {...register(`quantities.${i}.unit`)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => quantities.remove(i)} aria-label="Видалити величину">
              <Trash2 />
            </Button>
          </div>
        ))}
        {formState.errors.quantities && (
          <p className="text-xs text-destructive">Заповніть позначення та назву кожної величини.</p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => quantities.append({ symbol: "", name: "", unit: "" })}
          disabled={quantities.fields.length >= 20}
        >
          <Plus /> Додати величину
        </Button>
      </fieldset>

      <Field label="Одиниці вимірювання" htmlFor="f-units" hint="Наприклад: [F] = Н; 1 Тл = 1 Н/(А·м)">
        <Input id="f-units" {...register("units")} />
      </Field>
      <Field label="Приклад розрахунку" htmlFor="f-example">
        <Textarea id="f-example" rows={4} placeholder="Дано: … Розв'язання: …" {...register("example")} />
      </Field>

      <Controller
        control={control}
        name="topic_id"
        render={({ field }) => (
          <TopicPicker value={field.value} onChange={field.onChange} idPrefix="f" noneLabel="— Без прив'язки до теми —" />
        )}
      />

      <Field
        label="Калькулятор (необов'язково)"
        htmlFor="f-calc"
        hint="Калькулятори — заздалегідь налаштовані шаблони з перевіркою одиниць. Довільні формули не обчислюються."
      >
        <NativeSelect
          id="f-calc"
          {...register("calculator_key", {
            onChange: (e) => {
              const tpl = CALCULATORS.find((c) => c.key === e.target.value);
              if (tpl && !latex.trim()) setValue("latex", tpl.latex, { shouldDirty: true });
            },
          })}
        >
          <option value="">Без калькулятора</option>
          {CALCULATORS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </FormDialog>
  );
}
