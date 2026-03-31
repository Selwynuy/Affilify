"use client";

import Link from "next/link";
import {
  Sparkles,
  Video,
  ImageIcon,
  Zap,
  Play,
  ArrowRight,
  Star,
  Users,
  ShoppingBag,
  Check,
  Quote,
  Plus,
  Minus,
  ArrowDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { NavbarUserMenu, NavbarGuestButtons } from "./NavbarUserMenu";
import { BrandLogo } from "@/components/brand-logo";

interface Review {
  id: string;
  name: string;
  handle: string | null;
  avatar_letter: string | null;
  avatar_color: string | null;
  rating: number;
  body: string;
  tag: string | null;
}

const PLANS_DISPLAY = [
  {
    id: "starter",
    name: "Starter",
    price: "₱1,099",
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
    price: "₱2,199",
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
    price: "₱4,999",
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
    price: "₱10,999",
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

const CURRENT_YEAR = new Date().getFullYear();

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// Carousel card colors for placeholder visuals
const CARD_COLORS = [
  "bg-brand-surface",
  "bg-brand-surface/80",
  "bg-[#1e2530]",
  "bg-[#2a3240]",
  "bg-[#243040]",
  "bg-[#1e2838]",
  "bg-brand-surface",
  "bg-[#2e3a48]",
];

function CarouselRow({ direction }: { direction: "left" | "right" }) {
  const cards = [...CARD_COLORS, ...CARD_COLORS];
  return (
    <div className="relative overflow-hidden w-full">
      <div
        className={cn(
          "flex gap-3 w-max",
          direction === "left" ? "animate-scroll-left" : "animate-scroll-right",
        )}
        style={{ willChange: "transform" }}
      >
        {cards.map((color, i) => (
          <div
            key={i}
            className={cn(
              "w-64 sm:w-72 md:w-80 shrink-0 aspect-3/4 rounded-2xl overflow-hidden",
              color,
            )}
          >
            <div className="w-full h-full bg-linear-to-b from-white/5 to-black/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
                  {plan.tokens} tokens · {plan.runs} runs
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
        All plans include a token top-up option · Payments via PayMongo · Cancel
        anytime
      </p>
    </>
  );
}

const FAQ_ITEMS = [
  {
    q: "What exactly is Genetrify?",
    a: "Genetrify is an AI-powered product showcase studio. Upload your face and product images — our AI builds a model that looks like you, dresses it in your product, then generates cinematic images and videos ready to post.",
  },
  {
    q: "Who is Genetrify designed for?",
    a: "Genetrify is built for TikTok affiliates, dropshippers, small brands, and content creators who need professional product content without expensive photoshoots.",
  },
  {
    q: "How does the model generation work?",
    a: "You upload a photo of your face, select body preferences (height, build, skin tone, style), and our AI generates a realistic model avatar. That avatar is saved to your account and used for all future generations.",
  },
  {
    q: "Do I need special skills or equipment?",
    a: "None. Just a phone photo of your face and a product image. The entire pipeline — avatar creation, image generation, video rendering — is handled by Genetrify automatically.",
  },
  {
    q: "How is this different from stock model tools?",
    a: "Unlike tools that use generic stock models, Genetrify lets you create a model from YOUR face. Your audience sees a consistent brand persona that looks like you — not a random AI model.",
  },
  {
    q: "Is the content license-free?",
    a: "Yes. All images and videos generated through Genetrify are yours to use commercially with no watermarks or platform restrictions.",
  },
  {
    q: "What are tokens and how do they work?",
    a: "Tokens are the currency inside Genetrify. Each generation deducts tokens based on complexity and model quality. You can top up anytime or let them roll over (Growth plan and above).",
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-white/8">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="py-5">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-6 text-left group"
          >
            <span className="text-[15px] font-semibold text-brand-text group-hover:text-white transition-colors">
              {item.q}
            </span>
            <span className="shrink-0 w-6 h-6 flex items-center justify-center border border-white/12 rounded-full text-brand-text/60 group-hover:border-white/25 group-hover:text-brand-text transition-all duration-200">
              {open === i ? (
                <Minus className="w-3 h-3" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
            </span>
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              open === i ? "max-h-48 opacity-100 mt-3" : "max-h-0 opacity-0",
            )}
          >
            <p className="text-[14px] text-brand-text/60 leading-relaxed pr-10">
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface Props {
  user?: { email: string } | null;
}

export default function LandingPage({ user }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => {});
  }, []);

  const { ref: introRef, inView: introInView } = useInView();
  const { ref: statementRef, inView: statementInView } = useInView(0.1);
  const { ref: featuresRef, inView: featuresInView } = useInView();
  const { ref: altSection1Ref, inView: altSection1InView } = useInView();
  const { ref: altSection2Ref, inView: altSection2InView } = useInView();
  const { ref: altSection3Ref, inView: altSection3InView } = useInView();
  const { ref: pricingRef, inView: pricingInView } = useInView();
  const { ref: reviewsHeaderRef, inView: reviewsHeaderInView } = useInView();
  const { ref: reviewsCardsRef, inView: reviewsCardsInView } = useInView();
  const { ref: faqRef, inView: faqInView } = useInView();

  return (
    <div
      className="min-h-screen text-brand-text overflow-x-hidden"
      style={{ background: "var(--color-brand-bg)" }}
    >
      {/* Inject carousel keyframes */}
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
        .animate-scroll-right {
          animation: scroll-right 28s linear infinite;
        }
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .font-display {
          font-family: 'Bebas Neue', 'Arial Black', sans-serif;
          letter-spacing: -0.01em;
          line-height: 0.85;
        }
      `}</style>

      {/* ── NAVBAR — floating island pill ── */}
      <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-full max-w-3xl flex items-center justify-between gap-4 px-4 py-2.5 rounded-full border transition-all duration-300",
            scrolled
              ? "border-white/10 shadow-xl shadow-black/30 backdrop-blur-xl"
              : "border-white/8 backdrop-blur-md",
          )}
          style={{
            background: scrolled
              ? "color-mix(in srgb, var(--color-brand-bg) 92%, transparent)"
              : "color-mix(in srgb, var(--color-brand-bg) 70%, transparent)",
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <BrandLogo size={28} className="drop-shadow-[0_0_18px_rgba(139,92,246,0.25)]" />
            <span className="font-black text-[14px] tracking-tight text-brand-text uppercase">
              Genetrify
            </span>
          </Link>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {[
              { href: "#how-it-works", label: "How it works" },
              { href: "#examples", label: "Examples" },
              { href: "#pricing", label: "Pricing" },
            ].map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="px-3.5 py-1.5 rounded-full text-[13px] text-brand-text/60 hover:text-brand-text hover:bg-white/6 transition-all duration-200"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <NavbarUserMenu email={user.email} />
            ) : (
              <NavbarGuestButtons />
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ background: "var(--color-brand-bg)" }}
      >
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 60% 40%, color-mix(in srgb, var(--color-brand-accent) 8%, transparent), transparent)",
          }}
        />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 pt-20 pb-16 w-full grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center min-h-100svh">
          {/* Left — text */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 border border-brand-accent/30 bg-brand-accent/10 rounded-full px-3 py-1 text-[11px] font-semibold text-brand-accent uppercase tracking-widest w-fit">
              <Sparkles className="w-3 h-3" />
              AI Product Studio
            </div>

            <h1
              className="text-[58px] sm:text-[72px] md:text-[80px] font-black leading-[0.85] tracking-[-0.01em] text-brand-text"
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

            <p className="text-[17px] text-brand-text/60 leading-relaxed max-w-100">
              Upload your face. Add your products. Genetrify generates a custom
              AI model that looks like you — wearing your exact products — and
              turns it into a video. No studio. No shoots. Just content.
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
                className="inline-flex items-center gap-2 border border-white/12 hover:border-white/25 text-brand-text font-semibold px-7 py-3.5 rounded-full text-[15px] transition-all duration-200 hover:bg-white/4"
              >
                <Play className="w-3.5 h-3.5" />
                See how it works
              </a>
            </div>
          </div>

          {/* Right — model card */}
          <div className="relative flex justify-center md:justify-end">
            <div
              className="absolute inset-y-[8%] left-1/2 w-[85%] -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(139,92,246,0.25), transparent 60%)",
              }}
            />
            <div className="relative w-full max-w-70 sm:max-w-90 aspect-3/4 rounded-3xl overflow-hidden shadow-2xl bg-brand-surface">
              {/* Gradient placeholder for model image */}
              <div className="absolute inset-0 bg-linear-to-b from-brand-surface via-brand-surface/70 to-brand-bg" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-text/30">
                <Users className="w-12 h-12 opacity-40" />
                <span className="text-xs font-semibold uppercase tracking-widest opacity-40">
                  Your AI Model
                </span>
              </div>
              {/* Floating badge */}
              <div className="absolute bottom-4 left-4 right-4 bg-brand-bg/90 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-3 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-brand-accent/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-brand-accent" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-brand-text">
                    AI-generated model
                  </p>
                  <p className="text-[11px] text-brand-text/50">
                    Using your face + product
                  </p>
                </div>
              </div>
            </div>

            {/* Floating mini cards */}
            <div className="absolute -left-4 top-12 w-20 aspect-9/16 rounded-2xl bg-brand-accent/30 shadow-lg" />
            <div className="absolute -right-2 bottom-20 w-16 aspect-9/16 rounded-2xl bg-brand-surface shadow-lg border border-white/10" />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-brand-text/30 animate-bounce">
          <ArrowDown className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest font-semibold">
            Scroll
          </span>
        </div>
      </section>

      {/* ── SCROLLING CAROUSEL ── */}
      <section
        id="examples"
        className="py-16 overflow-hidden"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <div className="mb-2 px-6 md:px-10 max-w-7xl mx-auto">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/40">
            Examples
          </p>
        </div>
        <div className="py-4">
          <CarouselRow direction="left" />
        </div>
      </section>

      {/* ── INTRODUCTION ── */}
      <section
        className="py-24 overflow-hidden"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <div
          ref={introRef}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 flex items-center gap-8",
            "transition-all duration-700 ease-out",
            introInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
          )}
        >
          {/* Left floating images */}
          <div className="hidden lg:flex flex-col gap-4 shrink-0 w-44">
            <div className="w-36 h-52 rounded-2xl bg-brand-surface ml-4" />
            <div className="w-32 h-44 rounded-2xl bg-[#2e3a48]" />
            <div className="w-28 h-36 rounded-2xl bg-[#1e2a38] ml-6" />
          </div>

          {/* Center text */}
          <div className="flex-1 text-center max-w-xl mx-auto">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/40 mb-4">
              Introduction
            </p>
            <h2
              className="text-3xl md:text-4xl font-black text-brand-text leading-[0.9] mb-6"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              The AI studio built for creators who sell products.
            </h2>
            <p className="text-[15px] text-brand-text/60 leading-relaxed mb-4">
              Genetrify is designed for TikTok affiliates, dropshippers, and
              small brands who need professional content without the overhead.
              Build your AI model from your own face, customize it to your look,
              then dress it in any product and generate cinematic videos — all
              from one dashboard.
            </p>
            <p className="text-[15px] text-brand-text/60 leading-relaxed mb-8">
              It&apos;s your always-on creative studio. A faster, more personal way
              to create, test, and publish product content at scale.
            </p>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-[14px] text-brand-accent hover:text-brand-text transition-colors font-semibold border border-white/10 rounded-full px-4 py-2"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Scroll to see how it works
            </a>
          </div>

          {/* Right floating images */}
          <div className="hidden lg:flex flex-col gap-4 shrink-0 w-44 items-end">
            <div className="w-36 h-56 rounded-2xl bg-brand-surface mr-4" />
            <div className="w-28 h-40 rounded-2xl bg-brand-accent/20" />
            <div className="w-32 h-44 rounded-2xl bg-[#2e3a48] mr-6" />
          </div>
        </div>
      </section>

      {/* ── BIG STATEMENT ── */}
      <section className="py-28 text-center" style={{ background: "#1a1f27" }}>
        <div
          ref={statementRef}
          className={cn(
            "max-w-5xl mx-auto px-6",
            "transition-all duration-1000 ease-out",
            statementInView
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95",
          )}
        >
          <p
            className="font-display text-[clamp(52px,10vw,120px)] leading-[0.85] text-brand-text uppercase"
            style={{
              fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Your Face.
            <br />
            Your Model.
            <br />
            <span className="text-brand-accent">Your Video.</span>
          </p>
          <p className="mt-8 text-[16px] text-brand-text/40 max-w-xl mx-auto leading-relaxed">
            The only product video tool that puts <em>your</em> face at the
            center of every campaign — not a stock model.
          </p>
        </div>
      </section>

      {/* ── KEY FEATURES ── */}
      <section
        id="features"
        className="py-24"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/40 mb-8">
            Key Features
          </p>

          <div
            ref={featuresRef}
            className={cn(
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5",
              "transition-all duration-700 ease-out",
              featuresInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8",
            )}
          >
            {[
              {
                title: "Custom AI Model from Your Face",
                body: "Upload a photo, pick your height, build, skin tone, and style. Genetrify builds a model that looks like you — saved forever to your account.",
                color: "bg-brand-surface",
                delay: "0ms",
              },
              {
                title: "Brand-matched Backgrounds",
                body: "Pick from scene templates or describe any setting. Tokyo street, white studio, Paris rooftop — generated automatically, no travel required.",
                color: "bg-[#2e3a48]",
                delay: "80ms",
              },
              {
                title: "Image to Video Pipeline",
                body: "Every product image becomes a cinematic 9:16 video with motion and Ken Burns effects. Export MP4 instantly — no watermarks, no restrictions.",
                color: "bg-brand-accent/20",
                delay: "160ms",
              },
              {
                title: "Template Marketplace",
                body: "Choose from camera angles, motion styles, and background presets built for affiliate content. New templates added weekly — plug and play.",
                color: "bg-[#1e3a2a]",
                delay: "240ms",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="flex flex-col rounded-2xl overflow-hidden border border-white/6 hover:border-white/12 transition-all duration-300"
                style={{
                  background: "var(--color-brand-surface)",
                  transitionDelay: f.delay,
                }}
              >
                {/* Image placeholder */}
                <div
                  className={cn(
                    "w-full aspect-4/3 relative overflow-hidden",
                    f.color,
                  )}
                >
                  <div className="absolute inset-0 bg-linear-to-b from-white/5 to-black/30 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-white/20" />
                  </div>
                </div>
                {/* Text */}
                <div className="p-6 flex flex-col gap-3">
                  <h3
                    className="text-[16px] font-black text-brand-text uppercase leading-[0.9]"
                    style={{
                      fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-[13px] text-brand-text/60 leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALT SECTION 1 — text left, image right ── */}
      <section
        id="how-it-works"
        className="py-0 overflow-hidden"
        style={{ background: "#1a1f27" }}
      >
        <div
          ref={altSection1Ref}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center",
            "transition-all duration-700 ease-out",
            altSection1InView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
          )}
        >
          <div className="flex flex-col gap-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">
              Step 01
            </p>
            <h2
              className="text-[42px] md:text-[54px] font-black leading-[0.85] text-brand-text uppercase"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Build Your
              <br />
              AI Model
            </h2>
            <p className="text-[15px] text-brand-text/60 leading-relaxed max-w-md">
              Upload a single face photo. Set your body preferences — height,
              build, skin tone, style archetype. Genetrify generates your
              personal AI model and saves it permanently. Every future
              generation uses your model automatically.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 w-fit border border-white/12 hover:border-white/25 text-brand-text font-semibold px-6 py-3 rounded-full text-[14px] transition-all duration-200 hover:bg-white/4"
            >
              Create your model
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="relative">
            <div className="w-full aspect-4/5 rounded-3xl overflow-hidden bg-brand-surface">
              <div className="absolute inset-0 bg-linear-to-br from-brand-accent/10 to-brand-bg/80 flex items-center justify-center">
                <Users className="w-16 h-16 text-white/20" />
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-24 h-32 rounded-2xl bg-brand-accent/20 border border-brand-accent/20" />
          </div>
        </div>
      </section>

      {/* ── ALT SECTION 2 — image left, text right ── */}
      <section
        className="py-0 overflow-hidden"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <div
          ref={altSection2Ref}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center",
            "transition-all duration-700 ease-out",
            altSection2InView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
          )}
        >
          <div className="relative order-2 md:order-1">
            <div className="w-full aspect-4/5 rounded-3xl overflow-hidden bg-[#2e3a48]">
              <div className="absolute inset-0 bg-linear-to-br from-brand-surface to-brand-bg/90 flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-white/20" />
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-20 h-28 rounded-2xl bg-brand-surface border border-white/8" />
          </div>
          <div className="flex flex-col gap-5 order-1 md:order-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">
              Step 02
            </p>
            <h2
              className="text-[42px] md:text-[54px] font-black leading-[0.85] text-brand-text uppercase"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Upload Your
              <br />
              Products
            </h2>
            <p className="text-[15px] text-brand-text/60 leading-relaxed max-w-md">
              Drop in 1–5 product images from a single dashboard — T-shirts,
              pants, shoes, accessories. Genetrify automatically maps each item
              onto your model, respecting fit, drape, and proportions.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 w-fit border border-white/12 hover:border-white/25 text-brand-text font-semibold px-6 py-3 rounded-full text-[14px] transition-all duration-200 hover:bg-white/4"
            >
              Upload a product
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── ALT SECTION 3 — text left, image right ── */}
      <section
        className="py-0 overflow-hidden"
        style={{ background: "#1a1f27" }}
      >
        <div
          ref={altSection3Ref}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center",
            "transition-all duration-700 ease-out",
            altSection3InView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
          )}
        >
          <div className="flex flex-col gap-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">
              Step 03
            </p>
            <h2
              className="text-[42px] md:text-[54px] font-black leading-[0.85] text-brand-text uppercase"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Generate
              <br />
              Image + Video
            </h2>
            <p className="text-[15px] text-brand-text/60 leading-relaxed max-w-md">
              Select a template from our marketplace and hit generate. Genetrify
              produces high-quality model images and converts each into a
              cinematic 9:16 video — complete with scene, lighting, and motion.
              Ready to post in under 2 minutes.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 w-fit border border-white/12 hover:border-white/25 text-brand-text font-semibold px-6 py-3 rounded-full text-[14px] transition-all duration-200 hover:bg-white/4"
            >
              Try it now
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="relative">
            <div className="w-full aspect-4/5 rounded-3xl overflow-hidden bg-brand-surface">
              <div className="absolute inset-0 bg-linear-to-br from-brand-accent/15 to-brand-bg/80 flex items-center justify-center">
                <Video className="w-16 h-16 text-white/20" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-32 rounded-2xl bg-[#2e3a48] border border-white/8" />
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section
        id="pricing"
        className="py-28"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <div
          ref={pricingRef}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10",
            "transition-all duration-700 ease-out",
            pricingInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
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
            Token-based pricing — every generation deducts tokens from your
            balance. Upgrade or top up anytime.
          </p>
          <PricingGrid />
        </div>
      </section>

      {/* ── REVIEWS ── */}
      {reviews.length > 0 && (
        <section
          className="py-28 border-t border-white/6"
          style={{ background: "#1a1f27" }}
        >
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div
              ref={reviewsHeaderRef}
              className={cn(
                "mb-12",
                "transition-all duration-700 ease-out",
                reviewsHeaderInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6",
              )}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/40 mb-4">
                Reviews
              </p>
              <h2
                className="text-[48px] md:text-[60px] font-black leading-[0.85] text-brand-text uppercase"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                Hear it from
                <br />
                the community.
              </h2>
              {reviews.length >= 3 && (
                <div className="flex items-center gap-1 mt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-brand-accent text-brand-accent"
                    />
                  ))}
                  <span className="ml-2 text-[13px] text-brand-text/40">
                    {(
                      reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                    ).toFixed(1)}{" "}
                    / 5 · {reviews.length} reviews
                  </span>
                </div>
              )}
            </div>

            <div
              ref={reviewsCardsRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {reviews.map((r, i) => (
                <div
                  key={r.id}
                  className={cn(
                    "relative rounded-2xl border border-white/[0.07] p-6 flex flex-col gap-4 overflow-hidden hover:border-white/13 transition-all duration-300",
                    "transition-all duration-700 ease-out",
                    reviewsCardsInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6",
                  )}
                  style={{
                    background: "var(--color-brand-surface)",
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  <Quote className="w-4 h-4 text-white/4 absolute top-5 right-5" />
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full bg-linear-to-br shrink-0 flex items-center justify-center text-xs font-bold text-white",
                        r.avatar_color ?? "from-brand-surface to-brand-bg",
                      )}
                    >
                      {r.avatar_letter ?? r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-brand-text leading-tight">
                        {r.name}
                      </p>
                      {r.handle && (
                        <p className="text-[11px] text-brand-text/40">
                          {r.handle}
                        </p>
                      )}
                    </div>
                    {r.tag && (
                      <span className="ml-auto text-[10px] font-medium text-brand-text/40 border border-white/6 rounded-full px-2 py-0.5 shrink-0">
                        {r.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="w-3 h-3 fill-brand-accent text-brand-accent"
                      />
                    ))}
                  </div>
                  <p className="text-[13px] text-brand-text/60 leading-relaxed flex-1">
                    &ldquo;{r.body}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section
        className="py-28"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <div
          ref={faqRef}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-16",
            "transition-all duration-700 ease-out",
            faqInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8",
          )}
        >
          {/* Left */}
          <div className="flex flex-col gap-6">
            <h2
              className="text-[38px] font-black leading-[0.85] text-brand-text uppercase"
              style={{
                fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Frequently
              <br />
              Asked
              <br />
              Questions
            </h2>
            <a
              href="mailto:support@genetrify.com"
              className="inline-flex items-center gap-2 w-fit border border-white/12 hover:border-white/25 text-brand-text text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all duration-200 hover:bg-white/4"
            >
              Ask your question
            </a>
          </div>

          {/* Right — accordion */}
          <FaqAccordion />
        </div>
      </section>

      {/* ── CTA BANNER ── */}
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
                Create your account and generate your first AI model video in
                under 2 minutes.
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

      {/* ── FOOTER ── */}
      <footer
        className="border-t border-white/6"
        style={{ background: "#181c22" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand col */}
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <BrandLogo size={28} />
              <span className="font-black text-[15px] tracking-tight text-brand-text uppercase">
                Genetrify
              </span>
            </Link>
            <p className="text-[13px] text-brand-text/25 leading-relaxed max-w-55">
              Build your AI model. Dress it. Film it. Product content at scale.
            </p>
            <p className="text-[11px] text-brand-text/20 mt-auto">
              © {CURRENT_YEAR} Genetrify. All rights reserved.
            </p>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-text/25 mb-2">
              Product
            </span>
            <a
              href="#features"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Pricing
            </a>
            <Link
              href="/signup"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Sign in
            </Link>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-text/25 mb-2">
              Features
            </span>
            <span className="text-[13px] text-brand-text/25">
              Avatar Builder
            </span>
            <span className="text-[13px] text-brand-text/25">
              AI Image Generation
            </span>
            <span className="text-[13px] text-brand-text/25">
              Image to Video
            </span>
            <span className="text-[13px] text-brand-text/25">
              Template Marketplace
            </span>
            <span className="text-[13px] text-brand-text/25">MP4 Export</span>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-text/25 mb-2">
              Legal
            </span>
            <Link
              href="/terms"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookies"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Cookie Policy
            </Link>
            <Link
              href="/refunds"
              className="text-[13px] text-brand-text/40 hover:text-brand-text transition-colors w-fit"
            >
              Refund Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
