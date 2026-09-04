import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";

// auth is entirely opt-in: unset AUTH_PASSWORD_HASH and the app behaves
// exactly as before (no login, relies on network-level access control e.g.
// a VPN) — set it and every /api/* route except /api/health and /api/auth/*
// requires a session established via POST /api/auth/login
export const AUTH_ENABLED = Boolean(process.env.AUTH_PASSWORD_HASH);

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function verifyPassword(password: string): Promise<boolean> {
  if (!AUTH_ENABLED) return true;
  return bcrypt.compare(password, process.env.AUTH_PASSWORD_HASH as string);
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
