import React from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { WorkflowSection } from "@/components/landing/WorkflowSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { DetectionTicker } from "@/components/landing/DetectionTicker";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { StatsSection, CTASection } from "@/components/landing/StatsAndCTA";

/**
 * Narrative order:
 * 1. HOOK       — "Your agent ran. What did it do?"
 * 2. PAIN       — The debugging loop from hell (relatable, cynical)
 * 3. CONTRAST   — Before/After: log chaos vs execution graph
 * 4. PROOF      — Interactive trace viewer (click through it yourself)
 * 5. SOCIAL     — Live detection ticker (specific anomalies, not features)
 * 6. SOLUTION   — Record / Replay / Branch (what you get)
 * 7. NUMBERS    — < 5ms / 100% / 3 LOC
 * 8. ACTION     — "Stop guessing. Start knowing."
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col w-full bg-background min-h-screen">
      <HeroSection />
      <WorkflowSection />
      <ProblemSection />
      <DemoSection />
      <DetectionTicker />
      <CapabilitiesSection />
      <StatsSection />
      <CTASection />
    </div>
  );
}
