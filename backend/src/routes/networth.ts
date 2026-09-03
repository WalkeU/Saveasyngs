import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

export async function networthRoutes(app: FastifyInstance) {
  app.get("/api/networth", async () => {
    const totals = db
      .prepare("SELECT type, SUM(amount) AS total FROM transactions GROUP BY type")
      .all() as { type: string; total: number }[];
    const income = totals.find((t) => t.type === "income")?.total ?? 0;
    const expense = totals.find((t) => t.type === "expense")?.total ?? 0;
    const savings = totals.find((t) => t.type === "savings")?.total ?? 0;

    const liquid = income - expense - savings;

    const buckets = db
      .prepare(
        `SELECT
           categories.id AS category_id,
           categories.name AS category_name,
           categories.color AS category_color,
           categories.icon AS category_icon,
           SUM(transactions.amount) AS total
         FROM transactions
         JOIN categories ON categories.id = transactions.category_id
         WHERE transactions.type = 'savings'
         GROUP BY categories.id
         ORDER BY total DESC`,
      )
      .all() as {
      category_id: number;
      category_name: string;
      category_color: string | null;
      category_icon: string | null;
      total: number;
    }[];

    const netWorth = liquid + buckets.reduce((sum, b) => sum + b.total, 0);

    return { liquid, buckets, netWorth };
  });
}
