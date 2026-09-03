import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

function getSettings() {
  const row = db.prepare("SELECT decimal_places FROM app_settings WHERE id = 1").get() as {
    decimal_places: number;
  };
  return { decimalPlaces: row.decimal_places };
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/api/settings", async () => getSettings());

  app.patch<{ Body: { decimalPlaces?: number } }>("/api/settings", async (req, reply) => {
    const { decimalPlaces } = req.body;
    if (
      typeof decimalPlaces !== "number" ||
      !Number.isInteger(decimalPlaces) ||
      decimalPlaces < 0 ||
      decimalPlaces > 6
    ) {
      return reply.code(400).send({ error: "decimalPlaces must be an integer between 0 and 6" });
    }
    db.prepare(
      "UPDATE app_settings SET decimal_places = ?, updated_at = datetime('now') WHERE id = 1",
    ).run(decimalPlaces);
    return getSettings();
  });
}
