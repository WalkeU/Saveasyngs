import type { CategoryRule } from "./types.js";

/**
 * Longer patterns are checked first so a specific rule (e.g. "coca cola")
 * wins over a broader one (e.g. "cola") that would otherwise match first.
 */
export function matchCategory(
  description: string,
  rules: Pick<CategoryRule, "pattern" | "category_id">[],
): number | null {
  const normalized = description.toLowerCase();
  const sorted = [...rules].sort((a, b) => b.pattern.length - a.pattern.length);
  for (const rule of sorted) {
    if (rule.pattern && normalized.includes(rule.pattern.toLowerCase())) {
      return rule.category_id;
    }
  }
  return null;
}
