export function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(offset = 0): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthKey(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long" }).format(
    new Date(y, m - 1, 1),
  );
}

// how many fraction digits money amounts round/display to; forints have
// none by default, configurable on Beállítások (see AppSettings)
let decimalPlaces = 0;

export function setDecimalPlaces(n: number): void {
  decimalPlaces = n;
}

export function getDecimalPlaces(): number {
  return decimalPlaces;
}

// rounds to the configured decimal precision, half rounding up (never
// banker's rounding) — mainly to clean up floating-point noise from summed
// amounts (e.g. 235437.5700000003) before it ever reaches the screen
export function roundMoney(amount: number, decimals: number = decimalPlaces): number {
  const factor = 10 ** decimals;
  return Math.round(amount * factor) / factor;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(roundMoney(amount));
}

// lets an amount field accept e.g. "31000-3000" typed after the existing
// value and evaluate it on blur. Only digits/+-*/().space ever reach
// Function() — anything else (letters, semicolons, ...) fails the regex
// first, so this can't execute arbitrary code.
export function evaluateAmountExpression(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed || !/^[0-9+\-*/(). ]+$/.test(trimmed)) return null;
  try {
    const result = Function(`"use strict"; return (${trimmed});`)() as unknown;
    if (typeof result !== "number" || !Number.isFinite(result) || result === 0) return null;
    return roundMoney(Math.abs(result));
  } catch {
    return null;
  }
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

const PALETTE = [
  "#21624a",
  "#a8462c",
  "#b8791e",
  "#3d5a80",
  "#7a5195",
  "#7c9c3f",
  "#c04c74",
  "#4a7c72",
  "#9c6b30",
  "#5b6b8c",
];

export function categoryColor(id: number | null, explicit: string | null): string {
  if (explicit) return explicit;
  if (id === null) return "#a89d87";
  return PALETTE[id % PALETTE.length];
}
