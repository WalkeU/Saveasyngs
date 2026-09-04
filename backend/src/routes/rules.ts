import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { CategoryRule } from "../types.js";

interface CreateRuleBody {
  pattern: string;
  categoryId: number;
  source?: "manual" | "learned";
}

interface UpdateRuleBody {
  pattern?: string;
  categoryId?: number;
  enabled?: boolean;
}

export async function ruleRoutes(app: FastifyInstance) {
  app.get("/api/rules", async () => {
    return db
      .prepare(
        `SELECT category_rules.*, categories.name AS category_name, categories.type AS category_type
         FROM category_rules
         JOIN categories ON categories.id = category_rules.category_id
         ORDER BY category_rules.created_at DESC`,
      )
      .all();
  });

  app.post<{ Body: CreateRuleBody }>("/api/rules", async (req, reply) => {
    const { pattern, categoryId, source } = req.body;
    if (!pattern?.trim() || !categoryId) {
      return reply.code(400).send({ error: "pattern and categoryId are required" });
    }
    const trimmed = pattern.trim();
    const normalized = trimmed.toLowerCase();

    // same pattern already saved for this category (e.g. the "learn this
    // pattern" popup confirmed twice for two transactions with the same
    // description) — reuse it instead of inserting a duplicate
    const existingRules = db
      .prepare("SELECT * FROM category_rules WHERE category_id = ?")
      .all(categoryId) as CategoryRule[];
    const duplicate = existingRules.find((r) => r.pattern.trim().toLowerCase() === normalized);

    let rule: CategoryRule;
    if (duplicate) {
      if (!duplicate.enabled) {
        db.prepare("UPDATE category_rules SET enabled = 1 WHERE id = ?").run(duplicate.id);
      }
      rule = db.prepare("SELECT * FROM category_rules WHERE id = ?").get(duplicate.id) as CategoryRule;
    } else {
      const result = db
        .prepare("INSERT INTO category_rules (pattern, category_id, source) VALUES (?, ?, ?)")
        .run(trimmed, categoryId, source === "learned" ? "learned" : "manual");
      rule = db
        .prepare("SELECT * FROM category_rules WHERE id = ?")
        .get(result.lastInsertRowid) as CategoryRule;
    }

    // apply retroactively: categorize existing, still-uncategorized transactions
    // that match this rule's pattern, so the rule doesn't only affect future imports
    const category = db.prepare("SELECT type FROM categories WHERE id = ?").get(categoryId) as
      | { type: string }
      | undefined;
    let appliedCount = 0;
    if (category) {
      const normalizedPattern = pattern.trim().toLowerCase();
      const candidates = db
        .prepare("SELECT id, description FROM transactions WHERE category_id IS NULL AND type = ?")
        .all(category.type) as { id: number; description: string }[];
      const matchingIds = candidates
        .filter((t) => t.description.toLowerCase().includes(normalizedPattern))
        .map((t) => t.id);
      if (matchingIds.length) {
        const update = db.prepare("UPDATE transactions SET category_id = ? WHERE id = ?");
        db.transaction((ids: number[]) => {
          for (const id of ids) update.run(categoryId, id);
        })(matchingIds);
        appliedCount = matchingIds.length;
      }
    }

    return reply.code(201).send({ ...rule, appliedCount });
  });

  app.patch<{ Params: { id: string }; Body: UpdateRuleBody }>(
    "/api/rules/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      const existing = db.prepare("SELECT * FROM category_rules WHERE id = ?").get(id) as
        | CategoryRule
        | undefined;
      if (!existing) return reply.code(404).send({ error: "not found" });

      const pattern = req.body.pattern?.trim() ?? existing.pattern;
      const categoryId = req.body.categoryId ?? existing.category_id;
      const enabled =
        req.body.enabled === undefined ? existing.enabled : req.body.enabled ? 1 : 0;
      db.prepare(
        "UPDATE category_rules SET pattern = ?, category_id = ?, enabled = ? WHERE id = ?",
      ).run(pattern, categoryId, enabled, id);
      return db.prepare("SELECT * FROM category_rules WHERE id = ?").get(id) as CategoryRule;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/rules/:id", async (req, reply) => {
    db.prepare("DELETE FROM category_rules WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });
}
