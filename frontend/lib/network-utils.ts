// Network utilities for dynamic network configuration (Issue #911).
//
// These utilities help integrate the runtime network selection with existing
// code that was built for static build-time network configuration.

import { NETWORK_PRESETS, type StellarNetwork } from "./stellar";

/**
 * Get the RPC URL for a specific network.
 * Falls back to environment variable override if present.
 */
export function getRpcUrl(network: StellarNetwork): string {
  const preset = NETWORK_PRESETS[network];
  return process.env.NEXT_PUBLIC_RPC_URL ?? preset.rpcUrl;
}

/**
 * Get the network passphrase for a specific network.
 * Falls back to environment variable override if present.
 */
export function getNetworkPassphrase(network: StellarNetwork): string {
  const preset = NETWORK_PRESETS[network];
  return process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? preset.networkPassphrase;
}

/**
 * Get the explorer network identifier for a specific network.
 */
export function getExplorerNetwork(network: StellarNetwork): string {
  const preset = NETWORK_PRESETS[network];
  return preset.explorerNetwork;
}

/**
 * Generate an explorer transaction URL for a given transaction hash and network.
 */
export function getExplorerTxUrl(txHash: string, network: StellarNetwork): string {
  const explorerNet = getExplorerNetwork(network);
  return `https://stellar.expert/explorer/${explorerNet}/tx/${txHash}`;
}

/**
 * Check if a network is considered "production" (mainnet).
 * Useful for conditional warnings or behavior.
 */
export function isProductionNetwork(network: StellarNetwork): boolean {
  return network === "mainnet";
}

/**
 * Check if a network is experimental (futurenet).
 */
export function isExperimentalNetwork(network: StellarNetwork): boolean {
  return network === "futurenet";
}
