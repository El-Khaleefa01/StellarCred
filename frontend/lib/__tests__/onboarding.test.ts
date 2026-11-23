// Tests for the onboarding hook (lib/onboarding.ts), covering the resumeAt()
// function added in #899 and the core step-navigation state machine.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOnboarding, ONBOARDING_STEPS } from "../onboarding";

// Use jsdom's real Storage implementation so the storage-availability probe
// and the hook read/write the same backing store.
let ls: Storage;

async function renderOnboardingHook() {
  const hook = renderHook(() => useOnboarding());
  await waitFor(() => expect(hook.result.current.mounted).toBe(true));
  return hook;
}

beforeEach(async () => {
  window.localStorage.clear();
  ls = window.localStorage;
  vi.spyOn(window, "addEventListener");
  vi.spyOn(window, "removeEventListener");
  vi.spyOn(window, "dispatchEvent");
});

afterEach(async () => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useOnboarding — resumeAt", () => {
  it("jumps to the requested step, clears dismissed and completed", async () => {
    // Seed: user dismissed at step 2, completed=false
    ls.setItem("stellarcred:onboarding", JSON.stringify({ step: 2, dismissed: true, completed: false }));

    const { result } = await renderOnboardingHook();

    act(() => {
      result.current.resumeAt(4);
    });

    expect(result.current.currentStep).toBe("generate-proof");
    expect(result.current.state.dismissed).toBe(false);
    expect(result.current.state.completed).toBe(false);
    expect(result.current.state.step).toBe(4);
  });

  it("clamps to the last valid step index when given an out-of-range high value", async () => {
    const { result } = await renderOnboardingHook();

    act(() => {
      result.current.resumeAt(99);
    });

    expect(result.current.state.step).toBe(ONBOARDING_STEPS.length - 1);
    expect(result.current.currentStep).toBe("unlock");
  });

  it("clamps to step 0 when given a negative value", async () => {
    const { result } = await renderOnboardingHook();

    act(() => {
      result.current.resumeAt(-5);
    });

    expect(result.current.state.step).toBe(0);
    expect(result.current.currentStep).toBe("welcome");
  });

  it("persists the new state to localStorage", async () => {
    const { result } = await renderOnboardingHook();

    act(() => {
      result.current.resumeAt(3);
    });

    const saved = JSON.parse(ls.getItem("stellarcred:onboarding")!);
    expect(saved.step).toBe(3);
    expect(saved.dismissed).toBe(false);
    expect(saved.completed).toBe(false);
  });

  it("dispatches a reset event so other components re-sync", async () => {
    const { result } = await renderOnboardingHook();

    act(() => {
      result.current.resumeAt(1);
    });

    expect(window.dispatchEvent).toHaveBeenCalled();
  });
});

describe("useOnboarding — core navigation", () => {
  it("starts at welcome for a fresh user", async () => {
    const { result } = await renderOnboardingHook();
    expect(result.current.currentStep).toBe("welcome");
    expect(result.current.isVisible).toBe(true);
  });

  it("does not show for a dismissed user", async () => {
    ls.setItem("stellarcred:onboarding", JSON.stringify({ step: 0, dismissed: true, completed: false }));
    const { result } = await renderOnboardingHook();
    expect(result.current.isVisible).toBe(false);
  });

  it("does not show for a completed user", async () => {
    ls.setItem("stellarcred:onboarding", JSON.stringify({ step: 5, dismissed: false, completed: true }));
    const { result } = await renderOnboardingHook();
    expect(result.current.isVisible).toBe(false);
  });

  it("nextStep advances and marks completed at the end", async () => {
    ls.setItem("stellarcred:onboarding", JSON.stringify({ step: 5, dismissed: false, completed: false }));
    const { result } = await renderOnboardingHook();

    act(() => result.current.nextStep());

    expect(result.current.state.step).toBe(5);
    expect(result.current.state.completed).toBe(true);
  });

  it("prevStep does not go below 0", async () => {
    const { result } = await renderOnboardingHook();
    act(() => result.current.prevStep());
    expect(result.current.state.step).toBe(0);
  });

  it("goToStep jumps to any valid index", async () => {
    const { result } = await renderOnboardingHook();
    act(() => result.current.goToStep(3));
    expect(result.current.currentStep).toBe("verify-trust");
  });

  it("dismiss marks dismissed=true and persists", async () => {
    const { result } = await renderOnboardingHook();
    act(() => result.current.dismiss());
    expect(result.current.state.dismissed).toBe(true);
    const saved = JSON.parse(ls.getItem("stellarcred:onboarding")!);
    expect(saved.dismissed).toBe(true);
  });

  it("migrates legacy onboarding_seen key", async () => {
    ls.setItem("stellarcred_onboarding_seen", "1");
    const { result } = await renderOnboardingHook();
    expect(result.current.state.dismissed).toBe(true);
    expect(result.current.isVisible).toBe(false);
  });
});
