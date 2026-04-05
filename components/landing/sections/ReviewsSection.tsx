"use client";

import { useRef, useState, useEffect } from "react";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

export interface Review {
  id: string;
  name: string;
  handle: string | null;
  avatar_letter: string | null;
  avatar_color: string | null;
  rating: number;
  body: string;
  tag: string | null;
}

interface Props {
  reviews?: Review[];
}

export function ReviewsSection({ reviews = [] }: Props) {
  const [loadedReviews, setLoadedReviews] = useState<Review[]>(reviews);
  const requestedRef = useRef(reviews.length > 0);

  const { ref: headerRef, inView: headerInView } = useInView();
  const { ref: cardsRef, inView: cardsInView } = useInView();

  useEffect(() => {
    if (reviews.length > 0 || requestedRef.current) return;
    requestedRef.current = true;
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => setLoadedReviews(d.reviews ?? []))
      .catch(() => {});
  }, [reviews]);

  if (loadedReviews.length === 0) return null;

  return (
    <section
      className="py-28 border-t border-white/6"
      style={{ background: "#1a1f27" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div
          ref={headerRef}
          className={cn(
            "mb-12",
            "transition-all duration-700 ease-out",
            headerInView
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
          {loadedReviews.length >= 3 && (
            <div className="flex items-center gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5 fill-brand-accent text-brand-accent"
                />
              ))}
              <span className="ml-2 text-[13px] text-brand-text/40">
                {(
                  loadedReviews.reduce((s, r) => s + r.rating, 0) /
                  loadedReviews.length
                ).toFixed(1)}{" "}
                / 5 / {loadedReviews.length} reviews
              </span>
            </div>
          )}
        </div>

        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {loadedReviews.map((r, i) => (
            <div
              key={r.id}
              className={cn(
                "relative rounded-2xl border border-white/[0.07] p-6 flex flex-col gap-4 overflow-hidden hover:border-white/13 transition-all duration-300",
                "transition-all duration-700 ease-out",
                cardsInView
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
                    <p className="text-[11px] text-brand-text/40">{r.handle}</p>
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
  );
}
