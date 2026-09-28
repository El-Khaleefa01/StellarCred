// @stellarcred/sdk — optional indexer-backed claim reads
//
// The indexer is a cache of public on-chain data. It is intentionally kept
// separate from the ProofRegistry client so callers must explicitly choose
// whether they accept cached data or want an on-chain trust anchor.

export interface IndexerClaim {
  id: number;
  wallet: string;
  credential_type: string;
  issuer: string;
  verified_at: number;
  expiry: number;
  ledger_sequence: number;
  threshold: number | null;
  revoked: number;
}

export class IndexerError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "IndexerError";
    this.status = status;
  }
}

export async function fetchIndexerClaims(
  indexerUrl: string,
  wallet: string,
  timeoutMs: number,
): Promise<IndexerClaim[]> {
  const base = indexerUrl.trim().replace(/\\/$/, "");
  if (!base) {
    throw new IndexerError("Indexer URL is required when indexer-backed reads are enabled");
  }

  const url = new URL("/claims", base);
  url.searchParams.set("wallet", wallet);

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : undefined;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new IndexerError(
        `Indexer request failed with HTTP ${response.status}`,
        response.status,
      );
    }

    const body = (await response.json()) as unknown;
    if (
      !body ||
      typeof body !== "object" ||
      !Array.isArray((body as { claims?: unknown }).claims)
    ) {
      throw new IndexerError("Indexer returned an invalid claims response");
    }

    return (body as { claims: unknown[] }).claims.map(parseIndexerClaim);
  } catch (error) {
    if (error instanceof IndexerError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new IndexerError(`Indexer request timed out after ${timeoutMs}ms`);
    }
    throw new IndexerError(
      `Indexer request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function parseIndexerClaim(value: unknown): IndexerClaim {
  if (!value || typeof value !== "object") {
    throw new IndexerError("Indexer returned an invalid claim record");
  }

  const row = value as Record<string, unknown>;
  const requiredStrings = ["wallet", "credential_type", "issuer"];
  for (const key of requiredStrings) {
    if (typeof row[key] !== "string") {
      throw new IndexerError(`Indexer returned an invalid claim field: ${key}`);
    }
  }

  const numberFields = [
    "id",
    "verified_at",
    "expiry",
    "ledger_sequence",
    "revoked",
  ];
  for (const key of numberFields) {
    if (typeof row[key] !== "number" || !Number.isFinite(row[key])) {
      throw new IndexerError(`Indexer returned an invalid claim field: ${key}`);
    }
  }

  if (
    row.threshold !== null &&
    (typeof row.threshold !== "number" || !Number.isFinite(row.threshold))
  ) {
    throw new IndexerError("Indexer returned an invalid claim field: threshold");
  }

  return {
    id: row.id as number,
    wallet: row.wallet as string,
    credential_type: row.credential_type as string,
    issuer: row.issuer as string,
    verified_at: row.verified_at as number,
    expiry: row.expiry as number,
    ledger_sequence: row.ledger_sequence as number,
    threshold: row.threshold as number | null,
    revoked: row.revoked as number,
  };
}
