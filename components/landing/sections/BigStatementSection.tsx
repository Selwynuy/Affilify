"use client";

import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

export function BigStatementSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section className="py-28 text-center" style={{ background: "#1a1f27" }}>
      <div
        ref={ref}
        className={cn(
          "max-w-5xl mx-auto px-6",
          "transition-all duration-1000 ease-out",
          inView ? "opacity-100 scale-100" : "opacity-0 scale-95",
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
          The only product video tool that puts <em>your</em> face at the center
          of every campaign not a stock model.
        </p>
      </div>
    </section>
  );
}
