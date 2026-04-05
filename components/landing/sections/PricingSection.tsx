"use client";

import Link from "next/link";
import { Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

const PLANS_DISPLAY = [
  {
    id: "starter",
    name: "Starter",
    price: "PHP 1,099",
    tokens: "4,250",
    runs: "~88",
    popular: false,
    features: [
      "4,250 tokens / month",
      "~88 full video runs",
      "Standard models (Hailuo Fast, Wan 2.1)",
      "3 GB storage",
      "No rollover",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "PHP 2,199",
    tokens: "9,500",
    runs: "~197",
    popular: true,
    features: [
      "9,500 tokens / month",
      "~197 full video runs",
      "Standard + Pro models",
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
    runs: "~458",
    popular: false,
    features: [
      "22,000 tokens / month",
      "~458 full video runs",
      "Standard + Pro models",
      "15 GB storage",
      "30-day token rollover",
      "Everything in Growth",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "PHP 10,999",
    tokens: "60,000",
    runs: "~1,250",
    popular: false,
    features: [
      "60,000 tokens / month",
      "~1,250 full video runs",
      "All models including Elite",
      "50 GB storage",
      "60-day token rollover",
      "Priority queue",
    ],
  },
];

function PricingGrid() {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/60 mb-3">
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] sm:text-[36px] font-black tracking-[-0.03em] text-brand-text leading-none">
                  {plan.price}
                </span>
              </div>
              <p className="text-[12px] text-brand-text/40 mt-1">per month</p>
              <div className="mt-3 flex items-center gap-2">
                <Zap className="w-3 h-3 text-brand-text/40 shrink-0" />
                <span className="text-xs text-brand-text/40">
                  {plan.tokens} tokens {plan.runs} runs
                </span>
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6 border-t border-white/6 pt-5 mt-2">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[13px] text-brand-text/60"
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
              href="/signup"
              className={cn(
                "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all duration-200",
                plan.popular
                  ? "bg-brand-accent text-brand-bg hover:bg-brand-accent-hover"
                  : "bg-white/4 hover:bg-white/8 border border-white/8 text-brand-text",
              )}
            >
              Get started
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs text-brand-text/25 mt-8">
        All plans include a token top-up option Payments via PayMongo Cancel
        anytime
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
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/40 mb-4">
          Pricing
        </p>
        <h2
          className="text-[48px] md:text-[64px] font-black leading-[0.85] text-brand-text uppercase mb-4"
          style={{
            fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          Pay for what
          <br />
          you use.
        </h2>
        <p className="text-[15px] text-brand-text/60 max-w-lg mb-12 leading-relaxed">
          Token-based pricing every generation deducts tokens from your balance.
          Upgrade or top up anytime.
        </p>
        <PricingGrid />
      </div>
    </section>
  );
}
