"use client";

import { useTranslations } from "next-intl";
import { IconNetwork, IconAlertCircle, IconInfoCircle } from "@tabler/icons-react";
import { useNetwork } from "@/lib/network-context";
import { NETWORK_PRESETS, type StellarNetwork } from "@/lib/stellar";
import { useState } from "react";

/**
 * Network selector dropdown with persistence (Issue #911).
 * 
 * Features:
 * - Displays current network
 * - Dropdown to switch networks
 * - Shows availability status
 * - Displays deprecation warnings
 * - Persists selection to localStorage
 */
export function NetworkSelector() {
  const t = useTranslations();
  const { network, status, setNetwork, loading } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);

  const networkOptions: StellarNetwork[] = ["testnet", "mainnet", "futurenet"];

  const handleNetworkChange = (newNetwork: StellarNetwork) => {
    setNetwork(newNetwork);
    setIsOpen(false);
  };

  const networkLabel = (net: StellarNetwork): string => {
    switch (net) {
      case "mainnet":
        return t("network.mainnet");
      case "futurenet":
        return t("network.futurenet");
      case "testnet":
      default:
        return t("network.testnet");
    }
  };

  return (
    <div className="network-selector">
      {/* Current network display with status indicators */}
      <button
        className="network-selector__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t("network.selectNetwork")}
        disabled={loading}
      >
        <IconNetwork size={18} aria-hidden="true" />
        <span className="network-selector__label">
          {networkLabel(network)}
        </span>
        {!status.available && (
          <IconAlertCircle 
            size={16} 
            className="network-selector__warning-icon"
            aria-label={t("network.unavailable")}
          />
        )}
        {status.deprecationWarning && status.available && (
          <IconInfoCircle 
            size={16} 
            className="network-selector__info-icon"
            aria-label={t("network.deprecated")}
          />
        )}
        <span className="network-selector__chevron" aria-hidden="true">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="network-selector__dropdown" role="menu">
          {networkOptions.map((net) => (
            <button
              key={net}
              className={`network-selector__option ${
                net === network ? "network-selector__option--active" : ""
              }`}
              onClick={() => handleNetworkChange(net)}
              role="menuitem"
              aria-current={net === network ? "true" : undefined}
            >
              <span className="network-selector__option-label">
                {networkLabel(net)}
              </span>
              <span className="network-selector__option-url">
                {NETWORK_PRESETS[net].rpcUrl}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Availability warning */}
      {!status.available && (
        <div className="network-selector__banner network-selector__banner--error">
          <IconAlertCircle size={16} aria-hidden="true" />
          <span>
            <strong>{t("network.unavailableTitle")}</strong>{" "}
            {t("network.unavailableMessage", { network: networkLabel(network) })}
          </span>
        </div>
      )}

      {/* Deprecation warning */}
      {status.deprecationWarning && status.available && (
        <div className="network-selector__banner network-selector__banner--warning">
          <IconInfoCircle size={16} aria-hidden="true" />
          <span>
            <strong>{t("network.deprecatedTitle")}</strong>{" "}
            {status.deprecationWarning}
          </span>
        </div>
      )}

      <style jsx>{`
        .network-selector {
          position: relative;
          display: inline-block;
        }

        .network-selector__button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--bg-secondary);
          color: var(--text);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .network-selector__button:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--border-focus);
        }

        .network-selector__button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .network-selector__label {
          font-weight: 500;
        }

        .network-selector__warning-icon {
          color: var(--danger);
        }

        .network-selector__info-icon {
          color: var(--warn);
        }

        .network-selector__chevron {
          margin-left: 0.25rem;
          font-size: 0.625rem;
        }

        .network-selector__dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          min-width: 16rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
          overflow: hidden;
        }

        .network-selector__option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          color: var(--text);
          text-align: left;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .network-selector__option:hover {
          background: var(--bg-tertiary);
        }

        .network-selector__option--active {
          background: var(--bg-tertiary);
          font-weight: 600;
        }

        .network-selector__option-label {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .network-selector__option-url {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        .network-selector__banner {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.7rem 1rem;
          margin-top: 0.75rem;
          border-radius: var(--radius);
          font-size: 0.8125rem;
        }

        .network-selector__banner--error {
          border: 1px solid rgba(240, 96, 77, 0.4);
          background: rgba(240, 96, 77, 0.08);
          color: var(--danger);
        }

        .network-selector__banner--warning {
          border: 1px solid rgba(227, 179, 65, 0.4);
          background: rgba(227, 179, 65, 0.08);
          color: var(--warn);
        }

        .network-selector__banner svg {
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
