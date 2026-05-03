"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

// ── Step 02 mockup: tilted product collage ──────────────────────────────────
function ProductCollage() {
  const cards = [
    {
      src: "/Introduction Section/1.png",
      label: "shirt-01.jpg",
      tilt: -8,
      x: -8,
      y: -4,
      z: 4,
    },
    {
      src: "/Introduction Section/4.png",
      label: "jacket-02.jpg",
      tilt: 6,
      x: 18,
      y: 8,
      z: 3,
    },
    {
      src: "/Introduction Section/2.png",
      label: "denim-03.jpg",
      tilt: -4,
      x: -14,
      y: 22,
      z: 2,
    },
    {
      src: "/Introduction Section/5.png",
      label: "sneakers-04.jpg",
      tilt: 10,
      x: 12,
      y: 32,
      z: 1,
    },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Soft purple glow behind stack */}
      <div className="absolute inset-x-8 top-1/4 h-2/3 rounded-full bg-brand-accent/15 blur-3xl" />

      <div className="relative w-full h-full">
        {cards.map((c) => (
          <div
            key={c.label}
            className="absolute left-1/2 top-1/2 w-[68%] aspect-3/4 rounded-2xl overflow-hidden border border-white/10 bg-brand-surface shadow-[0_30px_60px_-12px_rgba(0,0,0,0.7)]"
            style={{
              transform: `translate(-50%, -50%) translate(${c.x}%, ${c.y}%) rotate(${c.tilt}deg)`,
              zIndex: c.z,
            }}
          >
            <Image
              src={c.src}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 280px"
              className="object-cover"
              draggable={false}
            />
            {/* Filename chip — bottom-left */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10">
                <Check className="w-2.5 h-2.5 text-brand-accent shrink-0" />
                <span className="text-[9px] font-mono text-white/85 truncate">
                  {c.label}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 01 mockup: avatar/template card fan ────────────────────────────────
function AvatarFan() {
  const cards = [
    {
      src: "/Homepage Carousel/3.png",
      tag: "Streetwear",
      tilt: -12,
      x: -32,
      y: 4,
      z: 1,
      active: false,
    },
    {
      src: "/Homepage Carousel/1.png",
      tag: "Editorial",
      tilt: 0,
      x: 0,
      y: -4,
      z: 3,
      active: true,
    },
    {
      src: "/Homepage Carousel/5.png",
      tag: "Studio",
      tilt: 12,
      x: 32,
      y: 4,
      z: 1,
      active: false,
    },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Soft purple glow */}
      <div className="absolute inset-x-8 top-1/4 h-2/3 rounded-full bg-brand-accent/15 blur-3xl" />

      <div className="relative w-full h-full">
        {cards.map((c) => (
          <div
            key={c.tag}
            className={cn(
              "absolute left-1/2 top-1/2 w-[58%] aspect-3/4 rounded-2xl overflow-hidden bg-brand-surface transition-transform",
              c.active
                ? "border-2 border-brand-accent shadow-[0_0_40px_rgba(139,92,246,0.45),0_30px_60px_-12px_rgba(0,0,0,0.7)]"
                : "border border-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)] opacity-80",
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${c.x}%, ${c.y}%) rotate(${c.tilt}deg) scale(${c.active ? 1.05 : 0.95})`,
              zIndex: c.z,
            }}
          >
            <Image
              src={c.src}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, 280px"
              className="object-cover"
              draggable={false}
            />
            {/* Tag chip */}
            <div className="absolute top-2 left-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-white/85 bg-black/65 backdrop-blur-sm border border-white/10 px-1.5 py-0.5 rounded-md">
                {c.tag}
              </span>
            </div>
            {/* Active badge */}
            {c.active && (
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-md py-1 bg-brand-accent text-brand-bg text-[9px] font-bold uppercase tracking-widest">
                <Check className="w-2.5 h-2.5" /> Active
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 03 mockup: image → video phone stack ───────────────────────────────
function ImageToVideoStack() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Soft purple glow */}
      <div className="absolute inset-x-8 top-1/4 h-2/3 rounded-full bg-brand-accent/15 blur-3xl" />

      <div className="relative w-full h-full">
        {/* Background — generated image card (4:5 portrait) */}
        <div
          className="absolute left-1/2 top-1/2 w-[55%] aspect-4/5 rounded-2xl overflow-hidden border border-white/10 bg-brand-surface shadow-[0_30px_60px_-12px_rgba(0,0,0,0.7)]"
          style={{
            transform: "translate(-50%, -50%) translate(-22%, -6%) rotate(-4deg)",
            zIndex: 1,
          }}
        >
          <Image
            src="/Homepage Carousel/2.png"
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 260px"
            className="object-cover"
            draggable={false}
          />
          <div className="absolute top-2 left-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/85 bg-black/65 backdrop-blur-sm border border-white/10 px-1.5 py-0.5 rounded-md">
              Image
            </span>
          </div>
        </div>

        {/* Foreground — phone-shaped video card (9:16) */}
        <div
          className="absolute left-1/2 top-1/2 h-[78%] aspect-[9/16] rounded-[28px] overflow-hidden border-[3px] border-white/15 bg-brand-surface shadow-[0_40px_80px_-16px_rgba(0,0,0,0.8),0_0_40px_rgba(139,92,246,0.25)]"
          style={{
            transform: "translate(-50%, -50%) translate(28%, 4%) rotate(5deg)",
            zIndex: 2,
          }}
        >
          <Image
            src="/Homepage Carousel/6.png"
            alt=""
            fill
            sizes="(max-width: 768px) 40vw, 220px"
            className="object-cover"
            draggable={false}
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
              <Play className="w-6 h-6 text-black fill-black ml-0.5" />
            </div>
          </div>
          {/* TikTok-ready chip */}
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1 rounded-md py-1 bg-black/70 backdrop-blur-sm border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/90">
            9:16 · TikTok ready
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSections() {
  const { ref: ref1, inView: inView1 } = useInView();
  const { ref: ref2, inView: inView2 } = useInView();
  const { ref: ref3, inView: inView3 } = useInView();

  return (
    <>
      {/* Step 01 — text left, image right */}
      <section
        id="how-it-works"
        className="py-0 overflow-hidden"
        style={{ background: "#1a1f27" }}
      >
        <div
          ref={ref1}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center",
            "transition-all duration-700 ease-out",
            inView1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
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
              Choose Avatar
              <br />
              + Template
            </h2>
            <p className="text-[15px] text-brand-text/60 leading-relaxed max-w-md">
              Pick a preset or custom avatar, then choose the template style
              for the shot. Your selected setup becomes the foundation for the
              image you generate next.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 w-fit border border-white/12 hover:border-white/25 text-brand-text font-semibold px-6 py-3 rounded-full text-[14px] transition-all duration-200 hover:bg-white/4"
            >
              Pick your setup
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="relative">
            <div className="relative w-full aspect-square md:aspect-[5/4]">
              <AvatarFan />
            </div>
          </div>
        </div>
      </section>

      {/* Step 02 — image left, text right */}
      <section
        className="py-0 overflow-hidden"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <div
          ref={ref2}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center",
            "transition-all duration-700 ease-out",
            inView2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <div className="relative order-2 md:order-1">
            <div className="relative w-full aspect-square md:aspect-[5/4]">
              <ProductCollage />
            </div>
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
              Add the product images you want featured in the scene. Upload as
              many as you need, mix variations, and test different product
              combinations in one workflow.
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

      {/* Step 03 — text left, image right */}
      <section
        className="py-0 overflow-hidden"
        style={{ background: "#1a1f27" }}
      >
        <div
          ref={ref3}
          className={cn(
            "max-w-7xl mx-auto px-6 md:px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center",
            "transition-all duration-700 ease-out",
            inView3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
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
              Generate the image first and keep iterating until it looks right.
              Once you&apos;re satisfied, turn that approved image into a
              vertical video ready to post.
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
            <div className="relative w-full aspect-square md:aspect-[5/4]">
              <ImageToVideoStack />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
