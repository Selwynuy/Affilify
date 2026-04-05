"use client";

import { NavbarSection } from "./sections/NavbarSection";
import { HeroSection } from "./sections/HeroSection";
import { CarouselSection } from "./sections/CarouselSection";
import { IntroSection } from "./sections/IntroSection";
import { BigStatementSection } from "./sections/BigStatementSection";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HowItWorksSections } from "./sections/HowItWorksSections";
import { PricingSection } from "./sections/PricingSection";
import { ReviewsSection } from "./sections/ReviewsSection";
import { FaqSection } from "./sections/FaqSection";
import { CtaSection } from "./sections/CtaSection";
import { FooterSection } from "./sections/FooterSection";
import type { Review } from "./sections/ReviewsSection";

interface Props {
  user?: { email: string } | null;
  reviews?: Review[];
}

export default function LandingPage({ user, reviews = [] }: Props) {
  return (
    <div
      className="min-h-screen text-brand-text overflow-x-hidden"
      style={{ background: "var(--color-brand-bg)" }}
    >
      <NavbarSection user={user} />
      <HeroSection />
      <CarouselSection />
      <IntroSection />
      <BigStatementSection />
      <FeaturesSection />
      <HowItWorksSections />
      <PricingSection />
      <ReviewsSection reviews={reviews} />
      <FaqSection />
      <CtaSection />
      <FooterSection />
    </div>
  );
}
