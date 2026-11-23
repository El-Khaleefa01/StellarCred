"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "stellarcred:onboarding";
const RESET_EVENT = "stellarcred:onboarding:reset";
const LEGACY_STORAGE_KEY = "stellarcred_onboarding_seen";

export type OnboardingStep =
  | "welcome"
  | "connect-wallet"
  | "get-credential"
  | "verify-trust"
  | "generate-proof"
  | "unlock";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "connect-wallet",
  "get-credential",
  "verify-trust",
  "generate-proof",
  "unlock",
];

export interface OnboardingState {
  step: number;
  dismissed: boolean;
  completed: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  step: 0,
  dismissed: false,
  completed: false,
};

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

function loadState(): OnboardingState {
  try {
    const raw = readStorage(STORAGE_KEY);
    if (!raw) {
      return readStorage(LEGACY_STORAGE_KEY) === "1"
        ? { ...DEFAULT_STATE, dismissed: true }
        : DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      step:
        typeof parsed.step === "number"
          ? Math.max(0, Math.min(parsed.step, ONBOARDING_STEPS.length - 1))
          : 0,
      dismissed: parsed.dismissed === true,
      completed: parsed.completed === true,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: OnboardingState): void {
  writeStorage(STORAGE_KEY, JSON.stringify(state));
}

export function shouldShowOnboarding(): boolean {
  const state = loadState();
  return !state.dismissed && !state.completed;
}

export function resetOnboarding(): void {
  saveState(DEFAULT_STATE);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RESET_EVENT));
  }
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(loadState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function onReset() {
      setState(loadState());
    }
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, []);

  const currentStep = ONBOARDING_STEPS[state.step] ?? "welcome";
  const isVisible = mounted && !state.dismissed && !state.completed;
  const progress = mounted ? (state.step + 1) / ONBOARDING_STEPS.length : 0;

  const goToStep = useCallback((index: number) => {
    setState((prev) => {
      const next = {
        ...prev,
        step: Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1)),
      };
      saveState(next);
      return next;
    });
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextStep = prev.step + 1;
      const next =
        nextStep >= ONBOARDING_STEPS.length
          ? { ...prev, step: ONBOARDING_STEPS.length - 1, completed: true }
          : { ...prev, step: nextStep };
      saveState(next);
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, step: Math.max(0, prev.step - 1) };
      saveState(next);
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, dismissed: true };
      saveState(next);
      return next;
    });
  }, []);

  const complete = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, completed: true };
      saveState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    saveState(DEFAULT_STATE);
  }, []);

  const resumeAt = useCallback((index: number) => {
    const next: OnboardingState = {
      step: Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1)),
      dismissed: false,
      completed: false,
    };
    saveState(next);
    setState(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(RESET_EVENT));
    }
  }, []);

  return {
    state,
    currentStep,
    isVisible,
    progress,
    mounted,
    goToStep,
    nextStep,
    prevStep,
    dismiss,
    complete,
    reset,
    resumeAt,
  };
}
