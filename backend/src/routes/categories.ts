import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { Category, TransactionType } from "../types.js";

interface CreateCategoryBody {
  name: string;
  type: TransactionType;
  color?: string;
}

interface UpdateCategoryBody {
  name?: string;
  color?: string;
}

export async function categoryRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { type?: TransactionType } }>("/api/categories", async (req) => {
    const { type } = req.query;
    if (type) {
      return db
        .prepare("SELECT * FROM categories WHERE type = ? ORDER BY name")
        .all(type) as Category[];
    }
    return db.prepare("SELECT * FROM categories ORDER BY type, name").all() as Category[];
  });

  app.post<{ Body: CreateCategoryBody }>("/api/categories", async (req, reply) => {
    const { name, type, color } = req.body;
    if (!name?.trim() || (type !== "expense" && type !== "income")) {
      return reply.code(400).send({ error: "name and a valid type are required" });
    }
    try {
      const result = db
        .prepare("INSERT INTO categories (name, type, color) VALUES (?, ?, ?)")
        .run(name.trim(), type, color ?? null);
      const category = db
        .prepare("SELECT * FROM categories WHERE id = ?")
        .get(result.lastInsertRowid) as Category;
      return reply.code(201).send(category);
    } catch {
      return reply.code(409).send({ error: "category already exists for this type" });
    }
  });

  app.patch<{ Params: { id: string }; Body: UpdateCategoryBody }>(
    "/api/categories/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as
        | Category
        | undefined;
      if (!existing) return reply.code(404).send({ error: "not found" });

      const name = req.body.name?.trim() ?? existing.name;
      const color = req.body.color ?? existing.color;
      db.prepare("UPDATE categories SET name = ?, color = ? WHERE id = ?").run(name, color, id);
      return db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Category;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/categories/:id", async (req, reply) => {
    db.prepare("DELETE FROM categories WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });
}
