"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const CAROUSEL_IMAGES = [
  "/Homepage Carousel/1.png",
  "/Homepage Carousel/2.png",
  "/Homepage Carousel/3.png",
  "/Homepage Carousel/4.png",
  "/Homepage Carousel/5.png",
  "/Homepage Carousel/6.png",
  "/Homepage Carousel/7.png",
  "/Homepage Carousel/8.png",
];

function CarouselRow({ direction }: { direction: "left" | "right" }) {
  const cards = [...CAROUSEL_IMAGES, ...CAROUSEL_IMAGES];
  return (
    <div className="relative overflow-hidden w-full">
      <div
        className={cn(
          "flex gap-3 w-max",
          direction === "left" ? "animate-scroll-left" : "animate-scroll-right",
        )}
        style={{ willChange: "transform" }}
      >
        {cards.map((src, i) => (
          <div
            key={i}
            className="relative w-64 sm:w-72 md:w-80 shrink-0 aspect-3/4 rounded-2xl overflow-hidden bg-brand-surface"
          >
            <Image
              src={src}
              alt={`Genetrify AI fashion model sample ${(i % CAROUSEL_IMAGES.length) + 1}`}
              fill
              sizes="(max-width: 640px) 256px, (max-width: 768px) 288px, 320px"
              className="object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CarouselSection() {
  return (
    <>
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
        @media (prefers-reduced-motion: reduce) {
          .animate-scroll-left,
          .animate-scroll-right {
            animation: none !important;
            transform: translateX(0) !important;
          }
        }
      `}</style>
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
    </>
  );
}
