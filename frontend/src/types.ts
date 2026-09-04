export type TransactionType = "expense" | "income" | "savings";
export type CategoryType = "expense" | "income";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface SavingsBucket {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  note: string | null;
  manual_value: number | null;
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  bucket_id: number | null;
  bucket_name: string | null;
  bucket_color: string | null;
  bucket_icon: string | null;
  date: string;
  time: string | null;
  note: string | null;
  source: "manual" | "import";
  created_at: string;
}

export interface CategoryRule {
  id: number;
  pattern: string;
  category_id: number;
  category_name: string;
  category_type: TransactionType;
  source: "manual" | "learned";
  enabled: 0 | 1;
  created_at: string;
}

export interface ReportByCategory {
  category_id: number | null;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  type: TransactionType;
  total: number;
  count: number;
}

export interface ReportSummary {
  income: number;
  expense: number;
  net: number;
  byMonth: { month: string; type: TransactionType; total: number }[];
}

export interface CategoryExport {
  scope: "month" | "year";
  type: TransactionType;
  periods: string[];
  categories: { category_id: number | null; name: string; totals: Record<string, number>; total: number }[];
  periodTotals: Record<string, number>;
  grandTotal: number;
}

export interface MonthlyComparisonCategory {
  category_id: number | null;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number | null;
  average: number;
}

export interface MonthlyComparison {
  month: string;
  previousMonth: string;
  monthCount: number;
  categories: MonthlyComparisonCategory[];
}

export interface MonthlyByCategory {
  months: string[];
  categories: { category_id: number | null; name: string; color: string | null }[];
  data: Record<string, number | string>[];
}

export interface ImportPreview {
  headers: string[];
  sampleRows: Record<string, string>[];
  rowCount: number;
  headerSignature: string;
  mapping: { date: string | null; description: string | null; amount: string | null };
  knownProfile: string | null;
}

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  skipped: number;
  duplicateRows: { date: string; description: string; amount: number; type: TransactionType }[];
  skippedRows: { date: string; description: string; amount: string; reason: string }[];
}

export interface RecurringPayment {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  bucket_id: number | null;
  bucket_name: string | null;
  bucket_color: string | null;
  bucket_icon: string | null;
  day_of_month: number;
  enabled: 0 | 1;
  created_at: string;
}

export interface MissingRecurring {
  month: string;
  missing: RecurringPayment[];
}

export interface RecurringShare {
  month: string;
  expense: { recurringTotal: number; monthTotal: number };
  income: { recurringTotal: number; monthTotal: number };
}

export interface NetWorthBucket {
  bucket_id: number;
  bucket_name: string;
  bucket_color: string | null;
  bucket_icon: string | null;
  total: number;
  isManual: boolean;
}

export interface NetWorth {
  liquid: number;
  liquidCalculated: number;
  liquidIsManual: boolean;
  buckets: NetWorthBucket[];
  netWorth: number;
}

export interface AppSettings {
  decimalPlaces: number;
  transactionsBatchSize: number;
}

export interface ActivityLogEntry {
  id: number;
  action: string;
  summary: string;
  created_at: string;
}

export interface LegacyImportResult {
  total: number;
  applied: number;
  alreadyCategorized: number;
  noTransactionMatch: number;
  ambiguousMatch: number;
  noCategoryMatch: number;
  emptyCategory: number;
  invalidRow: number;
}
