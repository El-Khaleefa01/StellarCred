// Tests for OnboardingNudge (#899) — the contextual re-entry banner on /holder.
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

type MockState = {
  state: { step: number; dismissed: boolean; completed: boolean };
  currentStep: string;
  mounted: boolean;
  resumeAt: ReturnType<typeof vi.fn>;
};

let mocks: {
  mockOnboardingState: MockState;
  mockWallet: { address: string | null };
};
let OnboardingNudge: typeof import("./OnboardingNudge").OnboardingNudge;

beforeAll(async () => {
  mocks = {
    mockOnboardingState: {
      state: { step: 4, dismissed: false, completed: false },
      currentStep: "generate-proof",
      mounted: true,
      resumeAt: vi.fn(),
    },
    mockWallet: { address: "GTEST" },
  };

  // Register non-hoisted mocks before dynamically importing the component.
  // This avoids accessing transformed static-import bindings during vi.mock hoisting.
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

beforeEach(() => {
  window.localStorage.clear();
  mocks.mockOnboardingState.state = {
    step: 4,
    dismissed: false,
    completed: false,
  };
  mocks.mockOnboardingState.currentStep = "generate-proof";
  mocks.mockOnboardingState.mounted = true;
  mocks.mockOnboardingState.resumeAt = vi.fn();
  mocks.mockWallet.address = "GTEST";
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
    mocks.mockOnboardingState.state = {
      step: 5,
      dismissed: false,
      completed: true,
    };
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
    mocks.mockOnboardingState.state = {
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

    expect(mocks.mockOnboardingState.resumeAt).toHaveBeenCalledWith(4);
  });
});
