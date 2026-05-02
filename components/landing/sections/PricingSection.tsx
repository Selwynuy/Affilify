"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

const STAGGERED_MODELS = [
  { id: "starter", name: "Starter", price: "PHP 1,099", tokens: "4,000", cadence: "133-134 tokens released daily", popular: true },
  { id: "growth", name: "Growth", price: "PHP 2,199", tokens: "9,500", cadence: "316-317 tokens released daily", popular: false },
  { id: "pro", name: "Pro", price: "PHP 4,999", tokens: "22,000", cadence: "733-734 tokens released daily", popular: false },
];

const PACKS_DISPLAY = [
  { id: "spark", name: "Spark", price: "PHP 99", tokens: "200", bestRate: false },
  { id: "trial", name: "Trial", price: "PHP 249", tokens: "520", bestRate: false },
  { id: "basic", name: "Basic", price: "PHP 649", tokens: "1,500", bestRate: false },
  { id: "creator", name: "Creator", price: "PHP 1,499", tokens: "4,000", bestRate: false },
  { id: "studio", name: "Studio", price: "PHP 3,299", tokens: "10,000", bestRate: true },
];

function PricingGrid() {
  return (
    <>
      <div className="space-y-5 mb-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/75">
            Staggered Model
          </p>
          <p className="text-[11px] text-brand-text/65">
            Monthly billing · tokens released daily
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STAGGERED_MODELS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-300",
                plan.popular
                  ? "border-brand-accent/40 bg-brand-accent/5 ring-1 ring-brand-accent/20"
                  : "border-white/[0.07] bg-brand-surface hover:border-white/13 hover:bg-brand-surface/80",
              )}
            >
              {plan.popular && (
                <div
                  data-badge="anchor"
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border border-brand-accent/40 bg-brand-accent/15 text-[10px] font-semibold text-brand-accent whitespace-nowrap tracking-wide uppercase"
                >
                  Launch Pick
                </div>
              )}

              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/80 mb-3">
                {plan.name}
              </p>
              <span className="text-[26px] sm:text-[30px] font-black tracking-[-0.03em] text-brand-text leading-none">
                {plan.price}
              </span>
              <p className="text-[12px] text-brand-text/70 mt-1 mb-4">monthly</p>

              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-brand-accent shrink-0" />
                  <span className="text-[13px] font-semibold text-brand-text/85">
                    {plan.tokens} tokens / month
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-brand-text/70">
                  {plan.cadence}
                </p>
              </div>

              <Link
                href="/signup"
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all duration-200 mt-4",
                  plan.popular
                    ? "bg-brand-accent text-brand-bg hover:bg-brand-accent-hover"
                    : "bg-white/4 hover:bg-white/8 border border-white/8 text-brand-text",
                )}
              >
                Start plan
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-white/8 mb-8" />

      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/75">
          Token Top-Ups
        </p>
        <p className="text-[11px] text-brand-text/65">
          One-time QRPH purchases
        </p>
      </div>

      <div
        data-testid="pricing-packs"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {PACKS_DISPLAY.map((pack) => (
          <div
            key={pack.id}
            data-pack-id={pack.id}
            className="relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-300 border-white/[0.07] bg-brand-surface hover:border-white/13 hover:bg-brand-surface/80"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/75 mb-3">
              {pack.name}
            </p>
            <span className="text-[26px] sm:text-[30px] font-black tracking-[-0.03em] text-brand-text leading-none">
              {pack.price}
            </span>
            <p className="text-[12px] text-brand-text/70 mt-1 mb-4">one-time</p>

            <div className="flex items-center gap-1.5 mt-auto">
              <Zap className="w-3 h-3 text-brand-accent shrink-0" />
              <span className="text-[13px] font-semibold text-brand-text/85">
                {pack.tokens} tokens
              </span>
            </div>

            {pack.bestRate && (
              <p
                data-badge="rate-note"
                className="text-[10px] text-brand-accent/90 mt-1 font-semibold uppercase tracking-wider"
              >
                Best per-token rate
              </p>
            )}

            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all duration-200 mt-4 bg-white/4 hover:bg-white/8 border border-white/8 text-brand-text"
            >
              Get top-up
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs text-brand-text/65 mt-8">
        Staggered models bill monthly and release tokens daily. Top-ups remain one-time via PayMongo QRPH.
      </p>
    </>
  );
}

export function PricingSection() {
  const { ref, inView } = useInView();

  return (
    <section
      id="pricing"
      className="py-28"
      style={{ background: "var(--color-brand-bg)" }}
    >
      <div
        ref={ref}
        className={cn(
          "max-w-7xl mx-auto px-6 md:px-10",
          "transition-all duration-700 ease-out",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/75 mb-4">
          Pricing
        </p>
        <h2
          className="text-[48px] md:text-[64px] font-black leading-[0.85] text-brand-text uppercase mb-4"
          style={{
            fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          Pick your plan,
          <br />
          then scale with top-ups.
        </h2>
        <p className="text-[15px] text-brand-text/60 max-w-lg mb-12 leading-relaxed">
          Start with a staggered model for controlled monthly access, then use
          one-time top-ups only when you need extra volume.
        </p>
        <PricingGrid />
      </div>
    </section>
  );
}
