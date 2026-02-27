import { HeroSection } from "@/components/landing/HeroSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { DarkFeatureBlock } from "@/components/landing/DarkFeatureBlock";
import { IntegrationsCarousel } from "@/components/landing/IntegrationsCarousel";
import { ComparisonTableSection } from "@/components/landing/ComparisonTableSection";
import { FAQSection } from "@/components/landing/FAQSection";

export default function LandingPage() {
    return (
        <div className="flex flex-col w-full">
            {/* 1. Hero — Minimal, floating UI */}
            <HeroSection />

            {/* 2. Integrations Scroller */}
            <IntegrationsCarousel />

            {/* 3. Competitor Comparison Table */}
            <ComparisonTableSection />

            {/* 4. Core Features — Alternating layout */}
            <FeatureShowcase />

            {/* 5. The 2AM Failure — High contrast dark section */}
            <DarkFeatureBlock />

            {/* 6. FAQ Section - Dark Accordions */}
            <FAQSection />

            {/* 7. Final CTA */}
            <FinalCTASection />
        </div>
    );
}
