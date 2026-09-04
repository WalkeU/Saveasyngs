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
             categories.icon AS category_icon,
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

  app.get<{ Querystring: { month?: string } }>(
    "/api/reports/monthly-comparison",
    async (req) => {
      const now = new Date();
      const month =
        req.query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [year, monthNum] = month.split("-").map(Number);
      const prevDate = new Date(year, monthNum - 2, 1);
      const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

      const rows = db
        .prepare(
          `SELECT
             categories.id AS category_id,
             COALESCE(categories.name, 'Kategorizálatlan') AS category_name,
             categories.color AS category_color,
             categories.icon AS category_icon,
             SUM(CASE WHEN strftime('%Y-%m', date) = ? THEN amount ELSE 0 END) AS current,
             SUM(CASE WHEN strftime('%Y-%m', date) = ? THEN amount ELSE 0 END) AS previous,
             SUM(amount) AS total
           FROM transactions
           LEFT JOIN categories ON categories.id = transactions.category_id
           WHERE transactions.type = 'expense'
           GROUP BY categories.id`,
        )
        .all(month, previousMonth) as {
        category_id: number | null;
        category_name: string;
        category_color: string | null;
        category_icon: string | null;
        current: number;
        previous: number;
        total: number;
      }[];

      const { monthCount } = db
        .prepare(
          "SELECT COUNT(DISTINCT strftime('%Y-%m', date)) AS monthCount FROM transactions WHERE transactions.type = 'expense'",
        )
        .get() as { monthCount: number };

      const categories = rows
        .filter((r) => r.current > 0 || r.previous > 0 || r.total > 0)
        .map((r) => ({
          category_id: r.category_id,
          category_name: r.category_name,
          category_color: r.category_color,
          category_icon: r.category_icon,
          current: r.current,
          previous: r.previous,
          delta: r.current - r.previous,
          deltaPercent: r.previous > 0 ? ((r.current - r.previous) / r.previous) * 100 : null,
          average: monthCount > 0 ? r.total / monthCount : 0,
        }))
        .sort((a, b) => b.current - a.current);

      return { month, previousMonth, monthCount, categories };
    },
  );

  app.get<{ Querystring: { type?: TransactionType; months?: string } }>(
    "/api/reports/monthly-by-category",
    async (req) => {
      const type: TransactionType = req.query.type === "income" ? "income" : "expense";
      const months = Math.min(Math.max(Number(req.query.months ?? 6) || 6, 1), 24);

      const rows = db
        .prepare(
          `SELECT
             strftime('%Y-%m', date) AS month,
             categories.id AS category_id,
             COALESCE(categories.name, 'Kategorizálatlan') AS category_name,
             categories.color AS category_color,
             SUM(transactions.amount) AS total
           FROM transactions
           LEFT JOIN categories ON categories.id = transactions.category_id
           WHERE transactions.type = ?
           GROUP BY month, categories.id
           ORDER BY month`,
        )
        .all(type) as {
        month: string;
        category_id: number | null;
        category_name: string;
        category_color: string | null;
        total: number;
      }[];

      const allMonths = [...new Set(rows.map((r) => r.month))].sort();
      const keepMonths = allMonths.slice(-months);
      const keepSet = new Set(keepMonths);
      const filtered = rows.filter((r) => keepSet.has(r.month));

      const categoryOrder = new Map<string, { category_id: number | null; name: string; color: string | null }>();
      for (const r of filtered) {
        const key = String(r.category_id);
        if (!categoryOrder.has(key)) {
          categoryOrder.set(key, { category_id: r.category_id, name: r.category_name, color: r.category_color });
        }
      }
      const categories = [...categoryOrder.values()];

      const data = keepMonths.map((month) => {
        const entry: Record<string, number | string> = { month };
        for (const cat of categories) entry[cat.name] = 0;
        for (const r of filtered) {
          if (r.month === month) entry[r.category_name] = r.total;
        }
        return entry;
      });

      return { months: keepMonths, categories, data };
    },
  );

  // category-by-month breakdown for a single month or a whole calendar
  // year, meant for the md export on Áttekintés — a plain "how much did I
  // spend on what" table, not tied to "last N months from now" like
  // monthly-by-category above
  app.get<{ Querystring: { type?: TransactionType; month?: string; year?: string } }>(
    "/api/reports/category-export",
    async (req) => {
      const type: TransactionType = req.query.type === "income" ? "income" : "expense";
      const { month, year } = req.query;

      let periods: string[];
      if (year && /^\d{4}$/.test(year)) {
        periods = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
      } else if (month && /^\d{4}-\d{2}$/.test(month)) {
        periods = [month];
      } else {
        const now = new Date();
        periods = [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`];
      }

      const [fy, fm] = periods[0].split("-").map(Number);
      const [ly, lm] = periods[periods.length - 1].split("-").map(Number);
      const lastDay = new Date(ly, lm, 0).getDate();
      const from = `${fy}-${String(fm).padStart(2, "0")}-01`;
      const to = `${ly}-${String(lm).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const rows = db
        .prepare(
          `SELECT
             categories.id AS category_id,
             COALESCE(categories.name, 'Kategorizálatlan') AS category_name,
             strftime('%Y-%m', date) AS month,
             SUM(transactions.amount) AS total
           FROM transactions
           LEFT JOIN categories ON categories.id = transactions.category_id
           WHERE transactions.type = ? AND date >= ? AND date <= ?
           GROUP BY categories.id, month`,
        )
        .all(type, from, to) as {
        category_id: number | null;
        category_name: string;
        month: string;
        total: number;
      }[];

      const categoryMap = new Map<
        string,
        { category_id: number | null; name: string; totals: Record<string, number> }
      >();
      for (const r of rows) {
        const key = String(r.category_id);
        if (!categoryMap.has(key)) {
          categoryMap.set(key, { category_id: r.category_id, name: r.category_name, totals: {} });
        }
        categoryMap.get(key)!.totals[r.month] = r.total;
      }

      const categories = [...categoryMap.values()]
        .map((c) => ({ ...c, total: Object.values(c.totals).reduce((s, v) => s + v, 0) }))
        .sort((a, b) => b.total - a.total);

      const periodTotals: Record<string, number> = {};
      for (const p of periods) {
        periodTotals[p] = categories.reduce((s, c) => s + (c.totals[p] ?? 0), 0);
      }
      const grandTotal = categories.reduce((s, c) => s + c.total, 0);

      return {
        scope: periods.length > 1 ? "year" : "month",
        type,
        periods,
        categories,
        periodTotals,
        grandTotal,
      };
    },
  );
}
