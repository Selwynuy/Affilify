"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-0" style={{ background: "#1a1f27" }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20">
        <div
          className="relative rounded-3xl overflow-hidden border border-white/8 p-7 sm:p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8"
          style={{ background: "var(--color-brand-surface)" }}
        >
          {/* Warm glow */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-brand-accent/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col gap-4">
            <h2
              className="text-[48px] md:text-[64px] font-black leading-[0.85] text-brand-text uppercase"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Ready to Start
              <br />
              Creating?
            </h2>
            <p className="text-[15px] text-brand-text/60 max-w-md leading-relaxed">
              Create your account and generate your first AI model video in under
              2 minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-brand-accent text-brand-bg hover:bg-brand-accent-hover font-bold px-8 py-4 rounded-full text-[15px] transition-all duration-200"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-white/12 hover:border-white/25 text-brand-text font-semibold px-8 py-4 rounded-full text-[15px] transition-all duration-200 hover:bg-white/4"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
