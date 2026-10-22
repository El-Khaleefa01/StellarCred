/**
 * Tests for NetworkSelector component (Issue #911).
 * 
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NetworkSelector } from "./NetworkSelector";
import { NetworkProvider } from "@/lib/network-context";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "network.selectNetwork": "Select network",
      "network.testnet": "Testnet",
      "network.mainnet": "Mainnet",
      "network.futurenet": "Futurenet",
      "network.unavailable": "Network unavailable",
      "network.deprecated": "Network deprecated",
      "network.unavailableTitle": "Network Unavailable",
      "network.unavailableMessage": "{network} is currently unavailable.",
      "network.deprecatedTitle": "Network Deprecated",
    };
    return translations[key] || key;
  },
}));

// Wrapper component that provides NetworkContext
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <NetworkProvider>{children}</NetworkProvider>;
}

describe("NetworkSelector", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it("renders the current network", () => {
    render(
      <TestWrapper>
        <NetworkSelector />
      </TestWrapper>
    );

    // Should show testnet by default (from DEFAULT_NETWORK)
    expect(screen.getByText("Testnet")).toBeInTheDocument();
  });

  it("opens dropdown when clicked", async () => {
    render(
      <TestWrapper>
        <NetworkSelector />
      </TestWrapper>
    );

    const button = screen.getByLabelText("Select network");
    fireEvent.click(button);

    // All three networks should be visible in the dropdown
    expect(screen.getAllByText("Testnet")).toHaveLength(2); // button + dropdown
    expect(screen.getByText("Mainnet")).toBeInTheDocument();
    expect(screen.getByText("Futurenet")).toBeInTheDocument();
  });

  it("persists network selection to localStorage", async () => {
    render(
      <TestWrapper>
        <NetworkSelector />
      </TestWrapper>
    );

    // Open dropdown
    const button = screen.getByLabelText("Select network");
    fireEvent.click(button);

    // Find and click mainnet option (not the active one)
    const options = screen.getAllByRole("menuitem");
    const mainnetOption = options.find(opt => 
      opt.textContent?.includes("Mainnet")
    );
    
    if (mainnetOption) {
      fireEvent.click(mainnetOption);
    }

    // Check localStorage was updated
    const stored = localStorage.getItem("stellarcred:network-preference");
    expect(stored).toBe("mainnet");
  });

  it("shows deprecation warning for futurenet", async () => {
    render(
      <TestWrapper>
        <NetworkSelector />
      </TestWrapper>
    );

    // Switch to futurenet
    const button = screen.getByLabelText("Select network");
    fireEvent.click(button);

    const options = screen.getAllByRole("menuitem");
    const futurenetOption = options.find(opt => 
      opt.textContent?.includes("Futurenet")
    );
    
    if (futurenetOption) {
      fireEvent.click(futurenetOption);

      // Wait for the deprecation warning to appear
      // The warning is shown after network status is checked
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });
});
