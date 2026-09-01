import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { TransactionType } from "../types.js";

interface RangeQuery {
  from?: string;
  to?: string;
}

export async function reportRoutes(app: FastifyInstance) {
  app.get<{ Querystring: RangeQuery & { type?: TransactionType } }>(
    "/api/reports/by-category",
    async (req) => {
      const { from, to, type } = req.query;
      const where: string[] = [];
      const params: unknown[] = [];
      if (type) {
        where.push("transactions.type = ?");
        params.push(type);
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

      return db
        .prepare(
          `SELECT
             categories.id AS category_id,
             COALESCE(categories.name, 'Kategorizálatlan') AS category_name,
             categories.color AS category_color,
             transactions.type AS type,
             SUM(transactions.amount) AS total,
             COUNT(*) AS count
           FROM transactions
           LEFT JOIN categories ON categories.id = transactions.category_id
           ${whereSql}
           GROUP BY categories.id, transactions.type
           ORDER BY total DESC`,
        )
        .all(...params);
    },
  );

  app.get<{ Querystring: RangeQuery }>("/api/reports/summary", async (req) => {
    const { from, to } = req.query;
    const where: string[] = [];
    const params: unknown[] = [];
    if (from) {
      where.push("date >= ?");
      params.push(from);
    }
    if (to) {
      where.push("date <= ?");
      params.push(to);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totals = db
      .prepare(
        `SELECT type, SUM(amount) AS total FROM transactions ${whereSql} GROUP BY type`,
      )
      .all(...params) as { type: TransactionType; total: number }[];

    const byMonth = db
      .prepare(
        `SELECT strftime('%Y-%m', date) AS month, type, SUM(amount) AS total
         FROM transactions
         ${whereSql}
         GROUP BY month, type
         ORDER BY month`,
      )
      .all(...params);

    const income = totals.find((t) => t.type === "income")?.total ?? 0;
    const expense = totals.find((t) => t.type === "expense")?.total ?? 0;

    return { income, expense, net: income - expense, byMonth };
  });
}
