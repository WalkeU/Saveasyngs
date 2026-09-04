import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { RecurringPayment, TransactionType } from "../types.js";

interface CreateBody {
  type: TransactionType;
  amount: number;
  description?: string;
  categoryId?: number | null;
  bucketId?: number | null;
  dayOfMonth: number;
}

interface UpdateBody {
  type?: TransactionType;
  amount?: number;
  description?: string;
  categoryId?: number | null;
  bucketId?: number | null;
  dayOfMonth?: number;
  enabled?: boolean;
}

const SELECT_JOINED = `
  SELECT recurring_payments.*,
         categories.name AS category_name, categories.color AS category_color, categories.icon AS category_icon,
         buckets.name AS bucket_name, buckets.color AS bucket_color, buckets.icon AS bucket_icon
  FROM recurring_payments
  LEFT JOIN categories ON categories.id = recurring_payments.category_id
  LEFT JOIN savings_buckets buckets ON buckets.id = recurring_payments.bucket_id
`;

export async function recurringRoutes(app: FastifyInstance) {
  app.get("/api/recurring", async () => {
    return db.prepare(`${SELECT_JOINED} ORDER BY day_of_month, recurring_payments.id`).all();
  });

  app.get<{ Querystring: { month?: string } }>("/api/recurring/missing", async (req) => {
    const now = new Date();
    const month =
      req.query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const recurring = db
      .prepare(`${SELECT_JOINED} WHERE recurring_payments.enabled = 1 ORDER BY day_of_month, recurring_payments.id`)
      .all() as (RecurringPayment & {
      category_name: string | null;
      category_color: string | null;
      category_icon: string | null;
      bucket_name: string | null;
      bucket_color: string | null;
      bucket_icon: string | null;
    })[];

    const hasMatch = db.prepare(
      `SELECT 1 FROM transactions
       WHERE type = ? AND category_id IS ? AND bucket_id IS ? AND strftime('%Y-%m', date) = ?
       LIMIT 1`,
    );

    const missing = recurring.filter(
      (r) => !hasMatch.get(r.type, r.category_id, r.bucket_id, month),
    );

    return { month, missing };
  });

  // how much of a given month's actual expense/income the recurring items
  // would account for, if all of them happened — i.e. the nominal sum of
  // enabled recurring_payments per type, against that month's real total.
  // Not matched to individual transactions (a recurring item's category may
  // also collect unrelated one-off spending, which would make a per-
  // transaction match misleading) — this answers "how big a slice of a
  // typical month is already spoken for" instead.
  app.get<{ Querystring: { month?: string } }>("/api/recurring/share", async (req) => {
    const now = new Date();
    const month =
      req.query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const recurringTotals = db
      .prepare("SELECT type, SUM(amount) AS total FROM recurring_payments WHERE enabled = 1 GROUP BY type")
      .all() as { type: TransactionType; total: number }[];

    const monthTotals = db
      .prepare("SELECT type, SUM(amount) AS total FROM transactions WHERE strftime('%Y-%m', date) = ? GROUP BY type")
      .all(month) as { type: TransactionType; total: number }[];

    const byType = (list: { type: TransactionType; total: number }[], type: TransactionType) =>
      list.find((r) => r.type === type)?.total ?? 0;

    return {
      month,
      expense: { recurringTotal: byType(recurringTotals, "expense"), monthTotal: byType(monthTotals, "expense") },
      income: { recurringTotal: byType(recurringTotals, "income"), monthTotal: byType(monthTotals, "income") },
    };
  });

  app.post<{ Body: CreateBody }>("/api/recurring", async (req, reply) => {
    const { type, amount, description, dayOfMonth } = req.body;
    if (
      (type !== "expense" && type !== "income" && type !== "savings") ||
      !amount ||
      amount <= 0 ||
      !dayOfMonth ||
      dayOfMonth < 1 ||
      dayOfMonth > 31
    ) {
      return reply.code(400).send({ error: "type, positive amount and a valid dayOfMonth are required" });
    }
    const isSavings = type === "savings";
    const categoryId = isSavings ? null : req.body.categoryId ?? null;
    const bucketId = isSavings ? req.body.bucketId ?? null : null;

    const result = db
      .prepare(
        `INSERT INTO recurring_payments (type, amount, description, category_id, bucket_id, day_of_month)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(type, amount, description?.trim() ?? "", categoryId, bucketId, dayOfMonth);
    const created = db
      .prepare("SELECT * FROM recurring_payments WHERE id = ?")
      .get(result.lastInsertRowid) as RecurringPayment;
    return reply.code(201).send(created);
  });

  app.patch<{ Params: { id: string }; Body: UpdateBody }>(
    "/api/recurring/:id",
    async (req, reply) => {
      const id = Number(req.params.id);
      const existing = db.prepare("SELECT * FROM recurring_payments WHERE id = ?").get(id) as
        | RecurringPayment
        | undefined;
      if (!existing) return reply.code(404).send({ error: "not found" });

      const type = req.body.type ?? existing.type;
      const amount = req.body.amount ?? existing.amount;
      const description = req.body.description?.trim() ?? existing.description;
      const dayOfMonth = req.body.dayOfMonth ?? existing.day_of_month;
      const enabled =
        req.body.enabled === undefined ? existing.enabled : req.body.enabled ? 1 : 0;

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
        `UPDATE recurring_payments
         SET type = ?, amount = ?, description = ?, category_id = ?, bucket_id = ?, day_of_month = ?, enabled = ?
         WHERE id = ?`,
      ).run(type, amount, description, categoryId, bucketId, dayOfMonth, enabled, id);
      return db.prepare("SELECT * FROM recurring_payments WHERE id = ?").get(id) as RecurringPayment;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/recurring/:id", async (req, reply) => {
    db.prepare("DELETE FROM recurring_payments WHERE id = ?").run(Number(req.params.id));
    return reply.code(204).send();
  });
}
