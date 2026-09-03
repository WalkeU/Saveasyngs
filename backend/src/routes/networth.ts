import type { FastifyInstance } from "fastify";
import { logActivity } from "../activity.js";
import { db } from "../db.js";

function computeNetWorth() {
  const totals = db
    .prepare("SELECT type, SUM(amount) AS total FROM transactions GROUP BY type")
    .all() as { type: string; total: number }[];
  const income = totals.find((t) => t.type === "income")?.total ?? 0;
  const expense = totals.find((t) => t.type === "expense")?.total ?? 0;
  const savings = totals.find((t) => t.type === "savings")?.total ?? 0;

  const liquidCalculated = income - expense - savings;

  const override = db.prepare("SELECT value FROM liquid_override WHERE id = 1").get() as
    | { value: number | null }
    | undefined;
  const liquidIsManual = override?.value !== null && override?.value !== undefined;
  const liquid = liquidIsManual ? (override as { value: number }).value : liquidCalculated;

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

  return { liquid, liquidCalculated, liquidIsManual, buckets, netWorth };
}

export async function networthRoutes(app: FastifyInstance) {
  app.get("/api/networth", async () => computeNetWorth());

  app.patch<{ Body: { value?: number | null } }>("/api/networth/liquid", async (req, reply) => {
    const value = req.body.value ?? null;
    if (value !== null && typeof value !== "number") {
      return reply.code(400).send({ error: "value must be a number or null" });
    }
    db.prepare(
      `INSERT INTO liquid_override (id, value, updated_at) VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(value);
    logActivity(
      "liquid.override",
      value === null
        ? "Szabad (liquid) pénz visszaállítva automatikus számolásra"
        : `Szabad (liquid) pénz beállítva: ${Math.round(value)} Ft`,
    );
    return computeNetWorth();
  });
}
