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

    const allBuckets = db
      .prepare("SELECT id, name, color, icon, manual_value FROM savings_buckets ORDER BY sort_order, name")
      .all() as {
      id: number;
      name: string;
      color: string | null;
      icon: string | null;
      manual_value: number | null;
    }[];

    const transferSums = db
      .prepare(
        `SELECT bucket_id, SUM(amount) AS total
         FROM transactions
         WHERE type = 'savings' AND bucket_id IS NOT NULL
         GROUP BY bucket_id`,
      )
      .all() as { bucket_id: number; total: number }[];
    const transferSumById = new Map(transferSums.map((t) => [t.bucket_id, t.total]));

    // a bucket with a manual_value (mark-to-market override, e.g. for
    // stocks that move on their own) reports that instead of the raw
    // transfer sum; buckets without one just report what was transferred in
    const buckets = allBuckets
      .map((b) => ({
        bucket_id: b.id,
        bucket_name: b.name,
        bucket_color: b.color,
        bucket_icon: b.icon,
        total: b.manual_value ?? transferSumById.get(b.id) ?? 0,
        isManual: b.manual_value !== null,
      }))
      .filter((b) => b.total !== 0 || b.isManual)
      .sort((a, b) => b.total - a.total);

    const netWorth = liquid + buckets.reduce((sum, b) => sum + b.total, 0);

    return { liquid, buckets, netWorth };
  });
}
