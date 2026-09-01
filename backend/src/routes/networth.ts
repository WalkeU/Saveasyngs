import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import type { NetWorthOpening } from "../types.js";

interface OpeningBody {
  openingLiquid: number;
  openingDate?: string;
}

export async function networthRoutes(app: FastifyInstance) {
  app.get("/api/networth", async () => {
    const opening = (db.prepare("SELECT * FROM net_worth_opening WHERE id = 1").get() as
      | NetWorthOpening
      | undefined) ?? { id: 1 as const, opening_liquid: 0, opening_date: new Date().toISOString().slice(0, 10) };

    const totals = db
      .prepare("SELECT type, SUM(amount) AS total FROM transactions GROUP BY type")
      .all() as { type: string; total: number }[];
    const income = totals.find((t) => t.type === "income")?.total ?? 0;
    const expense = totals.find((t) => t.type === "expense")?.total ?? 0;
    const savings = totals.find((t) => t.type === "savings")?.total ?? 0;

    const liquid = opening.opening_liquid + income - expense - savings;

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

    return { opening, liquid, buckets, netWorth };
  });

  app.post<{ Body: OpeningBody }>("/api/networth/opening", async (req, reply) => {
    const { openingLiquid, openingDate } = req.body;
    if (typeof openingLiquid !== "number" || Number.isNaN(openingLiquid)) {
      return reply.code(400).send({ error: "openingLiquid must be a number" });
    }
    db.prepare(
      `INSERT INTO net_worth_opening (id, opening_liquid, opening_date)
       VALUES (1, ?, COALESCE(?, date('now')))
       ON CONFLICT(id) DO UPDATE SET
         opening_liquid = excluded.opening_liquid,
         opening_date = excluded.opening_date`,
    ).run(openingLiquid, openingDate ?? null);
    return db.prepare("SELECT * FROM net_worth_opening WHERE id = 1").get();
  });
}
