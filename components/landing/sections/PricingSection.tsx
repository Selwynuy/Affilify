"use client";

import Link from "next/link";
import { Zap, Check, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

// ── Pricing display data ─────────────────────────────────────────────────────
// Token releases are computed from `tokensPerMonth / 30` per the actual
// algorithm in lib/billing/tokens.ts (`getTrancheAmount`):
//   base = floor(tokens / 30); first (tokens mod 30) days get base + 1.
// Storage / rollover / model tier mirror lib/data/plans.ts (source of truth).
const PLANS_DISPLAY = [
  {
    id: "starter",
    name: "Starter",
    price: "PHP 1,099",
    tokens: "4,000",
    popular: false,
    features: [
      "4,000 tokens / month",
      "~133 tokens released daily",
      "~33 Seedance Fast video runs / month",
      "Standard models (Kling Turbo, Seedance 2.0 Fast)",
      "3 GB storage",
      "No token rollover",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "PHP 2,199",
    tokens: "9,500",
    popular: true,
    features: [
      "9,500 tokens / month",
      "~316 tokens released daily",
      "~43 Seedance Pro video runs / month",
      "Standard + Pro models (adds Seedance 2.0 Pro)",
      "10 GB storage",
      "30-day token rollover",
      "Everything in Starter",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "PHP 4,999",
    tokens: "22,000",
    popular: false,
    features: [
      "22,000 tokens / month",
      "~733 tokens released daily",
      "~100 Seedance Pro video runs / month",
      "Standard + Pro models",
      "15 GB storage",
      "30-day token rollover",
      "Everything in Growth",
    ],
  },
];

function SparkHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-accent/30 bg-linear-to-br from-brand-accent/12 via-brand-accent/[0.04] to-transparent p-6 md:p-7 mb-8">
      {/* Decorative glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-accent/15 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start md:items-center gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-brand-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent">
                Special launch offer
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-brand-accent text-brand-bg">
                New
              </span>
            </div>
            <p className="text-[24px] md:text-[28px] font-black tracking-[-0.02em] text-brand-text leading-tight">
              Start with only{" "}
              <span className="text-brand-accent">PHP 99</span>
            </p>
            <p className="text-[13px] text-brand-text/65 mt-1">
              200 tokens · 1 AI fashion video + 10 image drafts · one-time, no commitment
            </p>
          </div>
        </div>

        <Link
          href="#top"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-accent text-brand-bg text-[13px] font-bold uppercase tracking-wider hover:bg-brand-accent-hover transition-all duration-200 whitespace-nowrap"
        >
          Join waitlist
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function PricingGrid() {
  return (
    <>
      <SparkHero />

      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/75">
          Monthly Plans
        </p>
        <p className="text-[11px] text-brand-text/65">
          Tokens released daily · cancel anytime
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLANS_DISPLAY.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-300",
              plan.popular
                ? "border-brand-accent/40 bg-brand-accent/5 ring-1 ring-brand-accent/20"
                : "border-white/[0.07] bg-brand-surface hover:border-white/13 hover:bg-brand-surface/80",
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border border-brand-accent/40 bg-brand-accent/15 text-[10px] font-semibold text-brand-accent whitespace-nowrap tracking-wide uppercase">
                Most Popular
              </div>
            )}

            <div className="mb-5">
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/75 mb-3">
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] sm:text-[36px] font-black tracking-[-0.03em] text-brand-text leading-none">
                  {plan.price}
                </span>
              </div>
              <p className="text-[12px] text-brand-text/65 mt-1">per month</p>
              <div className="mt-3 flex items-center gap-2">
                <Zap className="w-3 h-3 text-brand-accent shrink-0" />
                <span className="text-xs text-brand-text/85 font-semibold">
                  {plan.tokens} tokens / month
                </span>
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6 border-t border-white/6 pt-5 mt-2">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-brand-text/70"
                >
                  <Check
                    className={cn(
                      "w-3.5 h-3.5 shrink-0 mt-0.5",
                      plan.popular ? "text-brand-accent" : "text-brand-text/50",
                    )}
                  />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="#top"
              className={cn(
                "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all duration-200",
                plan.popular
                  ? "bg-brand-accent text-brand-bg hover:bg-brand-accent-hover"
                  : "bg-white/4 hover:bg-white/8 border border-white/8 text-brand-text",
              )}
            >
              Join waitlist
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs text-brand-text/65 mt-8 text-center">
        Genetrify is in early access — join the waitlist and we&apos;ll email
        you the moment plans go live. Payments via PayMongo QRPH (GCash, Maya,
        major PH banks).
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
          Start with ₱99,
          <br />
          scale when ready.
        </h2>
        <p className="text-[15px] text-brand-text/60 max-w-lg mb-12 leading-relaxed">
          Try Spark for one-time use, or pick a monthly plan when you&apos;re
          ready to ship content consistently.
        </p>
        <PricingGrid />
      </div>
    </section>
  );
}
