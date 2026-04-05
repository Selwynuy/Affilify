"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "../hooks/useInView";

const FAQ_ITEMS = [
  {
    q: "What exactly is Genetrify?",
    a: "Genetrify is an AI-powered product showcase studio. Upload your face and product images  our AI builds a model that looks like you, dresses it in your product, then generates cinematic images and videos ready to post.",
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
    a: "None. Just a phone photo of your face and a product image. The entire pipeline  avatar creation, image generation, video rendering  is handled by Genetrify automatically.",
  },
  {
    q: "How is this different from stock model tools?",
    a: "Unlike tools that use generic stock models, Genetrify lets you create a model from YOUR face. Your audience sees a consistent brand persona that looks like you  not a random AI model.",
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

export function FaqSection() {
  const { ref, inView } = useInView();

  return (
    <section
      className="py-28"
      style={{ background: "var(--color-brand-bg)" }}
    >
      <div
        ref={ref}
        className={cn(
          "max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-16",
          "transition-all duration-700 ease-out",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
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

        <FaqAccordion />
      </div>
    </section>
  );
}
