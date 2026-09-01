import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { Transaction, TransactionType } from "../types.js";

interface ListQuery {
  type?: TransactionType;
  categoryId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: string;
  offset?: string;
}

interface CreateBody {
  type: TransactionType;
  amount: number;
  description?: string;
  categoryId?: number | null;
  date: string;
}

interface UpdateBody {
  amount?: number;
  description?: string;
  categoryId?: number | null;
  date?: string;
}

export async function transactionRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ListQuery }>("/api/transactions", async (req) => {
    const { type, categoryId, q, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const offset = Number(req.query.offset ?? 0);

    const where: string[] = [];
    const params: unknown[] = [];

    if (type) {
      where.push("type = ?");
      params.push(type);
    }
    if (categoryId === "none") {
      where.push("category_id IS NULL");
    } else if (categoryId) {
      where.push("category_id = ?");
      params.push(Number(categoryId));
    }
    if (q) {
      where.push("description LIKE ? COLLATE NOCASE");
      params.push(`%${q}%`);
    }
    if (from) {
      where.push("date >= ?");
      params.push(from);
    }
    if (to) {
      where.push("date <= ?");
      params.push(to);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
      .prepare(
        `SELECT transactions.*, categories.name AS category_name, categories.color AS category_color
         FROM transactions
         LEFT JOIN categories ON categories.id = transactions.category_id
         ${whereSql}
         ORDER BY date DESC, transactions.id DESC
         LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);
    const total = (
      db.prepare(`SELECT COUNT(*) AS count FROM transactions ${whereSql}`).get(...params) as {
        count: number;
      }
    ).count;

    return { rows, total, limit, offset };
  });

  app.post<{ Body: CreateBody }>("/api/transactions", async (req, reply) => {
    const { type, amount, description, categoryId, date } = req.body;
    if ((type !== "expense" && type !== "income") || !amount || amount <= 0 || !date) {
      return reply.code(400).send({ error: "type, positive amount and date are required" });
    }
    const result = db
      .prepare(
        `INSERT INTO transactions (type, amount, description, category_id, date, source)
         VALUES (?, ?, ?, ?, ?, 'manual')`,
      )
      .run(type, amount, description?.trim() ?? "", categoryId ?? null, date);
    const transaction = db
      .prepare("SELECT * FROM transactions WHERE id = ?")
      .get(result.lastInsertRowid) as Transaction;
    return reply.code(201).send(transaction);
  });

  app.patch<{ Params: { id: string }; Body: UpdateBody }>(
    "/api/transactions/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      const existing = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as
        | Transaction
        | undefined;
      if (!existing) return reply.code(404).send({ error: "not found" });

      const amount = req.body.amount ?? existing.amount;
      const description = req.body.description?.trim() ?? existing.description;
      const categoryId =
        req.body.categoryId !== undefined ? req.body.categoryId : existing.category_id;
      const date = req.body.date ?? existing.date;

      db.prepare(
        "UPDATE transactions SET amount = ?, description = ?, category_id = ?, date = ? WHERE id = ?",
      ).run(amount, description, categoryId, date, id);
      return db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as Transaction;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/transactions/:id", async (req, reply) => {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });
}
