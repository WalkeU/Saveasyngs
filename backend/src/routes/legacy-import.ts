import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { parseAmount, parseCsv, parseDate } from "../csv.js";
import type { Category, Transaction } from "../types.js";

async function readMultipartFile(req: {
  parts: () => AsyncIterableIterator<{ type: string; toBuffer?: () => Promise<Buffer> }>;
}): Promise<Buffer | null> {
  for await (const part of req.parts()) {
    if (part.type === "file" && part.toBuffer) return part.toBuffer();
  }
  return null;
}

/**
 * One-off backfill for a previous budgeting app's export
 * (Account,Date,Payee,Notes,Category_Group,Category,Amount,Split_Amount,Cleared,
 * as in All-Accounts.csv). For each row with a Category, finds the
 * already-imported transaction with the same date + type + amount and, only
 * if that transaction has no category yet, applies a category of the same
 * name (exact match, case-insensitive, same type). Never creates
 * transactions or categories, never overwrites an existing assignment, and
 * skips ambiguous matches (more than one transaction on the same day for
 * the same amount) rather than guessing.
 *
 * Disabled unless ENABLE_LEGACY_CATEGORY_IMPORT=true (see index.ts).
 */
export async function legacyImportRoutes(app: FastifyInstance) {
  app.post("/api/import/legacy-categorize", async (req, reply) => {
    const fileBuffer = await readMultipartFile(req);
    if (!fileBuffer) return reply.code(400).send({ error: "file is required" });

    const { rows } = parseCsv(fileBuffer);

    const categories = db.prepare("SELECT * FROM categories").all() as Category[];
    const categoryIdByKey = new Map(
      categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c.id]),
    );

    const findMatches = db.prepare(
      "SELECT * FROM transactions WHERE date = ? AND type = ? AND ABS(amount - ?) < 0.01",
    );
    const applyCategory = db.prepare("UPDATE transactions SET category_id = ? WHERE id = ?");

    const summary = {
      total: rows.length,
      applied: 0,
      alreadyCategorized: 0,
      noTransactionMatch: 0,
      ambiguousMatch: 0,
      noCategoryMatch: 0,
      emptyCategory: 0,
      invalidRow: 0,
    };

    const run = db.transaction((csvRows: Record<string, string>[]) => {
      for (const row of csvRows) {
        const categoryName = (row["Category"] ?? "").trim();
        if (!categoryName) {
          summary.emptyCategory++;
          continue;
        }

        const dateIso = parseDate(row["Date"] ?? "");
        const amount = parseAmount(row["Amount"] ?? "");
        if (!dateIso || amount === null || amount === 0) {
          summary.invalidRow++;
          continue;
        }

        const type = amount < 0 ? "expense" : "income";
        const absAmount = Math.abs(amount);

        const matches = findMatches.all(dateIso, type, absAmount) as Transaction[];
        if (matches.length === 0) {
          summary.noTransactionMatch++;
          continue;
        }
        if (matches.length > 1) {
          summary.ambiguousMatch++;
          continue;
        }

        const transaction = matches[0];
        if (transaction.category_id !== null) {
          summary.alreadyCategorized++;
          continue;
        }

        const categoryId = categoryIdByKey.get(`${type}:${categoryName.toLowerCase()}`);
        if (!categoryId) {
          summary.noCategoryMatch++;
          continue;
        }

        applyCategory.run(categoryId, transaction.id);
        summary.applied++;
      }
    });
    run(rows);

    return summary;
  });
}
