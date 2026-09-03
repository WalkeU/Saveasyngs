import type { FastifyInstance } from "fastify";
import { db } from "../db.js";

export async function historyRoutes(app: FastifyInstance) {
  app.get("/api/history", async () => {
    return db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 50").all();
  });
}
