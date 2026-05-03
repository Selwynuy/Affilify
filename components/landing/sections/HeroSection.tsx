"use client";

import { useState } from "react";
import { Sparkles, Play, ArrowRight, ArrowDown, CheckCircle2, Loader2 } from "lucide-react";

function WaitlistInline() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing_hero" }),
      });
      const data = (await res.json()) as { ok?: boolean; alreadyOnList?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(
        data.alreadyOnList
          ? "You're already on the list — we'll be in touch soon."
          : "You're in. We'll email you the moment Genetrify is ready.",
      );
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="w-full max-w-md mx-auto rounded-full border border-brand-accent/40 bg-brand-accent/10 px-5 py-3.5 flex items-center justify-center gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0" />
        <span className="text-[14px] font-semibold text-[#12111a] text-center">
          {message}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-2">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-full bg-white border border-black/10 shadow-xl shadow-purple-200/50"
      >
        <label htmlFor="hero-waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="hero-waitlist-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          disabled={status === "loading"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 min-w-0 bg-transparent px-4 py-2.5 text-[15px] text-[#12111a] placeholder:text-[#12111a]/30 outline-none rounded-full"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 bg-brand-accent text-[#120f1c] hover:bg-brand-accent-hover disabled:opacity-60 disabled:cursor-not-allowed font-bold px-6 py-2.5 rounded-full text-[14px] transition-all duration-200 whitespace-nowrap"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Joining…
            </>
          ) : (
            <>
              Join waitlist
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {status === "error" && message ? (
        <p className="text-[12px] text-red-600 px-2 text-center" role="alert">
          {message}
        </p>
      ) : (
        <p className="text-[12px] text-[#12111a]/45 text-center">
          No spam · one launch email · unsubscribe anytime
        </p>
      )}
    </div>
  );
}

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative min-h-screen flex items-center overflow-hidden scroll-mt-0"
      style={{ background: "#f5f3ff" }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(139,92,246,0.22), transparent 70%)",
        }}
      />

      <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 md:px-10 pt-24 pb-20 w-full flex flex-col items-center text-center gap-7 min-h-100svh justify-center">
        <div className="inline-flex items-center gap-2 border border-brand-accent/30 bg-brand-accent/10 rounded-full px-3 py-1 text-[11px] font-semibold text-brand-accent uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          Now in early access · join the waitlist
        </div>

        <h1
          className="text-[60px] sm:text-[84px] md:text-[100px] font-black leading-[0.85] tracking-[-0.01em] text-[#12111a]"
          style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif" }}
        >
          Build Your Model.
          <br />
          Dress It.{" "}
          <span className="text-brand-accent">Film It.</span>
        </h1>

        <p
          className="text-[17px] sm:text-[18px] leading-relaxed max-w-2xl"
          style={{ color: "rgba(18,17,26,0.55)" }}
        >
          Upload your face. Add your products. Genetrify generates a custom AI
          model that looks like you wearing your exact products and turns it
          into a video. No studio. No shoots. Just content.
        </p>

        <WaitlistInline />

        <a
          href="#how-it-works"
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#12111a]/60 hover:text-[#12111a] transition-colors mt-1"
        >
          <Play className="w-3.5 h-3.5" />
          See how it works
        </a>
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
