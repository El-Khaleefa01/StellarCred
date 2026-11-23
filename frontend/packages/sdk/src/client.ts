import {
  configure, healthCheck, isConfigured, hasClaim, getClaim, getClaimRecord,
  checkClaimStatus, hasClaims, getClaims, verifyPreset, buildVerifyUrl, buildBadgeUrl,
  buildBadgeEmbedCode, parseReturnParams, watchClaim, withRetry, normalizeRpcError,
  classifyTransientFailure, CLAIM_TYPES, deriveNullifier, isNullifierUsed,
  verifyUniquePersonhood, invalidateClaimCache, clearClaimCache, TimeoutError,
  ConfigError, InvalidAddressError,
} from "./claims";
import {
  RpcError, IndexerError, ContractError, ContractErrorCode, parseContractError,
  TransactionSubmissionError,
} from "./errors";
import { submitTransaction } from "./submit";
import { bootstrap, fetchCapabilities, validateCapabilitiesDescriptor } from "./capabilities";
import { createWalletChallenge, verifyWalletSignature, verifyWalletClaim } from "./challenge";
import { subscribeClaims } from "./subscriptions";
import {
  getCredentialCircuitVersion, isCompatibleCredential, getCredentialVersionStatus,
  getDeploymentCircuitVersion, KNOWN_CIRCUIT_VERSIONS,
} from "./version";
import {
  validateCredential, parseCredentialJson, assertValidCredential,
  CredentialValidationError,
} from "./validateCredential";
import { getIssuer, isValidIssuer, listIssuerIds, listIssuers } from "./issuers";

/** Stable convenience namespace for consumers who prefer a single SDK object. */
export const StellarCred = {
  configure,
  bootstrap,
  fetchCapabilities,
  validateCapabilitiesDescriptor,
  healthCheck,
  isConfigured,
  hasClaim,
  getClaim,
  getClaimRecord,
  checkClaimStatus,
  hasClaims,
  getClaims,
  verifyPreset,
  buildVerifyUrl,
  buildBadgeUrl,
  buildBadgeEmbedCode,
  parseReturnParams,
  watchClaim,
  invalidate: invalidateClaimCache,
  invalidateClaimCache,
  clearClaimCache,
  withRetry,
  normalizeRpcError,
  classifyTransientFailure,
  submitTransaction,
  validateCredential,
  parseCredentialJson,
  assertValidCredential,
  subscribeClaims,
  listIssuers,
  listIssuerIds,
  getIssuer,
  isValidIssuer,
  createWalletChallenge,
  verifyWalletSignature,
  verifyWalletClaim,
  CLAIM_TYPES,
  deriveNullifier,
  isNullifierUsed,
  verifyUniquePersonhood,
  TimeoutError,
  ConfigError,
  InvalidAddressError,
  RpcError,
  getCredentialCircuitVersion,
  isCompatibleCredential,
  getCredentialVersionStatus,
  getDeploymentCircuitVersion,
  KNOWN_CIRCUIT_VERSIONS,
  IndexerError,
  ContractError,
  ContractErrorCode,
  TransactionSubmissionError,
  CredentialValidationError,
  parseContractError,
};
