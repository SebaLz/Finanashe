import HeroSection from '@/components/landing/HeroSection';
import BenefitsSection from '@/components/landing/BenefitsSection';
import PricingSection from '@/components/landing/PricingSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <BenefitsSection />
      <PricingSection />
    </div>
  );
} 