export type TransactionType = "expense" | "income";

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: number | null;
  date: string;
  source: "manual" | "import";
  import_hash: string | null;
  created_at: string;
}

export interface CategoryRule {
  id: number;
  pattern: string;
  category_id: number;
  source: "manual" | "learned";
  enabled: 0 | 1;
  created_at: string;
}

export interface ImportProfile {
  id: number;
  header_signature: string;
  name: string;
  date_column: string;
  description_column: string;
  amount_column: string;
  created_at: string;
}
