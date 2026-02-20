import { HeroSection } from "@/components/landing/HeroSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { DeterminismSection } from "@/components/landing/DeterminismSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { CompatibilitySection } from "@/components/landing/CompatibilitySection";
import { FailureStorySection } from "@/components/landing/FailureStorySection";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { PositioningSection } from "@/components/landing/PositioningSection";
import { AudienceSection } from "@/components/landing/AudienceSection";
import { VisionSection } from "@/components/landing/VisionSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

export default function LandingPage() {
    return (
        <>
            {/* 1. Hero — "Debug, Replay, Fix" + feature pills */}
            <HeroSection />

            {/* 2. Compatibility — infra buyers ask: "does it cover my stack?" */}
            <CompatibilitySection />

            {/* 3. Failure Story — visceral 2AM Stripe double-charge scenario */}
            <FailureStorySection />

            {/* 4. Determinism — how forking works under the hood */}
            <DeterminismSection />

            {/* 5. How It Works — Record → Replay → Inspect → Fork → Multiverse */}
            <HowItWorksSection />

            {/* 6. Comparison — Everything else watches. AgentTrace lets you rewrite. */}
            <ComparisonSection />

            {/* 7. Capabilities — Fork + Multiverse as hero cards */}
            <CapabilitiesSection />

            <PositioningSection />
            <AudienceSection />
            <VisionSection />

            {/* 8. Final CTA — "Your agent crashed. What if you could rewind it?" */}
            <FinalCTASection />
        </>
    );
}
