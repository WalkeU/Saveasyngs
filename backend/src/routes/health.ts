import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    const row = db.prepare("SELECT sqlite_version() AS version").get() as { version: string };
    return { status: "ok", sqliteVersion: row.version };
  });
}
