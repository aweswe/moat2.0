import { HeroSection } from "@/components/landing/HeroSection";
import { ComparisonSection } from "@/components/landing/ComparisonSection";
import { DeterminismSection } from "@/components/landing/DeterminismSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { IntegrationAssuranceSection } from "@/components/landing/IntegrationAssuranceSection";
import { CapabilitiesSection } from "@/components/landing/CapabilitiesSection";
import { PositioningSection } from "@/components/landing/PositioningSection";
import { AudienceSection } from "@/components/landing/AudienceSection";
import { VisionSection } from "@/components/landing/VisionSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

export default function LandingPage() {
    return (
        <>
            <HeroSection />
            <DeterminismSection />
            <ComparisonSection />
            <HowItWorksSection />
            <IntegrationAssuranceSection />
            <CapabilitiesSection />
            <PositioningSection />
            <AudienceSection />
            <VisionSection />
            <FinalCTASection />
        </>
    );
}
