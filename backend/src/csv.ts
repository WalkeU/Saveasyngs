import { parse } from "csv-parse/sync";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(buffer: Buffer): ParsedCsv {
  const headerRow = (parse(buffer, { to: 1, bom: true }) as string[][])[0] ?? [];
  const rows = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Record<string, string>[];
  return { headers: headerRow.map((h) => h.trim()), rows };
}

const DATE_KEYWORDS = ["date", "dátum"];
const DESCRIPTION_KEYWORDS = ["description", "payee", "narrative", "notes", "merchant", "leírás"];
const AMOUNT_KEYWORDS = ["amount", "összeg"];

function guessColumn(headers: string[], exact: string[], substrings: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const candidate of exact) {
    const idx = lower.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  for (let i = 0; i < headers.length; i++) {
    if (substrings.some((s) => lower[i].includes(s))) return headers[i];
  }
  return null;
}

export function guessMapping(headers: string[]) {
  return {
    date: guessColumn(headers, ["date"], DATE_KEYWORDS),
    description: guessColumn(
      headers,
      ["description", "payee", "notes"],
      DESCRIPTION_KEYWORDS,
    ),
    amount: guessColumn(headers, ["amount"], AMOUNT_KEYWORDS),
  };
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function parseDate(raw: string): string | null {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

// pulls an HH:MM[:SS] out of the raw date cell, when the bank export's date
// column actually includes a time-of-day (many do) — the date column itself
// is otherwise truncated to just the date by parseDate above
export function parseTime(raw: string): string | null {
  const match = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, h, m, s] = match;
  if (Number(h) > 23 || Number(m) > 59) return null;
  return `${h.padStart(2, "0")}:${m}${s ? `:${s}` : ""}`;
}
