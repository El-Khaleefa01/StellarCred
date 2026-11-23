// frontend/lib/admin-page-auth.ts
//
// Server-side admin gate for admin pages and server actions (#850).
// Accepts ADMIN_API_KEY as a Bearer header or an expiring, signed httpOnly
// session cookie. The raw API key is never stored in the cookie.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { verifyApiKey } from "@/lib/auth";

export const ADMIN_COOKIE = "admin_session";

type AdminSession = { actor: string; exp: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Create a signed cookie value with an absolute expiry timestamp. */
export async function createAdminSession({
  actor,
  ttlSeconds,
}: {
  actor: string;
  ttlSeconds: number;
}): Promise<string> {
  const secret = process.env.ADMIN_API_KEY;
  const normalizedActor = actor.trim().slice(0, 64);
  if (!secret || !normalizedActor || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("Cannot create admin session with invalid configuration");
  }

  const payload = Buffer.from(
    JSON.stringify({ actor: normalizedActor, exp: Date.now() + ttlSeconds * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const secret = process.env.ADMIN_API_KEY;
  if (!secret) return null;

  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AdminSession>;
    if (
      typeof parsed.actor !== "string" ||
      !parsed.actor.trim() ||
      typeof parsed.exp !== "number" ||
      !Number.isFinite(parsed.exp) ||
      Date.now() >= parsed.exp
    ) {
      return null;
    }
    return { actor: parsed.actor, exp: parsed.exp };
  } catch {
    return null;
  }
}

export async function isAdminPageAuthorized(): Promise<boolean> {
  const requestHeaders = await headers();
  const bearer = requestHeaders.get("authorization")?.replace(/^Bearer\\s+/i, "") ?? null;
  if (verifyApiKey(bearer, process.env.ADMIN_API_KEY)) return true;
  return (await getAdminSession()) !== null;
}
