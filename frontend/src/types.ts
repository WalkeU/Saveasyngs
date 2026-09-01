export type TransactionType = "expense" | "income";

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
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
  date: string;
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
