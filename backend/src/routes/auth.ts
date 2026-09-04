import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { AUTH_ENABLED, clearSessionCookie, isAuthenticated, setSessionCookie, verifyPassword } from "../auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/status", async (req) => {
    return { authRequired: AUTH_ENABLED, authenticated: isAuthenticated(req) };
  });

  // rate-limited in its own scope so a brute-force attempt can't be retried
  // as fast as the rest of the API allows
  await app.register(async (scoped) => {
    await scoped.register(rateLimit, { max: 10, timeWindow: "5 minutes" });

    scoped.post<{ Body: { password?: string } }>("/api/auth/login", async (req, reply) => {
      const ok = await verifyPassword(req.body?.password ?? "");
      if (!ok) return reply.code(401).send({ error: "hibás jelszó" });
      setSessionCookie(reply);
      return { authenticated: true };
    });
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return reply.code(204).send();
  });
}
