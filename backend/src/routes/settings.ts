import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

function getSettings() {
  const row = db
    .prepare("SELECT decimal_places, transactions_batch_size FROM app_settings WHERE id = 1")
    .get() as { decimal_places: number; transactions_batch_size: number };
  return { decimalPlaces: row.decimal_places, transactionsBatchSize: row.transactions_batch_size };
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => getSettings());

  app.patch<{ Body: { decimalPlaces?: number; transactionsBatchSize?: number } }>(
    "/api/settings",
    async (req, reply) => {
      const { decimalPlaces, transactionsBatchSize } = req.body;
      const current = getSettings();

      const nextDecimalPlaces = decimalPlaces ?? current.decimalPlaces;
      if (!Number.isInteger(nextDecimalPlaces) || nextDecimalPlaces < 0 || nextDecimalPlaces > 6) {
        return reply.code(400).send({ error: "decimalPlaces must be an integer between 0 and 6" });
      }

      const nextBatchSize = transactionsBatchSize ?? current.transactionsBatchSize;
      if (!Number.isInteger(nextBatchSize) || nextBatchSize < 20 || nextBatchSize > 1000) {
        return reply
          .code(400)
          .send({ error: "transactionsBatchSize must be an integer between 20 and 1000" });
      }

      db.prepare(
        `UPDATE app_settings
         SET decimal_places = ?, transactions_batch_size = ?, updated_at = datetime('now')
         WHERE id = 1`,
      ).run(nextDecimalPlaces, nextBatchSize);
      return getSettings();
    },
  );
}
