"use client";

// Runtime network selection with persistence (Issue #911).
//
// Provides a NetworkContext that:
// - Stores user's network preference in localStorage
// - Falls back to NEXT_PUBLIC_STELLAR_NETWORK env var if no preference saved
// - Validates network availability and deprecation status
// - Exposes network switching capabilities to UI components

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  NETWORK_PRESETS,
  parseNetwork,
  type StellarNetwork,
} from "./stellar";

const STORAGE_KEY = "stellarcred:network-preference";

export interface NetworkStatus {
  /** Whether the network RPC is reachable and functional. */
  available: boolean;
  /** If deprecated, a human-readable reason why (e.g., "Testnet will be reset on..."). */
  deprecationWarning?: string;
  /** Last time the network was checked (for cache invalidation). */
  lastChecked: number;
}

interface NetworkContextValue {
  /** Currently selected network. */
  network: StellarNetwork;
  /** Status of the current network (availability, deprecation). */
  status: NetworkStatus;
  /** Change the active network and persist the preference. */
  setNetwork: (network: StellarNetwork) => void;
  /** Whether we're loading network status. */
  loading: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

// Network status cache — refreshed every 5 minutes
const STATUS_CACHE_MS = 5 * 60 * 1000;
const statusCache = new Map<StellarNetwork, NetworkStatus>();

/**
 * Check if a network is available and not deprecated.
 * For now, we assume all networks in NETWORK_PRESETS are available.
 * Future enhancement: ping RPC endpoints or check a service status API.
 */
async function checkNetworkStatus(network: StellarNetwork): Promise<NetworkStatus> {
  const cached = statusCache.get(network);
  const now = Date.now();
  
  if (cached && now - cached.lastChecked < STATUS_CACHE_MS) {
    return cached;
  }

  // Basic availability check: does the preset exist?
  const preset = NETWORK_PRESETS[network];
  if (!preset) {
    const status: NetworkStatus = {
      available: false,
      deprecationWarning: `Network "${network}" is not recognized.`,
      lastChecked: now,
    };
    statusCache.set(network, status);
    return status;
  }

  // TODO: Future enhancement — ping the RPC endpoint to verify it's reachable
  // For now, assume all preset networks are available
  const status: NetworkStatus = {
    available: true,
    lastChecked: now,
  };

  // Check for deprecation warnings (example logic)
  // This can be extended to fetch from a status API or hardcode known deprecations
  if (network === "futurenet") {
    status.deprecationWarning = 
      "Futurenet is experimental and may be reset without notice. Use testnet for stable development.";
  }

  statusCache.set(network, status);
  return status;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Read initial network from localStorage or fall back to env var
  const getInitialNetwork = (): StellarNetwork => {
    if (typeof window === "undefined") {
      // SSR: use env var
      const envNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
      return parseNetwork(envNetwork) ?? "testnet";
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseNetwork(stored);
        if (parsed) return parsed;
      }
    } catch {
      // localStorage unavailable — fall through to env
    }

    const envNetwork = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";
    return parseNetwork(envNetwork) ?? "testnet";
  };

  const [network, setNetworkState] = useState<StellarNetwork>(getInitialNetwork);
  const [status, setStatus] = useState<NetworkStatus>({
    available: true,
    lastChecked: Date.now(),
  });
  const [loading, setLoading] = useState(true);

  // Check network status on mount and when network changes
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      setLoading(true);
      try {
        const newStatus = await checkNetworkStatus(network);
        if (!cancelled) {
          setStatus(newStatus);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            available: false,
            deprecationWarning: "Unable to verify network status.",
            lastChecked: Date.now(),
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [network]);

  const setNetwork = useCallback((newNetwork: StellarNetwork) => {
    setNetworkState(newNetwork);
    
    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newNetwork);
    } catch {
      // localStorage unavailable — still apply in-memory
    }
  }, []);

  return (
    <NetworkContext.Provider value={{ network, status, setNetwork, loading }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }
  return ctx;
}

/**
 * Hook to get network-aware configuration.
 * Returns the preset for the currently selected network.
 */
export function useNetworkConfig() {
  const { network } = useNetwork();
  return NETWORK_PRESETS[network];
}
