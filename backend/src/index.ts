import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import { categoryRoutes } from "./routes/categories.js";
import { ruleRoutes } from "./routes/rules.js";
import { transactionRoutes } from "./routes/transactions.js";
import { importRoutes } from "./routes/import.js";
import { reportRoutes } from "./routes/reports.js";

const app = Fastify({ logger: true });

await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

await app.register(healthRoutes);
await app.register(categoryRoutes);
await app.register(ruleRoutes);
await app.register(transactionRoutes);
await app.register(importRoutes);
await app.register(reportRoutes);

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
