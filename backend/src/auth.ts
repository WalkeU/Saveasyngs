import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "./db.js";

// auth is entirely opt-in: leave AUTH_ENABLED unset and the app behaves
// exactly as before (no login, relies on network-level access control e.g.
// a VPN). Set it and the app asks you to set a password the first time you
// open it (POST /api/auth/setup); every /api/* route except /api/health
// and /api/auth/* requires a session established via POST /api/auth/login
// from then on. The password itself lives in auth_config, not the
// environment, so it can be changed later from Beállítások.
export const AUTH_ENABLED = process.env.AUTH_ENABLED === "true" || Boolean(process.env.AUTH_PASSWORD_HASH);

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getPasswordHash(): string | null {
  const row = db.prepare("SELECT password_hash FROM auth_config WHERE id = 1").get() as
    | { password_hash: string | null }
    | undefined;
  return row?.password_hash ?? null;
}

export function needsSetup(): boolean {
  return AUTH_ENABLED && getPasswordHash() === null;
}

export async function verifyPassword(password: string): Promise<boolean> {
  if (!AUTH_ENABLED) return true;
  const hash = getPasswordHash();
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function setPassword(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 12);
  db.prepare(
    `INSERT INTO auth_config (id, password_hash, updated_at) VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at`,
  ).run(hash);
}

// the session holds no data beyond "this request came from someone who
// knows the password" — there's nothing secret in it, so a signed
// (tamper-proof) cookie is enough; it doesn't need to be encrypted
export function isAuthenticated(req: FastifyRequest): boolean {
  if (!AUTH_ENABLED) return true;
  const raw = req.cookies[SESSION_COOKIE];
  return Boolean(raw && req.unsignCookie(raw).valid);
}

export function setSessionCookie(reply: FastifyReply): void {
  reply.setCookie(SESSION_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    // the bundled prod Caddyfile serves plain HTTP by default — flip
    // COOKIE_SECURE=true once real TLS terminates in front of it,
    // otherwise the browser silently drops this cookie
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: SESSION_MAX_AGE,
    signed: true,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}
