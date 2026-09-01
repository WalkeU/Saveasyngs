import type { TransactionType } from "./types.js";

export const defaultCategories: Array<{ name: string; type: TransactionType; icon: string }> = [
  { name: "Home", type: "expense", icon: "home" },
  { name: "Food", type: "expense", icon: "utensils" },
  { name: "Nights", type: "expense", icon: "martini" },
  { name: "Entertainment", type: "expense", icon: "clapperboard" },
  { name: "Clothing", type: "expense", icon: "shirt" },
  { name: "Beauty", type: "expense", icon: "sparkles" },
  { name: "Health", type: "expense", icon: "heart-pulse" },
  { name: "Sport", type: "expense", icon: "dumbbell" },
  { name: "IT", type: "expense", icon: "cpu" },
  { name: "Travel", type: "expense", icon: "plane" },
  { name: "Vacation", type: "expense", icon: "palmtree" },
  { name: "Bills", type: "expense", icon: "receipt" },
  { name: "General", type: "expense", icon: "shapes" },
  { name: "Unknown", type: "expense", icon: "circle-help" },
  { name: "Gifts", type: "expense", icon: "gift" },
  { name: "Salary", type: "income", icon: "banknote" },
  { name: "Transfer", type: "income", icon: "arrow-left-right" },
  { name: "Other Income", type: "income", icon: "piggy-bank" },
];
