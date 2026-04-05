"use client";

import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

export function IntroSection() {
  const { ref, inView } = useInView();

  return (
    <section
      className="py-24 overflow-hidden"
      style={{ background: "var(--color-brand-bg)" }}
    >
      <div
        ref={ref}
        className={cn(
          "max-w-7xl mx-auto px-6 md:px-10 flex items-center gap-8",
          "transition-all duration-700 ease-out",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        {/* Left floating images */}
        <div className="hidden lg:flex flex-col gap-4 shrink-0 w-44">
          <Image
            src="/Introduction Section/1.png"
            alt=""
            width={144}
            height={208}
            className="w-36 h-52 rounded-2xl object-cover ml-4"
          />
          <Image
            src="/Introduction Section/2.png"
            alt=""
            width={128}
            height={176}
            className="w-32 h-44 rounded-2xl object-cover"
          />
          <Image
            src="/Introduction Section/3.png"
            alt=""
            width={112}
            height={144}
            className="w-28 h-36 rounded-2xl object-cover ml-6"
          />
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
            Genetrify is designed for TikTok affiliates, dropshippers, and small
            brands who need professional content without the overhead. Build your
            AI model from your own face, customize it to your look, then dress it
            in any product and generate cinematic videos all from one dashboard.
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
          <Image
            src="/Introduction Section/4.png"
            alt=""
            width={144}
            height={224}
            className="w-36 h-56 rounded-2xl object-cover mr-4"
          />
          <Image
            src="/Introduction Section/5.png"
            alt=""
            width={112}
            height={160}
            className="w-28 h-40 rounded-2xl object-cover"
          />
          <Image
            src="/Introduction Section/6.png"
            alt=""
            width={128}
            height={176}
            className="w-32 h-44 rounded-2xl object-cover mr-6"
          />
        </div>
      </div>
    </section>
  );
}
