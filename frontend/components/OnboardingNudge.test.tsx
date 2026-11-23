// Tests for OnboardingNudge (#899) — the contextual re-entry banner on /holder.
// Covers every gating branch, the dismiss flow, and the "Continue setup" action.

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OnboardingNudge } from "./OnboardingNudge";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  mockOnboardingState: {
  state: { step: 4, dismissed: false, completed: false },
  currentStep: "generate-proof" as string,
  mounted: true,
  // Keep the hoisted factory independent of the imported vi binding.
  resumeAt: () => undefined,
  },
  mockWallet: { address: "GTEST" as string | null },
}));
vi.mock("@/lib/onboarding", () => ({
  ONBOARDING_STEPS: [
    "welcome",
    "connect-wallet",
    "get-credential",
    "verify-trust",
    "generate-proof",
    "unlock",
  ],
  useOnboarding: () => mocks.mockOnboardingState,
}));
vi.mock("@/lib/wallet-context", () => ({
  useWallet: () => mocks.mockWallet,
}));

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string) => {
    const msgs: Record<string, string> = {
      message: "Complete your setup",
      continueSetup: "Continue setup",
      dismiss: "Dismiss nudge",
    };
    return msgs[key] ?? key;
  },
}));

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  Object.assign(mocks.mockOnboardingState, {
    state: { step: 4, dismissed: false, completed: false },
    currentStep: "generate-proof",
    mounted: true,
    resumeAt: vi.fn(),
  });
  mocks.mocks.mockWallet.address = "GTEST";
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("OnboardingNudge — gating", () => {
  it("renders the banner when all conditions are met", () => {
    render(<OnboardingNudge />);
    expect(screen.getByText("Complete your setup")).toBeTruthy();
    expect(screen.getByText("Continue setup")).toBeTruthy();
  });

  it("returns null when not mounted yet", () => {
    mocks.mockOnboardingState.mounted = false;
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when onboarding is completed", () => {
    mockOnboardingState.state = { step: 5, dismissed: false, completed: true };
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when wallet is not connected", () => {
    mockWallet.address = null;
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when the user has already passed step 4 (generate-proof)", () => {
    mockOnboardingState.currentStep = "unlock";
    mockOnboardingState.state = { step: 5, dismissed: false, completed: false };
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when the nudge was previously dismissed via localStorage", () => {
    window.localStorage.setItem("stellarcred:onboarding-nudge-dismissed", "1");
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });
});

describe("OnboardingNudge — dismiss", () => {
  it("hides the banner and persists dismissal when the × button is clicked", () => {
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).not.toBeNull();

    const dismissBtn = screen.getByLabelText("Dismiss nudge");
    fireEvent.click(dismissBtn);

    expect(container.firstChild).toBeNull();
    expect(window.localStorage.getItem("stellarcred:onboarding-nudge-dismissed")).toBe("1");
  });
});

describe("OnboardingNudge — Continue setup", () => {
  it("calls resumeAt(4) when the Continue setup button is clicked", () => {
    const resumeAt = vi.fn();
    mocks.mockOnboardingState.resumeAt = resumeAt;

    render(<OnboardingNudge />);
    fireEvent.click(screen.getByText("Continue setup"));

    expect(resumeAt).toHaveBeenCalledWith(4);
  });
});
