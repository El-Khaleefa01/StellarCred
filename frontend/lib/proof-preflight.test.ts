import { describe, expect, it } from "vitest";
import { preflightProofGate } from "./proof-preflight";
import type { Credential } from "./credential";

function credential(overrides: Partial<Credential> = {}): Credential {
  return {
    type: "income",
    title: "Income",
    claim: "income",
    issuer: "Issuer",
    issuerId: "GISSUER",
    holder: "GHOLDER",
    value: "250000",
    salt: "0x1",
    commitment: "0x2",
    sig: [],
    issuerPubX: [],
    issuerPubY: [],
    issuedAt: 1_000,
    expiry: "90 days",
    ...overrides,
  };
}

describe("preflightProofGate", () => {
  it("warns when a threshold cannot be satisfied", () => {
    const result = preflightProofGate(
      credential({ value: "100000", claimParams: { threshold: "200000" } }),
      1_000,
      20_000,
    );

    expect(result.satisfiable).toBe(false);
    expect(result.warnings.map((w) => w.code)).toContain("threshold");
    expect(result.warnings[0]?.message).toContain("200,000");
  });

  it("does not warn at the exact threshold", () => {
    const result = preflightProofGate(
      credential({ value: "200000", claimParams: { threshold: "200000" } }),
      1_000,
      20_000,
    );

    expect(result.satisfiable).toBe(true);
  });

  it("warns when a denylisted jurisdiction is used", () => {
    const result = preflightProofGate(
      credential({
        type: "jurisdiction",
        value: "840",
        claimParams: { restricted: ["840", "364"], mode: "0" },
      }),
      1_000,
      20_000,
    );

    expect(result.warnings.map((w) => w.code)).toContain("jurisdiction");
  });

  it("warns when an allowlisted jurisdiction is missing", () => {
    const result = preflightProofGate(
      credential({
        type: "jurisdiction",
        value: "566",
        claimParams: { restricted: ["840", "364"], mode: "1" },
      }),
      1_000,
      20_000,
    );

    expect(result.warnings.map((w) => w.code)).toContain("jurisdiction");
  });

  it("does not warn when an allowlisted jurisdiction is present", () => {
    const result = preflightProofGate(
      credential({
        type: "jurisdiction",
        value: "840",
        claimParams: { restricted: ["840", "364"], mode: "1" },
      }),
      1_000,
      20_000,
    );

    expect(result.satisfiable).toBe(true);
  });

  it("warns when the credential has expired", () => {
    const result = preflightProofGate(
      credential({ issuedAt: 1_000, expiry: "90 days" }),
      1_000 + 90 * 86_400,
      20_000,
    );

    expect(result.warnings.map((w) => w.code)).toContain("expired");
  });

  it("checks employment seniority", () => {
    const result = preflightProofGate(
      credential({
        type: "employment",
        value: "1",
        seniority: "2",
        claimParams: { threshold: "3" },
      }),
      1_000,
      20_000,
    );

    expect(result.warnings.map((w) => w.code)).toContain("threshold");
  });
});
