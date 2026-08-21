import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const LOCAL_SESSION_COOKIE = "costbook_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = { sub: string; exp: number };

const toBase64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url");
const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

function sessionSecret() {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 32) return null;
  return value;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function signSession(userId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("APP_SESSION_SECRET must be set to a 32+ character value");
  const payload: SessionPayload = { sub: userId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySession(token?: string): SessionPayload | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const [encoded, provided] = token.split(".");
  if (!encoded || !provided) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;
    return typeof payload.sub === "string" && Number.isInteger(payload.exp) && payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export function localSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}
