/**
 * Калькулятори — ЯВНО налаштовані шаблони. Жодного eval: для кожної величини
 * заздалегідь записано функцію, що її обчислює. Довільний LaTeX не розв'язується.
 */

export interface UnitOption {
  id: string;
  label: string;
  /** Множник переведення в СІ: значення_СІ = значення × factor. */
  factor: number;
}

export interface CalcVariable {
  key: string;
  symbol: string; // LaTeX
  name: string;
  units: UnitOption[];
  /** Обмеження для введеного значення. */
  min?: number;
  max?: number;
  /** Для кутів у градусах. */
  angle?: boolean;
}

export interface CalcTemplate {
  key: string;
  name: string;
  latex: string;
  variables: CalcVariable[];
  /** Обчислення кожної величини через інші (усе в СІ, кути — в градусах). */
  solve: Record<string, (v: Record<string, number>) => number>;
  note?: string;
}

const deg = (a: number) => (a * Math.PI) / 180;
const sin = (a: number) => {
  const s = Math.sin(deg(a));
  return Math.abs(s) < 1e-12 ? 0 : s;
};
const cos = (a: number) => {
  const c = Math.cos(deg(a));
  return Math.abs(c) < 1e-12 ? 0 : c;
};

const U = {
  force: [
    { id: "N", label: "Н", factor: 1 },
    { id: "mN", label: "мН", factor: 1e-3 },
    { id: "kN", label: "кН", factor: 1e3 },
  ],
  induction: [
    { id: "T", label: "Тл", factor: 1 },
    { id: "mT", label: "мТл", factor: 1e-3 },
    { id: "uT", label: "мкТл", factor: 1e-6 },
  ],
  current: [
    { id: "A", label: "А", factor: 1 },
    { id: "mA", label: "мА", factor: 1e-3 },
  ],
  length: [
    { id: "m", label: "м", factor: 1 },
    { id: "cm", label: "см", factor: 1e-2 },
    { id: "mm", label: "мм", factor: 1e-3 },
  ],
  angle: [{ id: "deg", label: "°", factor: 1 }],
  charge: [
    { id: "C", label: "Кл", factor: 1 },
    { id: "uC", label: "мкКл", factor: 1e-6 },
    { id: "nC", label: "нКл", factor: 1e-9 },
    { id: "e", label: "e (елем. заряд)", factor: 1.602176634e-19 },
  ],
  speed: [
    { id: "ms", label: "м/с", factor: 1 },
    { id: "kms", label: "км/с", factor: 1e3 },
    { id: "kmh", label: "км/год", factor: 1 / 3.6 },
  ],
  flux: [
    { id: "Wb", label: "Вб", factor: 1 },
    { id: "mWb", label: "мВб", factor: 1e-3 },
  ],
  area: [
    { id: "m2", label: "м²", factor: 1 },
    { id: "cm2", label: "см²", factor: 1e-4 },
    { id: "mm2", label: "мм²", factor: 1e-6 },
  ],
  voltage: [
    { id: "V", label: "В", factor: 1 },
    { id: "mV", label: "мВ", factor: 1e-3 },
    { id: "kV", label: "кВ", factor: 1e3 },
  ],
  time: [
    { id: "s", label: "с", factor: 1 },
    { id: "ms", label: "мс", factor: 1e-3 },
    { id: "min", label: "хв", factor: 60 },
  ],
  count: [{ id: "n", label: "шт.", factor: 1 }],
  resistance: [
    { id: "Ohm", label: "Ом", factor: 1 },
    { id: "kOhm", label: "кОм", factor: 1e3 },
    { id: "MOhm", label: "МОм", factor: 1e6 },
  ],
  power: [
    { id: "W", label: "Вт", factor: 1 },
    { id: "kW", label: "кВт", factor: 1e3 },
    { id: "mW", label: "мВт", factor: 1e-3 },
  ],
  percent: [{ id: "pct", label: "%", factor: 1 }],
} satisfies Record<string, UnitOption[]>;

export const CALCULATORS: CalcTemplate[] = [
  {
    key: "ampere_force",
    name: "Сила Ампера",
    latex: "F_A = B I l \\sin\\alpha",
    variables: [
      { key: "F", symbol: "F_A", name: "сила Ампера", units: U.force, min: 0 },
      { key: "B", symbol: "B", name: "магнітна індукція", units: U.induction, min: 0 },
      { key: "I", symbol: "I", name: "сила струму", units: U.current, min: 0 },
      { key: "l", symbol: "l", name: "довжина активної частини провідника", units: U.length, min: 0 },
      { key: "a", symbol: "\\alpha", name: "кут між провідником і вектором B", units: U.angle, min: 0, max: 180, angle: true },
    ],
    solve: {
      F: (v) => v.B * v.I * v.l * sin(v.a),
      B: (v) => v.F / (v.I * v.l * sin(v.a)),
      I: (v) => v.F / (v.B * v.l * sin(v.a)),
      l: (v) => v.F / (v.B * v.I * sin(v.a)),
    },
  },
  {
    key: "lorentz_force",
    name: "Сила Лоренца",
    latex: "F_Л = |q| v B \\sin\\alpha",
    variables: [
      { key: "F", symbol: "F_Л", name: "сила Лоренца", units: U.force, min: 0 },
      { key: "q", symbol: "|q|", name: "модуль заряду частинки", units: U.charge, min: 0 },
      { key: "v", symbol: "v", name: "швидкість частинки", units: U.speed, min: 0 },
      { key: "B", symbol: "B", name: "магнітна індукція", units: U.induction, min: 0 },
      { key: "a", symbol: "\\alpha", name: "кут між v і B", units: U.angle, min: 0, max: 180, angle: true },
    ],
    solve: {
      F: (v) => v.q * v.v * v.B * sin(v.a),
      q: (v) => v.F / (v.v * v.B * sin(v.a)),
      v: (v) => v.F / (v.q * v.B * sin(v.a)),
      B: (v) => v.F / (v.q * v.v * sin(v.a)),
    },
  },
  {
    key: "magnetic_flux",
    name: "Магнітний потік",
    latex: "\\Phi = B S \\cos\\alpha",
    note: "α — кут між вектором B і нормаллю до поверхні.",
    variables: [
      { key: "Phi", symbol: "\\Phi", name: "магнітний потік", units: U.flux },
      { key: "B", symbol: "B", name: "магнітна індукція", units: U.induction, min: 0 },
      { key: "S", symbol: "S", name: "площа контуру", units: U.area, min: 0 },
      { key: "a", symbol: "\\alpha", name: "кут між B і нормаллю", units: U.angle, min: 0, max: 180, angle: true },
    ],
    solve: {
      Phi: (v) => v.B * v.S * cos(v.a),
      B: (v) => v.Phi / (v.S * cos(v.a)),
      S: (v) => v.Phi / (v.B * cos(v.a)),
    },
  },
  {
    key: "induction_emf",
    name: "ЕРС індукції (закон Фарадея)",
    latex: "\\mathcal{E}_і = N \\frac{\\Delta\\Phi}{\\Delta t}",
    note: "Обчислюється модуль ЕРС; знак «−» (правило Ленца) вказує напрямок.",
    variables: [
      { key: "E", symbol: "\\mathcal{E}_і", name: "ЕРС індукції", units: U.voltage, min: 0 },
      { key: "N", symbol: "N", name: "кількість витків", units: U.count, min: 1 },
      { key: "dPhi", symbol: "\\Delta\\Phi", name: "зміна магнітного потоку", units: U.flux, min: 0 },
      { key: "dt", symbol: "\\Delta t", name: "час зміни", units: U.time, min: 0 },
    ],
    solve: {
      E: (v) => (v.N * v.dPhi) / v.dt,
      N: (v) => (v.E * v.dt) / v.dPhi,
      dPhi: (v) => (v.E * v.dt) / v.N,
      dt: (v) => (v.N * v.dPhi) / v.E,
    },
  },
  {
    key: "ohm_law",
    name: "Закон Ома для ділянки кола",
    latex: "I = \\frac{U}{R}",
    variables: [
      { key: "I", symbol: "I", name: "сила струму", units: U.current, min: 0 },
      { key: "U", symbol: "U", name: "напруга", units: U.voltage, min: 0 },
      { key: "R", symbol: "R", name: "опір", units: U.resistance, min: 0 },
    ],
    solve: {
      I: (v) => v.U / v.R,
      U: (v) => v.I * v.R,
      R: (v) => v.U / v.I,
    },
  },
  {
    key: "electric_power",
    name: "Потужність електричного струму",
    latex: "P = U I",
    variables: [
      { key: "P", symbol: "P", name: "потужність", units: U.power, min: 0 },
      { key: "U", symbol: "U", name: "напруга", units: U.voltage, min: 0 },
      { key: "I", symbol: "I", name: "сила струму", units: U.current, min: 0 },
    ],
    solve: {
      P: (v) => v.U * v.I,
      U: (v) => v.P / v.I,
      I: (v) => v.P / v.U,
    },
  },
  {
    key: "efficiency",
    name: "ККД електродвигуна",
    latex: "\\eta = \\frac{P_{кор}}{P_{пов}} \\cdot 100\\%",
    variables: [
      { key: "eta", symbol: "\\eta", name: "коефіцієнт корисної дії", units: U.percent, min: 0, max: 100 },
      { key: "Pk", symbol: "P_{кор}", name: "корисна потужність", units: U.power, min: 0 },
      { key: "Pp", symbol: "P_{пов}", name: "повна (споживана) потужність", units: U.power, min: 0 },
    ],
    solve: {
      eta: (v) => (v.Pk / v.Pp) * 100,
      Pk: (v) => (v.eta / 100) * v.Pp,
      Pp: (v) => v.Pk / (v.eta / 100),
    },
  },
];

export const CALCULATOR_MAP = Object.fromEntries(CALCULATORS.map((c) => [c.key, c])) as Record<string, CalcTemplate>;

/** Розбір числа: приймає кому або крапку, експоненту (1,5e-3). */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export type CalcOutcome = { ok: true; valueSI: number } | { ok: false; error: string };

export function runCalculator(
  tpl: CalcTemplate,
  target: string,
  inputs: Record<string, { raw: string; unitId: string }>,
): CalcOutcome {
  const values: Record<string, number> = {};
  for (const v of tpl.variables) {
    if (v.key === target) continue;
    const input = inputs[v.key];
    const n = parseNumber(input?.raw ?? "");
    if (n === null) return { ok: false, error: `Введіть числове значення для ${v.name}.` };
    if (v.min !== undefined && n < v.min) return { ok: false, error: `Значення «${v.name}» не може бути меншим за ${v.min}.` };
    if (v.max !== undefined && n > v.max) return { ok: false, error: `Значення «${v.name}» не може бути більшим за ${v.max}.` };
    const unit = v.units.find((u) => u.id === input?.unitId) ?? v.units[0];
    values[v.key] = v.angle ? n : n * unit.factor;
  }
  const fn = tpl.solve[target];
  if (!fn) return { ok: false, error: "Цю величину не можна обчислити за цим шаблоном." };
  const result = fn(values);
  if (!Number.isFinite(result)) {
    return {
      ok: false,
      error: "Обчислення неможливе: ділення на нуль. Перевірте значення (наприклад, кут 0° чи 180° для sin, 90° для cos).",
    };
  }
  const tv = tpl.variables.find((v) => v.key === target);
  if (tv?.min !== undefined && result < tv.min - 1e-12) {
    return { ok: false, error: "Отримано фізично неможливе (від'ємне) значення. Перевірте введені дані." };
  }
  return { ok: true, valueSI: result };
}

export function formatNumber(n: number) {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e-3 && abs < 1e6) {
    return new Intl.NumberFormat("uk-UA", { maximumSignificantDigits: 6 }).format(n);
  }
  const [mant, exp] = n.toExponential(4).split("e");
  return `${Number(mant).toLocaleString("uk-UA", { maximumSignificantDigits: 5 })} · 10^${Number(exp)}`;
}
