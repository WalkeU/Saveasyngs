import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { guessMapping, parseAmount, parseCsv, parseDate } from "../csv.js";
import { matchCategory } from "../rules-engine.js";
import type { ImportProfile } from "../types.js";

async function readMultipart(req: {
  parts: () => AsyncIterableIterator<{
    type: string;
    fieldname: string;
    value?: unknown;
    toBuffer?: () => Promise<Buffer>;
  }>;
}) {
  let fileBuffer: Buffer | null = null;
  let filename: string | null = null;
  const fields: Record<string, string> = {};
  for await (const part of req.parts()) {
    if (part.type === "file" && part.toBuffer) {
      fileBuffer = await part.toBuffer();
      filename = (part as { filename?: string }).filename ?? "import.csv";
    } else {
      fields[part.fieldname] = String(part.value ?? "");
    }
  }
  return { fileBuffer, filename, fields };
}

export async function importRoutes(app: FastifyInstance) {
  app.post("/api/import/preview", async (req, reply) => {
    const { fileBuffer } = await readMultipart(req);
    if (!fileBuffer) return reply.code(400).send({ error: "file is required" });

    const { headers, rows } = parseCsv(fileBuffer);
    if (headers.length === 0) {
      return reply.code(400).send({ error: "could not read any columns from the file" });
    }

    const headerSignature = headers.join("|");
    const profile = db
      .prepare("SELECT * FROM import_profiles WHERE header_signature = ?")
      .get(headerSignature) as ImportProfile | undefined;

    const mapping = profile
      ? { date: profile.date_column, description: profile.description_column, amount: profile.amount_column }
      : guessMapping(headers);

    return {
      headers,
      sampleRows: rows.slice(0, 5),
      rowCount: rows.length,
      headerSignature,
      mapping,
      knownProfile: profile ? profile.name : null,
    };
  });

  app.post("/api/import/commit", async (req, reply) => {
    const { fileBuffer, filename, fields } = await readMultipart(req);
    if (!fileBuffer) return reply.code(400).send({ error: "file is required" });

    const { dateColumn, descriptionColumn, amountColumn } = fields;
    if (!dateColumn || !descriptionColumn || !amountColumn) {
      return reply
        .code(400)
        .send({ error: "dateColumn, descriptionColumn and amountColumn are required" });
    }

    const { headers, rows } = parseCsv(fileBuffer);
    const headerSignature = headers.join("|");

    if (fields.saveProfile === "true") {
      db.prepare(
        `INSERT INTO import_profiles (header_signature, name, date_column, description_column, amount_column)
         VALUES (@headerSignature, @name, @dateColumn, @descriptionColumn, @amountColumn)
         ON CONFLICT(header_signature) DO UPDATE SET
           name = excluded.name,
           date_column = excluded.date_column,
           description_column = excluded.description_column,
           amount_column = excluded.amount_column`,
      ).run({
        headerSignature,
        name: fields.profileName?.trim() || filename || "Import",
        dateColumn,
        descriptionColumn,
        amountColumn,
      });
    }

    const rules = db
      .prepare("SELECT pattern, category_id FROM category_rules WHERE enabled = 1")
      .all() as { pattern: string; category_id: number }[];

    const insertTransaction = db.prepare(
      `INSERT OR IGNORE INTO transactions (type, amount, description, category_id, date, source, import_hash)
       VALUES (?, ?, ?, ?, ?, 'import', ?)`,
    );

    let imported = 0;
    const duplicateRows: { date: string; description: string; amount: number; type: string }[] = [];
    const skippedRows: { date: string; description: string; amount: string; reason: string }[] = [];

    const run = db.transaction((csvRows: Record<string, string>[]) => {
      for (const row of csvRows) {
        const rawDate = row[dateColumn] ?? "";
        const rawAmount = row[amountColumn] ?? "";
        const description = (row[descriptionColumn] ?? "").trim();
        const amount = parseAmount(rawAmount);
        const dateIso = parseDate(rawDate);

        if (amount === null) {
          skippedRows.push({ date: rawDate, description, amount: rawAmount, reason: "érvénytelen összeg" });
          continue;
        }
        if (amount === 0) {
          skippedRows.push({ date: rawDate, description, amount: rawAmount, reason: "nulla összegű tétel" });
          continue;
        }
        if (!dateIso) {
          skippedRows.push({ date: rawDate, description, amount: rawAmount, reason: "érvénytelen dátum" });
          continue;
        }

        const type = amount < 0 ? "expense" : "income";
        const absAmount = Math.abs(amount);
        const hash = createHash("sha256")
          .update(`${dateIso}|${type}|${absAmount}|${description}`)
          .digest("hex");
        const categoryId = matchCategory(description, rules);

        const result = insertTransaction.run(
          type,
          absAmount,
          description,
          categoryId,
          dateIso,
          hash,
        );
        if (result.changes === 1) imported++;
        else duplicateRows.push({ date: dateIso, description, amount: absAmount, type });
      }
    });
    run(rows);

    return {
      total: rows.length,
      imported,
      duplicates: duplicateRows.length,
      skipped: skippedRows.length,
      duplicateRows,
      skippedRows,
    };
  });
}
