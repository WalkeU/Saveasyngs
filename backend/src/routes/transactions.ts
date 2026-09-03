import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { Transaction, TransactionType } from "../types.js";

interface ListQuery {
  type?: TransactionType;
  categoryId?: string;
  bucketId?: string;
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
  bucketId?: number | null;
  date: string;
}

interface UpdateBody {
  type?: TransactionType;
  amount?: number;
  description?: string;
  categoryId?: number | null;
  bucketId?: number | null;
  date?: string;
}

export async function transactionRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ListQuery }>("/api/transactions", async (req) => {
    const { type, categoryId, bucketId, q, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit ?? 100), 1000);
    const offset = Number(req.query.offset ?? 0);

    const where: string[] = [];
    const params: unknown[] = [];

    if (type) {
      where.push("transactions.type = ?");
      params.push(type);
    }
    if (categoryId === "none") {
      where.push(
        "((transactions.type = 'savings' AND transactions.bucket_id IS NULL) OR (transactions.type != 'savings' AND transactions.category_id IS NULL))",
      );
    } else if (categoryId) {
      where.push("category_id = ?");
      params.push(Number(categoryId));
    }
    if (bucketId) {
      where.push("bucket_id = ?");
      params.push(Number(bucketId));
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
        `SELECT transactions.*,
                categories.name AS category_name, categories.color AS category_color,
                buckets.name AS bucket_name, buckets.color AS bucket_color, buckets.icon AS bucket_icon
         FROM transactions
         LEFT JOIN categories ON categories.id = transactions.category_id
         LEFT JOIN savings_buckets buckets ON buckets.id = transactions.bucket_id
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
    const { type, amount, description, date } = req.body;
    if ((type !== "expense" && type !== "income" && type !== "savings") || !amount || amount <= 0 || !date) {
      return reply.code(400).send({ error: "type, positive amount and date are required" });
    }
    const isSavings = type === "savings";
    const categoryId = isSavings ? null : req.body.categoryId ?? null;
    const bucketId = isSavings ? req.body.bucketId ?? null : null;

    const insert = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO transactions (type, amount, description, category_id, bucket_id, date, source)
           VALUES (?, ?, ?, ?, ?, ?, 'manual')`,
        )
        .run(type, amount, description?.trim() ?? "", categoryId, bucketId, date);

      // a bucket with a manual mark-to-market value (stocks, crypto, ...)
      // keeps reporting that value, not the raw transfer sum — so a new
      // transfer into it needs to add onto that value to stay accurate
      if (isSavings && bucketId) {
        db.prepare(
          "UPDATE savings_buckets SET manual_value = manual_value + ? WHERE id = ? AND manual_value IS NOT NULL",
        ).run(amount, bucketId);
      }

      return result.lastInsertRowid;
    });
    const id = insert();
    const transaction = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as Transaction;
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

      const type = req.body.type ?? existing.type;
      const amount = req.body.amount ?? existing.amount;
      const description = req.body.description?.trim() ?? existing.description;
      const date = req.body.date ?? existing.date;

      const isSavings = type === "savings";
      const categoryId = isSavings
        ? null
        : req.body.categoryId !== undefined
          ? req.body.categoryId
          : existing.category_id;
      const bucketId = isSavings
        ? req.body.bucketId !== undefined
          ? req.body.bucketId
          : existing.bucket_id
        : null;

      db.prepare(
        "UPDATE transactions SET type = ?, amount = ?, description = ?, category_id = ?, bucket_id = ?, date = ? WHERE id = ?",
      ).run(type, amount, description, categoryId, bucketId, date, id);
      return db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as Transaction;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/transactions/:id", async (req, reply) => {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });
}
