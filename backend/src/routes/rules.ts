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
    const result = db
      .prepare("INSERT INTO category_rules (pattern, category_id, source) VALUES (?, ?, ?)")
      .run(pattern.trim(), categoryId, source === "learned" ? "learned" : "manual");
    const rule = db
      .prepare("SELECT * FROM category_rules WHERE id = ?")
      .get(result.lastInsertRowid) as CategoryRule;
    return reply.code(201).send(rule);
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
