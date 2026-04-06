"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

const PACKS_DISPLAY = [
  { id: "spark",   name: "Spark",   price: "PHP 100",   tokens: "200",    popular: false },
  { id: "trial",   name: "Trial",   price: "PHP 249",   tokens: "520",    popular: false },
  { id: "basic",   name: "Basic",   price: "PHP 649",   tokens: "1,500",  popular: false },
  { id: "creator", name: "Creator", price: "PHP 1,499", tokens: "4,000",  popular: true  },
  { id: "studio",  name: "Studio",  price: "PHP 3,299", tokens: "10,000", popular: false },
];

function PricingGrid() {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {PACKS_DISPLAY.map((pack) => (
          <div
            key={pack.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-300",
              pack.popular
                ? "border-brand-accent/40 bg-brand-accent/5 ring-1 ring-brand-accent/20"
                : "border-white/[0.07] bg-brand-surface hover:border-white/13 hover:bg-brand-surface/80",
            )}
          >
            {pack.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border border-brand-accent/40 bg-brand-accent/15 text-[10px] font-semibold text-brand-accent whitespace-nowrap tracking-wide uppercase">
                Best Value
              </div>
            )}

            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/60 mb-3">
              {pack.name}
            </p>
            <span className="text-[26px] sm:text-[30px] font-black tracking-[-0.03em] text-brand-text leading-none">
              {pack.price}
            </span>
            <p className="text-[12px] text-brand-text/40 mt-1 mb-4">one-time</p>

            <div className="flex items-center gap-1.5 mt-auto">
              <Zap className="w-3 h-3 text-brand-accent shrink-0" />
              <span className="text-[13px] font-semibold text-brand-text/70">
                {pack.tokens} tokens
              </span>
            </div>

            <Link
              href="/signup"
              className={cn(
                "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-all duration-200 mt-4",
                pack.popular
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
        One-time top-up via PayMongo QRPH. Tokens never expire. No subscription required.
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
          Top up once, generate anytime. Tokens never expire — no subscription,
          no recurring charges.
        </p>
        <PricingGrid />
      </div>
    </section>
  );
}
