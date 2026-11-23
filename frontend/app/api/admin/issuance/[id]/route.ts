import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/_middleware";
import { retryIssuance, resolveIssuance } from "@/lib/issuance-queue";
import { auditLogAppend, auditLogBootstrap, auditLogPersist } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

const MAX_ID_LEN = 128;
const MAX_ACTOR_LEN = 64;

function parseId(raw: string): string | null {
  try {
    const id = decodeURIComponent(raw);
    return id && id.length <= MAX_ID_LEN ? id : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "body must be a JSON object" }, { status: 400 });
  }
  const { action, actor: rawActor } = body as { action?: unknown; actor?: unknown };

  const actor =
    typeof rawActor === "string"
      ? rawActor.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_ACTOR_LEN)
      : "";
  if (!actor) return NextResponse.json({ error: "actor is required" }, { status: 400 });
  if (action !== "retry" && action !== "resolve") {
    return NextResponse.json({ error: "action must be retry or resolve" }, { status: 400 });
  }

  const { id: routeId } = await params;
  const id = parseId(routeId);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const result = action === "retry" ? await retryIssuance(id) : await resolveIssuance(id, actor);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.code === "not_found" ? 404 : 409 },
    );
  }

  try {
    await auditLogBootstrap();
    auditLogAppend({
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
      issuer: `api:${actor}`, // claimed by caller, not verified
      commitment: id,
      adminAction: `issuance_${action}`,
    });
    await auditLogPersist();
  } catch (err) {
    console.error("audit log failure", { id, action, err });
  }

  return NextResponse.json({ record: result.record });
}