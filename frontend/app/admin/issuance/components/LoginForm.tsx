"use client";

import { useActionState } from "react";
import { loginAction, type LoginResult } from "../actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginResult, FormData>(
    loginAction,
    {},
  );

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
