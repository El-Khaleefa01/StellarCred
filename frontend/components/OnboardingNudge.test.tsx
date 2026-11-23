// Tests for OnboardingNudge (#899) — the contextual re-entry banner on /holder.
// Covers every gating branch, the dismiss flow, and the "Continue setup" action.

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = {
  mockOnboardingState: {
    state: { step: 4, dismissed: false, completed: false },
    currentStep: "generate-proof" as string,
    mounted: true,
    resumeAt: () => undefined,
  },
  mockWallet: { address: "GTEST" as string | null },
};

let OnboardingNudge: typeof import("./OnboardingNudge").OnboardingNudge;

beforeEach(async () => {
  window.localStorage.clear();
  vi.resetModules();

  Object.assign(mocks.mockOnboardingState, {
    state: { step: 4, dismissed: false, completed: false },
    currentStep: "generate-proof",
    mounted: true,
    resumeAt: () => undefined,
  });
  mocks.mockWallet.address = "GTEST";

  // doMock is intentionally used instead of hoisted vi.mock: these factories
  // close over this test module's mutable fixtures and are registered before
  // the component is dynamically imported below.
  vi.doMock("@/lib/onboarding", () => ({
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
  vi.doMock("@/lib/wallet-context", () => ({
    useWallet: () => mocks.mockWallet,
  }));
  vi.doMock("next-intl", () => ({
    useTranslations: (_ns: string) => (key: string) => {
      const messages: Record<string, string> = {
        message: "Complete your setup",
        continueSetup: "Continue setup",
        dismiss: "Dismiss nudge",
      };
      return messages[key] ?? key;
    },
  }));

  ({ OnboardingNudge } = await import("./OnboardingNudge"));
});

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/onboarding");
  vi.doUnmock("@/lib/wallet-context");
  vi.doUnmock("next-intl");
});

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
    mocks.mockOnboardingState.state = { step: 5, dismissed: false, completed: true };
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when wallet is not connected", () => {
    mocks.mockWallet.address = null;
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when the user has already passed step 4 (generate-proof)", () => {
    mocks.mockOnboardingState.currentStep = "unlock";
    mocks.mockOnboardingState.state = { step: 5, dismissed: false, completed: false };
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

    fireEvent.click(screen.getByLabelText("Dismiss nudge"));

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
