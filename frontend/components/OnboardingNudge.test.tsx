// Tests for OnboardingNudge (#899) — the contextual re-entry banner on /holder.
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

type OnboardingMockState = {
  state: { step: number; dismissed: boolean; completed: boolean };
  currentStep: string;
  mounted: boolean;
  resumeAt: ReturnType<typeof vi.fn>;
};

type TestMocks = {
  onboarding: OnboardingMockState;
  wallet: { address: string | null };
};

const getMocks = () => (globalThis as typeof globalThis & {
  __onboardingNudgeTestMocks: TestMocks;
}).__onboardingNudgeTestMocks;

vi.mock("@/lib/onboarding", () => ({
  ONBOARDING_STEPS: [
    "welcome",
    "connect-wallet",
    "get-credential",
    "verify-trust",
    "generate-proof",
    "unlock",
  ],
  useOnboarding: () => (globalThis as typeof globalThis & { __onboardingNudgeTestMocks: TestMocks }).__onboardingNudgeTestMocks.onboarding,
}));

vi.mock("@/lib/wallet-context", () => ({
  useWallet: () => (globalThis as typeof globalThis & { __onboardingNudgeTestMocks: TestMocks }).__onboardingNudgeTestMocks.wallet,
}));

vi.mock("next-intl", () => ({
  useTranslations: (_ns: string) => (key: string) => {
    const messages: Record<string, string> = {
      message: "Complete your setup",
      continueSetup: "Continue setup",
      dismiss: "Dismiss nudge",
    };
    return messages[key] ?? key;
  },
}));

import { OnboardingNudge } from "./OnboardingNudge";

beforeEach(() => {
  (globalThis as typeof globalThis & {
    __onboardingNudgeTestMocks: TestMocks;
  }).__onboardingNudgeTestMocks = {
    onboarding: {
      state: { step: 4, dismissed: false, completed: false },
      currentStep: "generate-proof",
      mounted: true,
      resumeAt: vi.fn(),
    },
    wallet: { address: "GTEST" },
  };
  window.localStorage.clear();
});

describe("OnboardingNudge — gating", () => {
  it("renders the banner when all conditions are met", () => {
    render(<OnboardingNudge />);
    expect(screen.getByText("Complete your setup")).toBeTruthy();
    expect(screen.getByText("Continue setup")).toBeTruthy();
  });

  it("returns null when not mounted yet", () => {
    getMocks().onboarding.mounted = false;
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when onboarding is completed", () => {
    getMocks().onboarding.state = {
      step: 5,
      dismissed: false,
      completed: true,
    };
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when wallet is not connected", () => {
    getMocks().wallet.address = null;
    const { container } = render(<OnboardingNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when the user has already passed step 4 (generate-proof)", () => {
    getMocks().onboarding.currentStep = "unlock";
    getMocks().onboarding.state = {
      step: 5,
      dismissed: false,
      completed: false,
    };
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
    render(<OnboardingNudge />);
    fireEvent.click(screen.getByText("Continue setup"));

    expect(getMocks().onboarding.resumeAt).toHaveBeenCalledWith(4);
  });
});
