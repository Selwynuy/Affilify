"use client";

import Image from "next/image";
import {
  Sparkles,
  ImageIcon,
  Zap,
  ArrowRight,
  Upload,
  Camera,
  Users,
  Video,
  ShoppingBag,
  User,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

const BENTO_AVATARS = [
  "/Homepage Carousel/1.png",
  "/Homepage Carousel/3.png",
  "/Homepage Carousel/5.png",
  "/Homepage Carousel/7.png",
  "/Homepage Carousel/2.png",
  "/Homepage Carousel/4.png",
];

function AvatarCycler() {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % BENTO_AVATARS.length);
        setFading(false);
      }, 500);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <Image
      src={BENTO_AVATARS[current]}
      alt=""
      aria-hidden
      fill
      sizes="320px"
      className="object-cover transition-opacity duration-500"
      style={{ opacity: fading ? 0 : 0.45 }}
      draggable={false}
    />
  );
}

const BENTO_CATEGORIES = [
  { label: "Avatars", icon: User },
  { label: "Backgrounds", icon: ImageIcon },
  { label: "Camera Angles", icon: Camera },
  { label: "Movements", icon: Sparkles },
] as const;

function CategoryCycler() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % BENTO_CATEGORIES.length);
        setShow(true);
      }, 300);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const { label, icon: Icon } = BENTO_CATEGORIES[idx];

  return (
    <div className="flex flex-col items-start gap-3">
      <div
        className="flex items-center gap-2.5 transition-all duration-300"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(6px)",
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <Icon className="w-3.5 h-3.5 text-white/60" />
        </div>
        <span className="text-[13px] font-medium text-brand-text/60">
          {label}
        </span>
      </div>
      <div className="flex gap-1.5">
        {BENTO_CATEGORIES.map((_, i) => (
          <div
            key={i}
            className="h-[3px] rounded-full transition-all duration-300"
            style={{
              width: i === idx ? "20px" : "6px",
              background:
                i === idx
                  ? "var(--color-brand-accent)"
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const BENTO_TIERS = [
  { name: "Standard", desc: "Hailuo Fast Wan 2.1" },
  { name: "Pro", desc: "Higher fidelity output" },
  { name: "Elite", desc: "Cinematic AI video" },
];

function TierCycler() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setActive((a) => (a + 1) % BENTO_TIERS.length),
      2200,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {BENTO_TIERS.map((tier, i) => {
        const isActive = i === active;
        return (
          <div
            key={tier.name}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500"
            style={{
              borderColor: isActive
                ? "rgba(139,92,246,0.45)"
                : "rgba(255,255,255,0.06)",
              background: isActive
                ? "rgba(139,92,246,0.06)"
                : "rgba(255,255,255,0.02)",
              transform: isActive ? "scale(1.02)" : "scale(1)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0 transition-all duration-500"
              style={{
                background: isActive
                  ? "var(--color-brand-accent)"
                  : "rgba(255,255,255,0.15)",
                boxShadow: isActive
                  ? "0 0 10px var(--color-brand-accent)"
                  : "none",
              }}
            />
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-bold leading-tight transition-colors duration-500"
                style={{
                  color: isActive
                    ? "var(--color-brand-text)"
                    : "rgba(255,255,255,0.25)",
                }}
              >
                {tier.name}
              </p>
              <p className="text-[10px] text-brand-text/30 truncate">
                {tier.desc}
              </p>
            </div>
            {isActive && (
              <div
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0"
                style={{
                  background: "rgba(139,92,246,0.2)",
                  color: "var(--color-brand-accent)",
                }}
              >
                Active
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FeaturesSection() {
  const { ref, inView } = useInView();

  return (
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
          ref={ref}
          className={cn(
            "grid grid-cols-1 md:grid-cols-6 gap-3 md:auto-rows-[180px]",
            "transition-all duration-700 ease-out",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          {/* A  10+ AI Avatars (2×2) */}
          <div
            className="relative md:col-span-2 md:row-span-2 rounded-2xl border border-white/8 overflow-hidden flex flex-col p-5 hover:border-white/15 transition-colors min-h-[360px] md:min-h-0"
            style={{ background: "var(--color-brand-surface)" }}
          >
            <AvatarCycler />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, var(--color-brand-bg) 30%, transparent 70%)",
              }}
            />
            <div className="relative mt-auto">
              <p
                className="text-[72px] font-black text-brand-text leading-[0.85]"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                10+
              </p>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-brand-text/50 mt-1">
                AI Avatars
              </p>
              <p className="text-[12px] text-brand-text/35 mt-0.5">
                Male & female models, ready to use
              </p>
            </div>
          </div>

          {/* B  1 Photo (2×1) */}
          <div
            className="md:col-span-2 rounded-2xl border border-white/8 flex flex-col justify-between p-5 hover:border-white/15 transition-colors overflow-hidden"
            style={{ background: "var(--color-brand-surface)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(139,92,246,0.12)" }}
              >
                <Upload className="w-3.5 h-3.5 text-brand-accent" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-white/15" />
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <Users className="w-3.5 h-3.5 text-white/50" />
              </div>
            </div>
            <div>
              <p
                className="text-[42px] font-black text-brand-text leading-none"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                1 Photo
              </p>
              <p className="text-[11px] uppercase tracking-wider text-brand-text/40 mt-1">
                Builds your AI model
              </p>
            </div>
          </div>

          {/* C  9:16 (2×1) */}
          <div
            className="md:col-span-2 rounded-2xl border border-white/8 flex flex-col justify-between p-5 hover:border-white/15 transition-colors overflow-hidden"
            style={{ background: "var(--color-brand-surface)" }}
          >
            <div className="flex items-start gap-2">
              <div
                className="w-7 h-[42px] rounded-lg border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: "rgba(139,92,246,0.35)",
                  background: "rgba(139,92,246,0.06)",
                }}
              >
                <Video className="w-3 h-3 text-brand-accent opacity-70" />
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <div
                  className="h-1.5 w-12 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                />
                <div
                  className="h-1.5 w-8 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                />
              </div>
            </div>
            <div>
              <p
                className="text-[42px] font-black text-brand-text leading-none"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                9:16
              </p>
              <p className="text-[11px] uppercase tracking-wider text-brand-text/40 mt-1">
                TikTok & Reels ready
              </p>
            </div>
          </div>

          {/* D  4 Template Types (2×1) */}
          <div
            className="md:col-span-2 rounded-2xl border border-white/8 flex flex-col justify-between p-5 hover:border-white/15 transition-colors overflow-hidden"
            style={{ background: "var(--color-brand-surface)" }}
          >
            <CategoryCycler />
            <div>
              <p
                className="text-[42px] font-black text-brand-text leading-none"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                4
              </p>
              <p className="text-[11px] uppercase tracking-wider text-brand-text/40 mt-1">
                Template types
              </p>
            </div>
          </div>

          {/* E  3 AI Tiers (2×2) */}
          <div
            className="md:col-span-2 md:row-span-2 rounded-2xl border border-white/8 flex flex-col justify-between p-5 hover:border-white/15 transition-colors overflow-hidden min-h-[360px] md:min-h-0"
            style={{ background: "var(--color-brand-surface)" }}
          >
            <div>
              <p
                className="text-[64px] font-black text-brand-text leading-[0.85]"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                3
              </p>
              <p className="text-[11px] uppercase tracking-wider text-brand-text/40 mt-1 mb-5">
                AI model tiers
              </p>
              <TierCycler />
            </div>
            <p className="text-[11px] text-brand-text/25 leading-relaxed">
              From fast drafts to cinematic outputs pick the model that fits your
              run.
            </p>
          </div>

          {/* F  0 Watermarks (2×1) */}
          <div
            className="md:col-span-2 rounded-2xl border border-white/8 flex flex-col justify-between p-5 hover:border-white/15 transition-colors overflow-hidden"
            style={{ background: "var(--color-brand-surface)" }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <Zap className="w-3.5 h-3.5 text-brand-text/40" />
            </div>
            <div>
              <p
                className="text-[42px] font-black text-brand-text leading-none"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                0
              </p>
              <p className="text-[11px] uppercase tracking-wider text-brand-text/40 mt-1">
                Watermarks. Ever.
              </p>
            </div>
          </div>

          {/* G  30-Day Token Rollover (2×1) */}
          <div
            className="md:col-span-2 rounded-2xl border border-white/8 flex flex-col justify-between p-5 hover:border-white/15 transition-colors overflow-hidden"
            style={{ background: "var(--color-brand-surface)" }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.1)" }}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-brand-accent opacity-70" />
            </div>
            <div>
              <p
                className="text-[42px] font-black text-brand-text leading-none"
                style={{
                  fontFamily: "'Bebas Neue', 'Arial Black', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                30-Day
              </p>
              <p className="text-[11px] uppercase tracking-wider text-brand-text/40 mt-1">
                Token rollover
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
