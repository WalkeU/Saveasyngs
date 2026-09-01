import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { defaultCategories } from "../default-categories.js";
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

interface MoveBody {
  direction: "up" | "down";
}

export async function categoryRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { type?: TransactionType } }>("/api/categories", async (req) => {
    const { type } = req.query;
    if (type) {
      return db
        .prepare("SELECT * FROM categories WHERE type = ? ORDER BY sort_order, name")
        .all(type) as Category[];
    }
    return db
      .prepare("SELECT * FROM categories ORDER BY type, sort_order, name")
      .all() as Category[];
  });

  app.post<{ Body: CreateCategoryBody }>("/api/categories", async (req, reply) => {
    const { name, type, color } = req.body;
    if (!name?.trim() || (type !== "expense" && type !== "income")) {
      return reply.code(400).send({ error: "name and a valid type are required" });
    }
    try {
      const { maxOrder } = db
        .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM categories WHERE type = ?")
        .get(type) as { maxOrder: number };
      const result = db
        .prepare("INSERT INTO categories (name, type, color, sort_order) VALUES (?, ?, ?, ?)")
        .run(name.trim(), type, color ?? null, maxOrder + 1);
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

  app.post<{ Params: { id: string }; Body: MoveBody }>(
    "/api/categories/:id/move",
    async (req, reply) => {
      const id = Number(req.params.id);
      const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as
        | Category
        | undefined;
      if (!category) return reply.code(404).send({ error: "not found" });

      const neighbor = db
        .prepare(
          `SELECT * FROM categories WHERE type = ? AND
             ${req.body.direction === "up" ? "sort_order < ? ORDER BY sort_order DESC" : "sort_order > ? ORDER BY sort_order ASC"}
           LIMIT 1`,
        )
        .get(category.type, category.sort_order) as Category | undefined;

      if (neighbor) {
        const swap = db.transaction(() => {
          db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").run(
            neighbor.sort_order,
            category.id,
          );
          db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").run(
            category.sort_order,
            neighbor.id,
          );
        });
        swap();
      }

      return db
        .prepare("SELECT * FROM categories WHERE type = ? ORDER BY sort_order, name")
        .all(category.type) as Category[];
    },
  );

  app.delete<{ Params: { id: string } }>("/api/categories/:id", async (req, reply) => {
    db.prepare("DELETE FROM categories WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });

  // wipes every category (custom ones included) and reseeds the fixed
  // default taxonomy; transactions keep their data, category_id falls back
  // to null (ON DELETE SET NULL), and any rules pointing at a removed
  // category are cascade-deleted with it
  app.post("/api/categories/reset", async () => {
    const insertCategory = db.prepare(
      "INSERT INTO categories (name, type, sort_order) VALUES (@name, @type, @sortOrder)",
    );
    const reset = db.transaction(() => {
      db.exec("DELETE FROM categories");
      const nextOrder: Record<string, number> = { expense: 0, income: 0 };
      for (const category of defaultCategories) {
        const sortOrder = nextOrder[category.type]++;
        insertCategory.run({ ...category, sortOrder });
      }
    });
    reset();
    return db.prepare("SELECT * FROM categories ORDER BY type, sort_order, name").all() as Category[];
  });
}
