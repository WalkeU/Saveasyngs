import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { categoryRoutes } from "./routes/categories.js";
import { ruleRoutes } from "./routes/rules.js";
import { transactionRoutes } from "./routes/transactions.js";
import { importRoutes } from "./routes/import.js";
import { reportRoutes } from "./routes/reports.js";
import { legacyImportRoutes } from "./routes/legacy-import.js";
import { configRoutes } from "./routes/config.js";
import { networthRoutes } from "./routes/networth.js";
import { recurringRoutes } from "./routes/recurring.js";

const app = Fastify({ logger: true });

await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

await app.register(healthRoutes);
await app.register(categoryRoutes);
await app.register(ruleRoutes);
await app.register(transactionRoutes);
await app.register(importRoutes);
await app.register(reportRoutes);
await app.register(configRoutes);
await app.register(networthRoutes);
await app.register(recurringRoutes);

// off by default: a one-off backfill tool for a specific legacy export,
// not part of the normal product surface
if (process.env.ENABLE_LEGACY_CATEGORY_IMPORT === "true") {
  await app.register(legacyImportRoutes);
}

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
