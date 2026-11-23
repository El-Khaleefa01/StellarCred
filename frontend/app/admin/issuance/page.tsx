/**
 * Admin issuance queue (#850) — Server Component.
 *
 * Queue data is gated server-side; unauthenticated visitors only receive the
 * sign-in form.
 */

import { getAdminSession } from "@/lib/admin-page-auth";
import { listIssuanceQueue, type QueueStatusFilter } from "@/lib/issuance-queue";
import { LoginForm } from "./components/LoginForm";
import { QueueTable } from "./components/QueueTable";

export const dynamic = "force-dynamic";

const STATUSES: QueueStatusFilter[] = ["all", "pending", "failed", "resolved"];
const MAX_FILTER_LEN = 100;
const clean = (value?: string) => value?.trim().slice(0, MAX_FILTER_LEN) || undefined;

export default async function AdminIssuancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; provider?: string; q?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) {
    return (
      <section aria-labelledby="issuance-login">
        <h2 id="issuance-login">Admin sign-in required</h2>
        <LoginForm />
      </section>
    );
  }

  const params = await searchParams;
  const status = STATUSES.includes(params.status as QueueStatusFilter)
    ? (params.status as QueueStatusFilter)
    : "all";
  const provider = clean(params.provider);
  const search = clean(params.q);

  let records;
  try {
    records = listIssuanceQueue({ status, provider, search });
  } catch (error) {
    console.error("issuance queue load failed", error);
    return <p role="alert">Could not load the issuance queue. Check the server logs.</p>;
  }

  return (
    <section aria-labelledby="issuance-heading">
      <h2 id="issuance-heading" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
        Issuance Queue
      </h2>
      <form method="get" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <label>
          Status
          <select name="status" defaultValue={status}>
            {STATUSES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Provider
          <input name="provider" placeholder="Provider" defaultValue={provider ?? ""} maxLength={MAX_FILTER_LEN} />
        </label>
        <label>
          Event ID or type
          <input name="q" placeholder="Event ID / type" defaultValue={search ?? ""} maxLength={MAX_FILTER_LEN} />
        </label>
        <button type="submit">Filter</button>
      </form>
      <QueueTable initialRecords={records} />
    </section>
  );
}
