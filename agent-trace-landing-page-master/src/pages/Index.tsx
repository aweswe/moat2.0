import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { ComparisonSection } from "@/components/ComparisonSection";
import { DeterminismSection } from "@/components/DeterminismSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { IntegrationAssuranceSection } from "@/components/IntegrationAssuranceSection";
import { CapabilitiesSection } from "@/components/CapabilitiesSection";
import { PositioningSection } from "@/components/PositioningSection";
import { AudienceSection } from "@/components/AudienceSection";
import { VisionSection } from "@/components/VisionSection";
import { FinalCTASection } from "@/components/FinalCTASection";
import { Footer } from "@/components/Footer";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const Index = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
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
      </main>
      <Footer />
    </div>
  );
};

export default Index;
