import type { Credential } from "./credential";

export type ProofGateWarningCode =
  | "expired"
  | "threshold"
  | "jurisdiction";

export interface ProofGateWarning {
  code: ProofGateWarningCode;
  message: string;
}

export interface ProofGatePreflight {
  warnings: ProofGateWarning[];
  satisfiable: boolean;
}

const DEFAULTS = {
  age: 18,
  income: 200000,
  funds: 10000,
  accreditation: 1000000,
  employment: 3,
  restricted: ["840", "364", "408"],
};

function ttlSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)?/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = (match[2] ?? "days").toLowerCase();
  const multiplier =
    unit.startsWith("week") ? 7 :
    unit.startsWith("month") ? 30 :
    unit.startsWith("year") ? 365 :
    1;

  return amount * multiplier * 86_400;
}

function numericParam(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Performs a best-effort local check of the same gate parameters the circuits
 * will enforce. The circuit remains authoritative; this only prevents an
 * obviously unsatisfiable proof from consuming the prover's expensive work.
 */
export function preflightProofGate(
  credential: Credential,
  nowSeconds = Math.floor(Date.now() / 1000),
  nowDays = Math.floor(Date.now() / 86_400_000),
): ProofGatePreflight {
  const warnings: ProofGateWarning[] = [];
  const expirySeconds = ttlSeconds(credential.expiry);

  if (
    expirySeconds > 0 &&
    credential.issuedAt + expirySeconds <= nowSeconds
  ) {
    warnings.push({
      code: "expired",
      message: "This credential has expired and cannot satisfy the gate.",
    });
  }

  const params = credential.claimParams ?? {};

  switch (credential.type) {
    case "age": {
      const threshold = numericParam(params.threshold_years, DEFAULTS.age);
      const dob = Number(credential.value);
      if (Number.isFinite(dob) && nowDays < dob + threshold * 365) {
        warnings.push({
          code: "threshold",
          message: `Your credential is below the requested age threshold of ${threshold} years.`,
        });
      }
      break;
    }
    case "income": {
      const threshold = numericParam(params.threshold, DEFAULTS.income);
      const value = Number(credential.value);
      if (Number.isFinite(value) && value < threshold) {
        warnings.push({
          code: "threshold",
          message: `Your income value is below the requested threshold of $${threshold.toLocaleString("en-US")}.`,
        });
      }
      break;
    }
    case "funds": {
      const threshold = numericParam(params.threshold, DEFAULTS.funds);
      const value = Number(credential.value);
      if (Number.isFinite(value) && value < threshold) {
        warnings.push({
          code: "threshold",
          message: `Your balance is below the requested threshold of $${threshold.toLocaleString("en-US")}.`,
        });
      }
      break;
    }
    case "accreditation": {
      const threshold = numericParam(params.threshold, DEFAULTS.accreditation);
      const value = Number(credential.value);
      if (Number.isFinite(value) && value < threshold) {
        warnings.push({
          code: "threshold",
          message: `Your net worth is below the requested threshold of $${threshold.toLocaleString("en-US")}.`,
        });
      }
      break;
    }
    case "employment": {
      const seniority = Number(credential.seniority ?? 0);
      const threshold = numericParam(
        params.threshold,
        Number.isFinite(seniority) ? seniority : DEFAULTS.employment,
      );
      if (Number.isFinite(seniority) && seniority < threshold) {
        warnings.push({
          code: "threshold",
          message: `Your seniority is below the requested threshold of ${threshold} years.`,
        });
      }
      break;
    }
    case "jurisdiction": {
      const country = String(credential.value);
      const restricted = params.restricted ?? DEFAULTS.restricted;
      const isListed = restricted.includes(country);
      const allowlist = params.mode === "1";

      if ((allowlist && !isListed) || (!allowlist && isListed)) {
        warnings.push({
          code: "jurisdiction",
          message: allowlist
            ? "Your credential's jurisdiction is not on the gate's allowed list."
            : "Your credential's jurisdiction is on the gate's denylist.",
        });
      }
      break;
    }
    default:
      break;
  }

  return {
    warnings,
    satisfiable: warnings.length === 0,
  };
}
