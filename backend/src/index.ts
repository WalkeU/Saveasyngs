import { randomBytes } from "node:crypto";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { AUTH_ENABLED, isAuthenticated } from "./auth.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { categoryRoutes } from "./routes/categories.js";
import { ruleRoutes } from "./routes/rules.js";
import { transactionRoutes } from "./routes/transactions.js";
import { importRoutes } from "./routes/import.js";
import { reportRoutes } from "./routes/reports.js";
import { legacyImportRoutes } from "./routes/legacy-import.js";
import { configRoutes } from "./routes/config.js";
import { networthRoutes } from "./routes/networth.js";
import { recurringRoutes } from "./routes/recurring.js";
import { bucketRoutes } from "./routes/buckets.js";
import { settingsRoutes } from "./routes/settings.js";
import { historyRoutes } from "./routes/history.js";

if (AUTH_ENABLED && !process.env.SESSION_KEY) {
  console.error(
    "AUTH_PASSWORD_HASH is set but SESSION_KEY is missing. Generate one with:\n" +
      `  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n` +
      "and set it as the SESSION_KEY environment variable.",
  );
  process.exit(1);
}
// when auth is disabled, the session cookie is never set or checked, so an
// ephemeral secret (thrown away on restart) is fine here
const sessionSecret = process.env.SESSION_KEY ?? randomBytes(32).toString("hex");

const app = Fastify({ logger: true });

await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
await app.register(cookie, { secret: sessionSecret });

const PUBLIC_PATHS = ["/api/health", "/api/auth/status", "/api/auth/login", "/api/auth/logout"];
app.addHook("onRequest", async (req, reply) => {
  if (!AUTH_ENABLED) return;
  const path = req.url.split("?")[0];
  if (PUBLIC_PATHS.includes(path)) return;
  if (!isAuthenticated(req)) {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(categoryRoutes);
await app.register(ruleRoutes);
await app.register(transactionRoutes);
await app.register(importRoutes);
await app.register(reportRoutes);
await app.register(configRoutes);
await app.register(networthRoutes);
await app.register(recurringRoutes);
await app.register(bucketRoutes);
await app.register(settingsRoutes);
await app.register(historyRoutes);

// off by default: a one-off backfill tool for a specific legacy export,
// not part of the normal product surface
if (process.env.ENABLE_LEGACY_CATEGORY_IMPORT === "true") {
  await app.register(legacyImportRoutes);
}

const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: "0.0.0.0" });
