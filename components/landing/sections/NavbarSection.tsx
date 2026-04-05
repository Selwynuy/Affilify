"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { NavbarUserMenu, NavbarGuestButtons } from "../NavbarUserMenu";
import { BrandLogo } from "@/components/brand-logo";

interface Props {
  user?: { email: string } | null;
}

export function NavbarSection({ user }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
      <div
        className={cn(
          "pointer-events-auto w-full max-w-3xl flex items-center justify-between gap-4 px-4 py-2.5 rounded-full border transition-all duration-300",
          scrolled
            ? "border-white/10 shadow-xl shadow-black/30 backdrop-blur-xl"
            : "border-black/8 shadow-sm shadow-black/5 backdrop-blur-md",
        )}
        style={{
          background: scrolled
            ? "color-mix(in srgb, var(--color-brand-bg) 92%, transparent)"
            : "rgba(245, 243, 255, 0.88)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <BrandLogo
            size={28}
            className="drop-shadow-[0_0_18px_rgba(139,92,246,0.25)]"
          />
          <span
            className={cn(
              "font-black text-[14px] tracking-tight uppercase transition-colors duration-300",
              scrolled ? "text-brand-text" : "text-[#12111a]",
            )}
          >
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
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[13px] transition-all duration-200",
                scrolled
                  ? "text-brand-text/60 hover:text-brand-text hover:bg-white/6"
                  : "text-[#12111a]/55 hover:text-[#12111a] hover:bg-black/5",
              )}
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
  );
}
