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

const money = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return money.format(amount);
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
