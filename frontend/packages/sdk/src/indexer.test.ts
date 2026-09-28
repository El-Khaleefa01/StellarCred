import { beforeEach, describe, expect, it, vi } from "vitest";

const isVerified = vi.fn();
const checkClaim = vi.fn();
const fetchMock = vi.fn();

vi.mock("../../proof-registry/src/index", () => ({
  Client: vi.fn(function ProofRegistryClient() {
    return {
      is_verified: isVerified,
      check_claim: checkClaim,
    };
  }),
}));

vi.mock("@stellar/stellar-sdk", () => ({
  rpc: {},
  StrKey: {
    isValidEd25519PublicKey: vi.fn(
      (address: string) => address === "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    ),
  },
}));

import {
  configure,
  getClaim,
  getClaims,
  hasClaim,
  hasClaims,
  resetConfig,
} from "./claims";

const WALLET = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function mockIndexer(claims: unknown[]) {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ wallet: WALLET, claims }),
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("optional indexer claim reads", () => {
  beforeEach(() => {
    isVerified.mockReset();
    checkClaim.mockReset();
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    resetConfig();
  });

  it("keeps chain reads as the default when no indexer is configured", async () => {
    isVerified.mockResolvedValue({ result: [true, 1_700_000_000n, 1_900_000_000n] });

    await expect(hasClaim(WALLET, "kyc")).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isVerified).toHaveBeenCalled();
  });

  it("uses indexed public data in explicit cache mode", async () => {
    mockIndexer([
      {
        id: 2,
        wallet: WALLET,
        credential_type: "kyc",
        issuer: "GISSUER",
        verified_at: 1_700_000_000,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        ledger_sequence: 123,
        threshold: null,
        revoked: 0,
      },
    ]);

    configure({
      indexer: {
        url: "https://indexer.example",
        mode: "cache",
      },
    });

    await expect(hasClaim(WALLET, "kyc")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isVerified).not.toHaveBeenCalled();
  });

  it("supports threshold and issuer filtering in cache mode", async () => {
    mockIndexer([
      {
        id: 3,
        wallet: WALLET,
        credential_type: "age",
        issuer: "GISSUER",
        verified_at: 1_700_000_000,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        ledger_sequence: 123,
        threshold: 18,
        revoked: 0,
      },
    ]);

    configure({
      indexer: {
        url: "https://indexer.example",
        mode: "cache",
      },
    });

    await expect(
      hasClaim(WALLET, "age", {
        minThreshold: 21,
        trustedIssuers: ["GOTHER"],
      }),
    ).resolves.toBe(false);

    expect(isVerified).not.toHaveBeenCalled();
  });

  it("confirms indexer-backed answers on-chain in verify mode", async () => {
    mockIndexer([
      {
        id: 4,
        wallet: WALLET,
        credential_type: "kyc",
        issuer: "GISSUER",
        verified_at: 1_700_000_000,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        ledger_sequence: 123,
        threshold: null,
        revoked: 0,
      },
    ]);
    isVerified.mockResolvedValue({ result: [true, 1_700_000_000n, 1_900_000_000n] });

    configure({
      indexer: {
        url: "https://indexer.example",
        mode: "verify",
      },
    });

    await expect(hasClaim(WALLET, "kyc")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isVerified).toHaveBeenCalledTimes(1);
  });

  it("returns active indexed claims in cache mode", async () => {
    mockIndexer([
      {
        id: 1,
        wallet: WALLET,
        credential_type: "kyc",
        issuer: "GISSUER",
        verified_at: 1_700_000_000,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        ledger_sequence: 123,
        threshold: null,
        revoked: 0,
      },
      {
        id: 2,
        wallet: WALLET,
        credential_type: "age",
        issuer: "GISSUER",
        verified_at: 1_700_000_100,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        ledger_sequence: 124,
        threshold: 18,
        revoked: 0,
      },
      {
        id: 3,
        wallet: WALLET,
        credential_type: "funds",
        issuer: "GISSUER",
        verified_at: 1_700_000_200,
        expiry: Math.floor(Date.now() / 1000) - 1,
        ledger_sequence: 125,
        threshold: 100,
        revoked: 0,
      },
    ]);

    configure({
      indexer: {
        url: "https://indexer.example",
        mode: "cache",
      },
    });

    await expect(getClaims(WALLET)).resolves.toEqual([
      { type: "kyc", verifiedAt: 1_700_000_000, expiry: expect.any(Number) },
      { type: "age", verifiedAt: 1_700_000_100, expiry: expect.any(Number) },
    ]);
  });

  it("supports batched cache reads without chain calls", async () => {
    mockIndexer([
      {
        id: 1,
        wallet: WALLET,
        credential_type: "kyc",
        issuer: "GISSUER",
        verified_at: 1_700_000_000,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        ledger_sequence: 123,
        threshold: null,
        revoked: 0,
      },
    ]);

    configure({
      indexer: {
        url: "https://indexer.example",
        mode: "cache",
      },
    });

    await expect(hasClaims(WALLET, ["kyc", "age"])).resolves.toEqual({
      kyc: true,
      age: false,
    });
    expect(isVerified).not.toHaveBeenCalled();
  });

  it("returns full claim data from the indexer in cache mode", async () => {
    mockIndexer([
      {
        id: 9,
        wallet: WALLET,
        credential_type: "kyc",
        issuer: "GISSUER",
        verified_at: 1_700_000_000,
        expiry: Math.floor(Date.now() / 1000) + 3600,
        ledger_sequence: 123,
        threshold: null,
        revoked: 0,
      },
    ]);

    configure({
      indexer: {
        url: "https://indexer.example",
        mode: "cache",
      },
    });

    await expect(getClaim(WALLET, "kyc")).resolves.toMatchObject({
      valid: true,
      verifiedAt: 1_700_000_000,
    });
  });
});
