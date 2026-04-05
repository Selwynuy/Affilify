"use client";

import Link from "next/link";
import { Sparkles, Play, ArrowRight, ArrowDown, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "#f5f3ff" }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 62% 40%, rgba(139,92,246,0.18), transparent 70%)",
        }}
      />

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-20 pb-16 w-full grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center min-h-100svh">
        {/* Left  text */}
        <div className="flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 border border-brand-accent/30 bg-brand-accent/10 rounded-full px-3 py-1 text-[11px] font-semibold text-brand-accent uppercase tracking-widest w-fit">
            <Sparkles className="w-3 h-3" />
            AI Product Studio
          </div>

          <h1
            className="text-[58px] sm:text-[72px] md:text-[80px] font-black leading-[0.85] tracking-[-0.01em] text-[#12111a]"
            style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif" }}
          >
            Build Your
            <br />
            Model.
            <br />
            Dress It.
            <br />
            <span className="text-brand-accent">Film It.</span>
          </h1>

          <p
            className="text-[17px] leading-relaxed max-w-100"
            style={{ color: "rgba(18,17,26,0.52)" }}
          >
            Upload your face. Add your products. Genetrify generates a custom AI
            model that looks like you wearing your exact products and turns it
            into a video. No studio. No shoots. Just content.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-3 mt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-brand-accent text-[#120f1c] hover:bg-brand-accent-hover font-bold px-7 py-3.5 rounded-full text-[15px] transition-all duration-200 shadow-lg shadow-brand-accent/25"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 border border-black/15 bg-black/[0.04] hover:bg-black/[0.08] hover:border-black/25 text-[#12111a]/80 font-semibold px-7 py-3.5 rounded-full text-[15px] transition-all duration-200"
            >
              <Play className="w-3.5 h-3.5" />
              See how it works
            </a>
          </div>
        </div>

        {/* Right  model card */}
        <div className="relative flex justify-center md:justify-end">
          <div
            className="absolute inset-y-[8%] left-1/2 w-[85%] -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(139,92,246,0.25), transparent 60%)",
            }}
          />
          <div className="relative w-full max-w-70 sm:max-w-90 aspect-3/4 rounded-3xl overflow-hidden shadow-xl shadow-purple-200/60 bg-[#ddd6f7]">
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, #e9e4f8, #d4caf0)",
              }}
            />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ color: "rgba(100,80,160,0.35)" }}
            >
              <Users className="w-12 h-12" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Your AI Model
              </span>
            </div>
            {/* Floating badge */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-3 border border-black/8">
              <div className="w-9 h-9 rounded-xl bg-brand-accent/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-brand-accent" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-gray-800">
                  AI-generated model
                </p>
                <p className="text-[11px] text-gray-500">
                  Using your face + product
                </p>
              </div>
            </div>
          </div>

          {/* Floating mini cards */}
          <div className="absolute -left-4 top-12 w-20 aspect-9/16 rounded-2xl bg-brand-accent/20 shadow-md shadow-purple-200/40" />
          <div className="absolute -right-2 bottom-20 w-16 aspect-9/16 rounded-2xl bg-white shadow-lg border border-black/8" />
        </div>
      </div>

      {/* Fade-to-dark transition at bottom of hero */}
      <div
        className="absolute bottom-0 inset-x-0 h-52 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-brand-bg))",
        }}
      />

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-brand-text/30 animate-bounce">
        <ArrowDown className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-widest font-semibold">
          Scroll
        </span>
      </div>
    </section>
  );
}
