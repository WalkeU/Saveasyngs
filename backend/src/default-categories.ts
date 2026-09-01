import type { TransactionType } from "./types.js";

export const defaultCategories: Array<{ name: string; type: TransactionType }> = [
  { name: "Home", type: "expense" },
  { name: "Food", type: "expense" },
  { name: "Nights", type: "expense" },
  { name: "Entertainment", type: "expense" },
  { name: "Clothing", type: "expense" },
  { name: "Beauty", type: "expense" },
  { name: "Health", type: "expense" },
  { name: "Sport", type: "expense" },
  { name: "IT", type: "expense" },
  { name: "Travel", type: "expense" },
  { name: "Vacation", type: "expense" },
  { name: "Bills", type: "expense" },
  { name: "General", type: "expense" },
  { name: "Unknown", type: "expense" },
  { name: "Gifts", type: "expense" },
  { name: "Salary", type: "income" },
  { name: "Transfer", type: "income" },
  { name: "Other Income", type: "income" },
];
