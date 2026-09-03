import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { SavingsBucket } from "../types.js";

interface CreateBody {
  name: string;
  color?: string;
  icon?: string;
}

interface UpdateBody {
  name?: string;
  color?: string;
  icon?: string;
  note?: string | null;
  manualValue?: number | null;
}

export async function bucketRoutes(app: FastifyInstance) {
  app.get("/api/buckets", async () => {
    return db.prepare("SELECT * FROM savings_buckets ORDER BY sort_order, name").all() as SavingsBucket[];
  });

  app.post<{ Body: CreateBody }>("/api/buckets", async (req, reply) => {
    const { name, color, icon } = req.body;
    if (!name?.trim()) {
      return reply.code(400).send({ error: "name is required" });
    }
    try {
      const { maxOrder } = db
        .prepare("SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM savings_buckets")
        .get() as { maxOrder: number };
      const result = db
        .prepare("INSERT INTO savings_buckets (name, color, icon, sort_order) VALUES (?, ?, ?, ?)")
        .run(name.trim(), color ?? null, icon ?? null, maxOrder + 1);
      const bucket = db
        .prepare("SELECT * FROM savings_buckets WHERE id = ?")
        .get(result.lastInsertRowid) as SavingsBucket;
      return reply.code(201).send(bucket);
    } catch {
      return reply.code(409).send({ error: "a bucket with this name already exists" });
    }
  });

  app.patch<{ Params: { id: string }; Body: UpdateBody }>("/api/buckets/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM savings_buckets WHERE id = ?").get(id) as
      | SavingsBucket
      | undefined;
    if (!existing) return reply.code(404).send({ error: "not found" });

    const name = req.body.name?.trim() ?? existing.name;
    const color = req.body.color ?? existing.color;
    const icon = req.body.icon ?? existing.icon;
    const note = req.body.note !== undefined ? req.body.note : existing.note;
    const manualValue =
      req.body.manualValue !== undefined ? req.body.manualValue : existing.manual_value;
    db.prepare(
      "UPDATE savings_buckets SET name = ?, color = ?, icon = ?, note = ?, manual_value = ? WHERE id = ?",
    ).run(name, color, icon, note, manualValue, id);
    return db.prepare("SELECT * FROM savings_buckets WHERE id = ?").get(id) as SavingsBucket;
  });

  app.delete<{ Params: { id: string } }>("/api/buckets/:id", async (req, reply) => {
    db.prepare("DELETE FROM savings_buckets WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });
}
