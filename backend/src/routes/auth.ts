import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { logActivity } from "../activity.js";
import {
  AUTH_ENABLED,
  clearSessionCookie,
  needsSetup,
  setPassword,
  setSessionCookie,
  isAuthenticated,
  verifyPassword,
} from "../auth.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/api/auth/status", async (req) => {
    return {
      authRequired: AUTH_ENABLED,
      authenticated: isAuthenticated(req),
      needsSetup: needsSetup(),
    };
  });

  // rate-limited in its own scope so a brute-force attempt (login) or
  // spamming (setup) can't be retried as fast as the rest of the API allows
  await app.register(async (scoped) => {
    await scoped.register(rateLimit, { max: 10, timeWindow: "5 minutes" });

    scoped.post<{ Body: { password?: string } }>("/api/auth/setup", async (req, reply) => {
      if (!AUTH_ENABLED || !needsSetup()) {
        return reply.code(409).send({ error: "már be van állítva a jelszó" });
      }
      const password = req.body?.password ?? "";
      if (password.length < 4) {
        return reply.code(400).send({ error: "a jelszó legyen legalább 4 karakter" });
      }
      await setPassword(password);
      setSessionCookie(reply);
      logActivity("auth.setup", "Jelszó beállítva");
      return { authenticated: true };
    });

    scoped.post<{ Body: { password?: string } }>("/api/auth/login", async (req, reply) => {
      const ok = await verifyPassword(req.body?.password ?? "");
      if (!ok) return reply.code(401).send({ error: "hibás jelszó" });
      setSessionCookie(reply);
      return { authenticated: true };
    });

    // behind the global auth guard (not a public path) — only reachable
    // with a valid session already, but still rate-limited against
    // currentPassword brute-forcing
    scoped.post<{ Body: { currentPassword?: string; newPassword?: string } }>(
      "/api/auth/change-password",
      async (req, reply) => {
        const newPassword = req.body?.newPassword ?? "";
        if (newPassword.length < 4) {
          return reply.code(400).send({ error: "az új jelszó legyen legalább 4 karakter" });
        }
        const ok = await verifyPassword(req.body?.currentPassword ?? "");
        if (!ok) return reply.code(401).send({ error: "hibás a jelenlegi jelszó" });
        await setPassword(newPassword);
        logActivity("auth.change_password", "Jelszó módosítva");
        return { ok: true };
      },
    );
  });

  app.post("/api/auth/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return reply.code(204).send();
  });
}
