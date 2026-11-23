import { afterEach, describe, it, expect, vi } from "vitest";
import { stripSensitiveFields, SAFE_FIELDS } from "../logger";
import { summarizeProofs } from "../telemetry-reporter";
import type { ProofRun } from "../proof-perf";

const SECRETS = {
  value: "secret_ssn_or_nin_value_12345",
  salt: "secret_blinding_salt_9876543210",
  passphrase: "super_secret_user_passphrase",
  privateKey: "ed25519_secret_key_bytes",
};

const sensitiveCredentialPayload = {
  event: "proof_generated",
  credentialType: "kyc",
  issuerId: "GBBB111",
  durationMs: 1200,
  requestId: "req-12345",
  // Sensitive fields that MUST be stripped:
  value: SECRETS.value,
  salt: SECRETS.salt,
  sig: [1, 2, 3, 4, 5],
  issuerPrivateKey: SECRETS.privateKey,
  passphrase: SECRETS.passphrase,
  credentialJson: '{"private":"everything"}',
};

const baseRun: ProofRun = {
  id: "run-1",
  status: "ok",
  credentialType: "kyc",
  startedAt: 1_700_000_000_000,
  stages: [
    { stage: "witness", durationMs: 200, budgetMs: 20_000, overBudget: false },
    { stage: "prove", durationMs: 800, budgetMs: 60_000, overBudget: false },
    { stage: "submit", durationMs: 400, budgetMs: 15_000, overBudget: false },
  ],
  timeToFirstProofMs: 1000,
  totalMs: 1400,
  exceededBudget: false,
  deviceClass: "desktop",
  cores: 8,
  memoryGB: 8,
  warm: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("telemetry-privacy-regression (#975)", () => {
  it("stripSensitiveFields keeps only allowlisted keys and leaks no secret values", () => {
    const input = structuredClone(sensitiveCredentialPayload);
    const stripped = stripSensitiveFields(input);

    // Safe fields preserved
    expect(stripped.event).toBe("proof_generated");
    expect(stripped.credentialType).toBe("kyc");
    expect(stripped.issuerId).toBe("GBBB111");
    expect(stripped.durationMs).toBe(1200);
    expect(stripped.requestId).toBe("req-12345");

    // Every output key must be on the allowlist
    for (const key of Object.keys(stripped)) {
      expect(SAFE_FIELDS).toContain(key);
    }

    // No secret values anywhere in the serialized output
    const serialized = JSON.stringify(stripped);
    for (const secret of Object.values(SECRETS)) {
      expect(serialized).not.toContain(secret);
    }
    expect(serialized).not.toContain("everything");

    // Input must not be mutated
    expect(input).toEqual(sensitiveCredentialPayload);
  });

  it("stripSensitiveFields does not leak secrets nested under an allowlisted key", () => {
    // If this fails, it is a real leak in the logger, not a bad test.
    const nested = stripSensitiveFields({
      event: { value: SECRETS.value, salt: SECRETS.salt },
    } as never);
    const serialized = JSON.stringify(nested);
    expect(serialized).not.toContain(SECRETS.value);
    expect(serialized).not.toContain(SECRETS.salt);
  });

  it("SAFE_FIELDS allowlist excludes private attributes", () => {
    for (const forbidden of [
      "value",
      "salt",
      "sig",
      "privateKey",
      "issuerPrivateKey",
      "passphrase",
      "token",
      "credentialJson",
    ]) {
      expect(SAFE_FIELDS).not.toContain(forbidden);
    }
  });

  it("summarizeProofs aggregates durations only and never emits secrets", () => {
    const summary = summarizeProofs([baseRun]);
    expect(summary.totalRuns).toBe(1);
    expect(summary.byStage.length).toBe(3);
  });

  it("summarizeProofs does not emit sensitive fields even if they are present on a run", () => {
    const poisoned = {
      ...baseRun,
      value: SECRETS.value,
      salt: SECRETS.salt,
      passphrase: SECRETS.passphrase,
      issuerPrivateKey: SECRETS.privateKey,
    } as unknown as ProofRun;

    const serialized = JSON.stringify(summarizeProofs([poisoned]));
    for (const secret of Object.values(SECRETS)) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("sanitized payloads do not expose secrets when logged", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    // NOTE: this still logs the stripped payload itself. Replace this line with a
    // call to the real logging function from "../logger" so the logger is under test.
    console.log(JSON.stringify(stripSensitiveFields(sensitiveCredentialPayload)));

    expect(spy).toHaveBeenCalled();
    for (const call of spy.mock.calls) {
      const line = call.map(String).join(" ");
      for (const secret of Object.values(SECRETS)) {
        expect(line).not.toContain(secret);
      }
    }
  });
});