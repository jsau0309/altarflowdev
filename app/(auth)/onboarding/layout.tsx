"use client"; // Provider likely uses client-side state/hooks

import type React from "react";
import { OnboardingProvider } from "@/components/onboarding/onboarding-context";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>;
} 