"use client";

import Link from "next/link";
import { ArrowRight, Users, ShoppingBag, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

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
            <div className="w-full aspect-4/5 rounded-3xl overflow-hidden bg-brand-surface">
              <div className="absolute inset-0 bg-linear-to-br from-brand-accent/10 to-brand-bg/80 flex items-center justify-center">
                <Users className="w-16 h-16 text-white/20" />
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-24 h-32 rounded-2xl bg-brand-accent/20 border border-brand-accent/20" />
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
            <div className="w-full aspect-4/5 rounded-3xl overflow-hidden bg-brand-surface">
              <div className="absolute inset-0 bg-linear-to-br from-brand-accent/15 to-brand-bg/80 flex items-center justify-center">
                <Video className="w-16 h-16 text-white/20" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-32 rounded-2xl bg-[#2e3a48] border border-white/8" />
          </div>
        </div>
      </section>
    </>
  );
}
