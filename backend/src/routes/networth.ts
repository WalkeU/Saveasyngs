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
           savings_buckets.id AS bucket_id,
           savings_buckets.name AS bucket_name,
           savings_buckets.color AS bucket_color,
           savings_buckets.icon AS bucket_icon,
           SUM(transactions.amount) AS total
         FROM transactions
         JOIN savings_buckets ON savings_buckets.id = transactions.bucket_id
         WHERE transactions.type = 'savings'
         GROUP BY savings_buckets.id
         ORDER BY total DESC`,
      )
      .all() as {
      bucket_id: number;
      bucket_name: string;
      bucket_color: string | null;
      bucket_icon: string | null;
      total: number;
    }[];

    const netWorth = liquid + buckets.reduce((sum, b) => sum + b.total, 0);

    return { liquid, buckets, netWorth };
  });
}
