import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import { loadConfig, parseCorsOrigins } from "./config";

const originalEnv = { ...process.env };

const clearConfigEnv = () => {
  for (const key of [
    "DB_DRIVER", "STELLAR_NETWORK", "HORIZON_URL", "RPC_URL",
    "NETWORK_PASSPHRASE", "PROOF_REGISTRY_CONTRACT_ID", "SQLITE_PATH",
    "DATABASE_URL", "POLL_INTERVAL_SECONDS", "START_LEDGER", "PORT",
    "FINALITY_LAG", "CORS_ALLOWED_ORIGINS", "CORS_ORIGIN",
    "RATE_LIMIT_WINDOW_SECONDS", "RATE_LIMIT_MAX", "RATE_LIMIT_MAX_REQUESTS",
    "RATE_LIMIT_ENABLED", "WEBHOOK_SIGNING_SECRET",
    "INTEGRITY_CHECK_INTERVAL_SECONDS", "INTEGRITY_CHECK_SAMPLE_SIZE",
    "INTEGRITY_CHECK_ENABLED", "HTTP_RETRY_JITTER_RATIO",
    "HTTP_MAX_ATTEMPTS", "HTTP_RETRY_BASE_MS", "HTTP_RETRY_MAX_DELAY_MS",
    "HTTP_BREAKER_FAILURE_THRESHOLD", "HTTP_BREAKER_RESET_MS",
    "HTTP_REQUEST_TIMEOUT_MS",
  ]) delete process.env[key];
  process.env.NODE_ENV = "test";
  process.env.PROOF_REGISTRY_CONTRACT_ID = "C".repeat(56);
};

beforeEach(clearConfigEnv);
afterAll(() => {
  process.env = { ...originalEnv };
});

describe("parseCorsOrigins", () => {
  it("uses localhost in non-production when no origins are configured", () => {
    process.env.NODE_ENV = "test";
    expect(parseCorsOrigins()).toEqual(["http://localhost:3000"]);
    expect(parseCorsOrigins("   ")).toEqual(["http://localhost:3000"]);
  });

  it("defaults to deny-all in production when no origins are configured", () => {
    process.env.NODE_ENV = "production";
    expect(parseCorsOrigins()).toEqual([]);
  });

  it("trims comma-separated origins and drops empty entries", () => {
    expect(parseCorsOrigins(" https://a.example, ,https://b.example ")).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
  });
});

describe("loadConfig", () => {
  it("loads safe defaults for a testnet SQLite deployment", () => {
    const config = loadConfig();
    expect(config).toMatchObject({
      stellarNetwork: "testnet",
      dbDriver: "sqlite",
      sqlitePath: "./data/indexer.db",
      rateLimitWindowMs: 60_000,
      rateLimitMax: 120,
      rateLimitEnabled: true,
      integrityCheckEnabled: true,
      integrityCheckIntervalMs: 900_000,
      integrityCheckSampleSize: 25,
    });
    expect(config.httpClient?.retry).toEqual({
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 8_000,
      jitterRatio: 0.2,
    });
  });

  it("requires the proof registry contract id", () => {
    delete process.env.PROOF_REGISTRY_CONTRACT_ID;
    expect(() => loadConfig()).toThrow(/PROOF_REGISTRY_CONTRACT_ID/);
  });

  it("rejects unsupported database drivers", () => {
    process.env.DB_DRIVER = "mysql";
    expect(() => loadConfig()).toThrow(/DB_DRIVER must be/);
  });

  it("accepts PostgreSQL and configured deployment values", () => {
    process.env.DB_DRIVER = "postgres";
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/indexer";
    process.env.SQLITE_PATH = "/tmp/ignored.db";
    process.env.POLL_INTERVAL_SECONDS = "2";
    process.env.START_LEDGER = "42";
    process.env.PORT = "4000";
    process.env.FINALITY_LAG = "9";
    process.env.RATE_LIMIT_WINDOW_SECONDS = "30";
    process.env.RATE_LIMIT_MAX = "25";
    process.env.RATE_LIMIT_ENABLED = "false";
    process.env.INTEGRITY_CHECK_ENABLED = "false";
    process.env.INTEGRITY_CHECK_INTERVAL_SECONDS = "120";
    process.env.INTEGRITY_CHECK_SAMPLE_SIZE = "7.9";
    process.env.CORS_ALLOWED_ORIGINS = "https://a.example,https://b.example";
    const config = loadConfig();
    expect(config).toMatchObject({
      dbDriver: "postgres",
      databaseUrl: "postgres://user:pass@localhost:5432/indexer",
      pollIntervalMs: 2_000,
      startLedger: 42,
      port: 4000,
      finalityLag: 9,
      rateLimitWindowMs: 30_000,
      rateLimitMax: 25,
      rateLimitEnabled: false,
      integrityCheckEnabled: false,
      integrityCheckIntervalMs: 120_000,
      integrityCheckSampleSize: 7,
      corsOrigins: ["https://a.example", "https://b.example"],
    });
  });

  it("rejects an unsupported Stellar network", () => {
    process.env.STELLAR_NETWORK = "devnet";
    expect(() => loadConfig()).toThrow(/STELLAR_NETWORK must be one of/);
  });

  it("accepts explicit matching testnet endpoint overrides", () => {
    process.env.HORIZON_URL = "https://horizon-testnet.stellar.org";
    process.env.RPC_URL = "https://soroban-testnet.stellar.org";
    process.env.NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    const config = loadConfig();
    expect(config.horizonUrl).toBe(process.env.HORIZON_URL);
    expect(config.rpcUrl).toBe(process.env.RPC_URL);
    expect(config.networkPassphrase).toBe(process.env.NETWORK_PASSPHRASE);
  });

  it("rejects a short webhook signing secret and trims a valid one", () => {
    process.env.WEBHOOK_SIGNING_SECRET = " too-short ";
    expect(() => loadConfig()).toThrow(/at least 32 characters/);
    process.env.WEBHOOK_SIGNING_SECRET = "  " + "s".repeat(32) + "  ";
    expect(loadConfig().webhookSigningSecret).toBe("s".repeat(32));
  });

  it("falls back from invalid rate-limit and integrity values", () => {
    process.env.RATE_LIMIT_WINDOW_SECONDS = "NaN";
    process.env.RATE_LIMIT_MAX = "0";
    process.env.INTEGRITY_CHECK_INTERVAL_SECONDS = "-1";
    process.env.INTEGRITY_CHECK_SAMPLE_SIZE = "Infinity";
    const config = loadConfig();
    expect(config.rateLimitWindowMs).toBe(60_000);
    expect(config.rateLimitMax).toBe(120);
    expect(config.integrityCheckIntervalMs).toBe(900_000);
    expect(config.integrityCheckSampleSize).toBe(25);
  });

  it("uses RATE_LIMIT_MAX_REQUESTS when RATE_LIMIT_MAX is absent", () => {
    process.env.RATE_LIMIT_MAX_REQUESTS = "17";
    expect(loadConfig().rateLimitMax).toBe(17);
  });

  it("clamps retry and breaker integer settings to documented bounds", () => {
    process.env.HTTP_MAX_ATTEMPTS = "99";
    process.env.HTTP_RETRY_BASE_MS = "-4";
    process.env.HTTP_RETRY_MAX_DELAY_MS = "999999";
    process.env.HTTP_BREAKER_FAILURE_THRESHOLD = "0";
    process.env.HTTP_BREAKER_RESET_MS = "1";
    process.env.HTTP_REQUEST_TIMEOUT_MS = "999999";
    const retry = loadConfig().httpClient!;
    expect(retry.retry).toEqual({
      maxAttempts: 10,
      baseDelayMs: 0,
      maxDelayMs: 120_000,
      jitterRatio: 0.2,
    });
    expect(retry.breaker).toEqual({
      failureThreshold: 1,
      resetTimeoutMs: 1_000,
    });
    expect(retry.timeoutMs).toBe(300_000);
  });

  it("floors finite integer settings and falls back for non-finite values", () => {
    process.env.HTTP_MAX_ATTEMPTS = "2.9";
    process.env.HTTP_RETRY_BASE_MS = "NaN";
    process.env.HTTP_RETRY_JITTER_RATIO = "not-a-number";
    const retry = loadConfig().httpClient!;
    expect(retry.retry.maxAttempts).toBe(2);
    expect(retry.retry.baseDelayMs).toBe(500);
    expect(retry.retry.jitterRatio).toBe(0.2);
  });

  it("clamps jitter ratio at both ends", () => {
    process.env.HTTP_RETRY_JITTER_RATIO = "-2";
    expect(loadConfig().httpClient?.retry.jitterRatio).toBe(0);
    process.env.HTTP_RETRY_JITTER_RATIO = "2";
    expect(loadConfig().httpClient?.retry.jitterRatio).toBe(1);
  });

  it("uses the legacy CORS_ORIGIN variable when the plural variable is absent", () => {
    process.env.CORS_ORIGIN = "https://legacy.example";
    expect(loadConfig().corsOrigins).toEqual(["https://legacy.example"]);
  });
});
