"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, getAdminSession, createAdminSession } from "@/lib/admin-page-auth";
import { verifyApiKey } from "@/lib/auth";
import { auditLogAppend, auditLogBootstrap, auditLogPersist } from "@/lib/audit-log";
import { resolveIssuance, retryIssuance, type IssuanceQueueRecord } from "@/lib/issuance-queue";

export type IssuanceActionResult =
  | { success: true; record: IssuanceQueueRecord }
  | { success: false; error: string };

export type LoginResult = { error?: string };

const ACTIONS = ["retry", "resolve"] as const;
type QueueAction = (typeof ACTIONS)[number];

export async function loginAction(_prev: LoginResult, formData: FormData): Promise<LoginResult> {
  const key = String(formData.get("key") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 64);
  if (!name) return { error: "Name is required" };
  if (!verifyApiKey(key, process.env.ADMIN_API_KEY)) return { error: "Invalid key" };

  // Signed, expiring token containing { name, exp } — never the API key itself.
  const token = await createAdminSession({ actor: name, ttlSeconds: 60 * 60 * 8 });

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
  revalidatePath("/admin/issuance");
  return {};
}

export async function issuanceQueueAction(
  eventId: string,
  action: string,
): Promise<IssuanceActionResult> {
  const session = await getAdminSession(); // null if missing/invalid/expired
  if (!session) return { success: false, error: "unauthorized" };

  if (!ACTIONS.includes(action as QueueAction)) {
    return { success: false, error: "invalid action" };
  }
  if (typeof eventId !== "string" || eventId.length === 0 || eventId.length > 128) {
    return { success: false, error: "invalid event id" };
  }

  const result =
    action === "retry"
      ? await retryIssuance(eventId)
      : await resolveIssuance(eventId, session.actor);
  if (!result.ok) return { success: false, error: result.error };

  try {
    await auditLogBootstrap();
    auditLogAppend({
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
      issuer: session.actor, // server-derived, not client-supplied
      commitment: eventId,
      adminAction: `issuance_${action}`,
    });
    await auditLogPersist();
  } catch (err) {
    console.error("audit log failure", { eventId, action, err });
    // Decide policy: surface this to ops. Don't pretend nothing happened.
  }

  revalidatePath("/admin/issuance");
  return { success: true, record: result.record };
}