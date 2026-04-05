"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import {
  TextHoverEffect,
  FooterBackgroundGradient,
} from "@/components/ui/hover-footer";

const CURRENT_YEAR = new Date().getFullYear();

export function FooterSection() {
  return (
    <footer
      className="relative overflow-hidden border-t border-white/6"
      style={{ background: "#181c22" }}
    >
      <FooterBackgroundGradient />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-8 grid grid-cols-2 md:grid-cols-5 gap-10">
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
          <p className="text-[12px] text-brand-text/35 leading-relaxed max-w-70">
            Registered business: Genetrify Information Technology Services
          </p>
          <p className="text-[11px] text-brand-text/20 mt-auto">
            &copy; {CURRENT_YEAR} Genetrify Information Technology Services. All
            rights reserved.
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
          <span className="text-[13px] text-brand-text/25">Avatar Builder</span>
          <span className="text-[13px] text-brand-text/25">
            AI Image Generation
          </span>
          <span className="text-[13px] text-brand-text/25">Image to Video</span>
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
          <span className="text-[12px] leading-relaxed text-brand-text/30">
            Policies for genetrify.com by Genetrify Information Technology
            Services.
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

      {/* Animated brand text hover effect */}
      <div className="lg:flex hidden h-48 relative z-10">
        <TextHoverEffect text="Genetrify" />
      </div>
    </footer>
  );
}
