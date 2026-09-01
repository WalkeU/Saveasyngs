import type { FastifyInstance } from "fastify";

export async function configRoutes(app: FastifyInstance) {
  app.get("/api/config", async () => {
    return {
      legacyCategoryImport: process.env.ENABLE_LEGACY_CATEGORY_IMPORT === "true",
    };
  });
}
