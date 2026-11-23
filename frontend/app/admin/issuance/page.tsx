"use client";

import { useActionState } from "react";
import { loginAction, type LoginResult } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(loginAction, {});

  return (
    <form action={formAction} style={{ display: "grid", gap: "0.5rem", maxWidth: 320 }}>
      <label>
        Your name <input name="name" autoComplete="name" maxLength={64} required />
      </label>
      <label>
        Admin key{" "}
        <input name="key" type="password" autoComplete="current-password" required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state.error && (
        <p role="alert" style={{ color: "crimson" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
import { getAdminSession } from "@/lib/admin-page-auth";
import { listIssuanceQueue, type QueueStatusFilter } from "@/lib/issuance-queue";
import { LoginForm } from "./components/LoginForm";
import { QueueTable } from "./components/QueueTable";

export const dynamic = "force-dynamic";

const STATUSES: QueueStatusFilter[] = ["all", "pending", "failed", "resolved"];
const MAX_FILTER_LEN = 100;
const clean = (v?: string) => v?.trim().slice(0, MAX_FILTER_LEN) || undefined;

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
  const q = clean(params.q);

  let records;
  try {
    records = listIssuanceQueue({ status, provider, search: q });
  } catch (err) {
    console.error("issuance queue load failed", err);
    return <p role="alert">Couldn't load the issuance queue. Try again, or check the server logs.</p>;
  }

  // Send only what the table renders, not full internal records.
  const rows = records.map(toQueueRowView); // define next to QueueTable

  return (
    <section aria-labelledby="issuance-heading">
      <h2 id="issuance-heading" style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
        Issuance Queue
      </h2>
      <form method="get" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <select name="status" defaultValue={status} aria-label="Status">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input name="provider" aria-label="Provider" placeholder="Provider"
               defaultValue={provider ?? ""} maxLength={MAX_FILTER_LEN} />
        <input name="q" aria-label="Event ID or type" placeholder="Event ID / type"
               defaultValue={q ?? ""} maxLength={MAX_FILTER_LEN} />
        <button type="submit">Filter</button>
      </form>
      <QueueTable initialRecords={rows} />
    </section>
  );
}
