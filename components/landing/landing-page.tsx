'use client'

import Link from 'next/link'
import {
  Sparkles,
  Video,
  ImageIcon,
  Zap,
  Download,
  TrendingUp,
  Play,
  ArrowRight,
  Star,
  Users,
  BarChart2,
  Layers,
  ShoppingBag,
  Check,
  Quote,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { NavbarUserMenu, NavbarGuestButtons } from './NavbarUserMenu'

interface Review {
  id: string
  name: string
  handle: string | null
  avatar_letter: string | null
  avatar_color: string | null
  rating: number
  body: string
  tag: string | null
}

const PLANS_DISPLAY = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₱1,099',
    tokens: '4,250',
    runs: '~88',
    popular: false,
    features: [
      '4,250 tokens / month',
      '~88 full video runs',
      'Standard models (Hailuo Fast, Wan 2.1)',
      '3 GB storage',
      'No rollover',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '₱2,199',
    tokens: '9,500',
    runs: '~197',
    popular: true,
    features: [
      '9,500 tokens / month',
      '~197 full video runs',
      'Standard + Pro models',
      '10 GB storage',
      '30-day token rollover',
      'Everything in Starter',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₱4,999',
    tokens: '22,000',
    runs: '~458',
    popular: false,
    features: [
      '22,000 tokens / month',
      '~458 full video runs',
      'Standard + Pro models',
      '15 GB storage',
      '30-day token rollover',
      'Everything in Growth',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: '₱10,999',
    tokens: '60,000',
    runs: '~1,250',
    popular: false,
    features: [
      '60,000 tokens / month',
      '~1,250 full video runs',
      'All models including Elite',
      '50 GB storage',
      '60-day token rollover',
      'Priority queue',
    ],
  },
]

const CURRENT_YEAR = new Date().getFullYear()

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function PricingGrid() {
  return (
    <>
      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS_DISPLAY.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-300',
              plan.popular
                ? 'border-violet-500/40 bg-violet-600/[0.05] ring-1 ring-violet-500/20'
                : 'border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] hover:bg-[#111111]',
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full border border-violet-500/40 bg-violet-600/[0.15] text-[10px] font-semibold text-violet-300 whitespace-nowrap tracking-wide">
                Most Popular
              </div>
            )}

            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">{plan.name}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[38px] font-extrabold tracking-[-0.03em] text-white leading-none">
                  {plan.price}
                </span>
              </div>
              <p className="text-[12px] text-zinc-600 mt-1">per month</p>
              <div className="mt-3 flex items-center gap-2">
                <Zap className="w-3 h-3 text-zinc-500 shrink-0" />
                <span className="text-xs text-zinc-500">{plan.tokens} tokens · {plan.runs} runs</span>
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-6 border-t border-white/[0.06] pt-5 mt-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                  <Check className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', plan.popular ? 'text-violet-400' : 'text-zinc-500')} />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className={cn(
                'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200',
                plan.popular
                  ? 'bg-white text-[#0a0a0a] hover:bg-zinc-100'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white',
              )}
            >
              Get started
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-700 mt-8">
        All plans include a token top-up option · Payments via PayMongo · Cancel anytime
      </p>
    </>
  )
}

interface Props {
  user?: { email: string } | null
}

export default function LandingPage({ user }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => {})
  }, [])

  const statsView = useInView()
  const featuresHeaderView = useInView()
  const featuresBentoView = useInView()
  const howItWorksHeaderView = useInView()
  const howItWorksStepsView = useInView()
  const useCasesHeaderView = useInView()
  const useCasesCardsView = useInView()
  const pricingView = useInView()
  const reviewsHeaderView = useInView()
  const reviewsCardsView = useInView()
  const ctaView = useInView()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">

      {/* Navbar */}
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b',
          'animate-in fade-in slide-in-from-top-2 fill-mode-both duration-500',
          scrolled
            ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-white/[0.07]'
            : 'bg-transparent border-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
              <Video className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-white">Affilify</span>
          </Link>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '#features', label: 'Features' },
              { href: '#how-it-works', label: 'How it works' },
              { href: '#pricing', label: 'Pricing' },
            ].map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="px-3.5 py-1.5 rounded-full text-[13px] text-zinc-400 hover:text-white border border-transparent hover:border-white/[0.10] hover:bg-white/[0.04] transition-all duration-200"
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

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        {/* Hero background — Dovetail-style technical grid with node markers */}
        <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Fine grid lines */}
              <pattern id="grid-cell" width="64" height="64" patternUnits="userSpaceOnUse">
                <path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.75" />
              </pattern>
              {/* Node square at intersections */}
              <pattern id="grid-nodes" width="64" height="64" patternUnits="userSpaceOnUse">
                <rect x="-2" y="-2" width="4" height="4" fill="rgba(255,255,255,0.10)" />
              </pattern>
            </defs>

            {/* Grid lines */}
            <rect width="100%" height="100%" fill="url(#grid-cell)" />
            {/* Node markers at intersections */}
            <rect width="100%" height="100%" fill="url(#grid-nodes)" />

            {/* Crosshair markers — scattered like Dovetail */}
            {/* Top-left area */}
            <g stroke="rgba(255,255,255,0.18)" strokeWidth="0.75">
              <line x1="120" y1="112" x2="130" y2="112" /><line x1="125" y1="107" x2="125" y2="117" />
              <line x1="200" y1="180" x2="210" y2="180" /><line x1="205" y1="175" x2="205" y2="185" />
              <line x1="80"  y1="240" x2="90"  y2="240" /><line x1="85"  y1="235" x2="85"  y2="245" />
              <line x1="160" y1="300" x2="170" y2="300" /><line x1="165" y1="295" x2="165" y2="305" />
            </g>
            {/* Top-right area crosshairs */}
            <g stroke="rgba(255,255,255,0.18)" strokeWidth="0.75">
              <line x1="78%" y1="100" x2="calc(78% + 10px)" y2="100" /><line x1="calc(78% + 5px)" y1="95" x2="calc(78% + 5px)" y2="105" />
              <line x1="88%" y1="160" x2="calc(88% + 10px)" y2="160" /><line x1="calc(88% + 5px)" y1="155" x2="calc(88% + 5px)" y2="165" />
              <line x1="72%" y1="220" x2="calc(72% + 10px)" y2="220" /><line x1="calc(72% + 5px)" y1="215" x2="calc(72% + 5px)" y2="225" />
            </g>

            {/* Right-side graph nodes (Dovetail orange diagonal line) */}
            {/* Nodes */}
            <rect x="calc(72% - 3px)" y="93" width="6" height="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <rect x="calc(80% - 3px)" y="157" width="6" height="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <rect x="calc(86% - 3px)" y="205" width="6" height="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <rect x="calc(76% - 3px)" y="270" width="6" height="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <rect x="calc(90% - 3px)" y="335" width="6" height="6" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            {/* Violet/fuchsia connecting line between nodes — draws in on load */}
            <polyline
              className="hero-node-line"
              points="72%,96 80%,160 86%,208 76%,273 90%,338"
              fill="none"
              stroke="url(#node-line-grad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="node-line-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#ec4899" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Radial vignette — edges dark, center lets grid show */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_40%,transparent_40%,#0a0a0a_90%)]" />
          {/* Bottom fade */}
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Announcement badge */}
          <div className="inline-flex items-center rounded-full border border-white/[0.10] bg-white/[0.03] overflow-hidden text-[11px] mb-10 animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700">
            <span className="bg-gradient-to-r from-violet-600/80 to-fuchsia-600/80 text-white font-semibold px-3 py-1 tracking-wide">
              NEW
            </span>
            <span className="text-zinc-400 px-3 py-1 flex items-center gap-1.5">
              AI video generation — now with batch mode
              <ArrowRight className="w-3 h-3 text-zinc-500" />
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.025em] leading-[1.08] mb-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700 delay-100">
            Turn Products Into{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Viral Videos
            </span>
            <br />in Under 2 Minutes
          </h1>

          <p className="text-[17px] md:text-lg text-zinc-500 max-w-[520px] mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700 delay-200">
            Upload your face + product images. Affilify generates AI model photos
            and converts them into scroll-stopping 9:16 TikTok videos — instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14 animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-700 delay-300">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-white text-[#0a0a0a] hover:bg-zinc-100 font-semibold px-6 py-3 rounded-full text-[15px] transition-all duration-200 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
            >
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] text-white font-medium px-6 py-3 rounded-full text-[15px] transition-all duration-200"
            >
              <Play className="w-3.5 h-3.5 text-violet-400" />
              See how it works
            </a>
          </div>

          {/* Trusted-by strip */}
          <div className="flex flex-col items-center gap-5 animate-in fade-in fill-mode-both duration-700 delay-500">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              Trusted by creators selling on
            </p>
            <div className="flex items-center gap-8 flex-wrap justify-center">
              {['TikTok', 'Shopify', 'Amazon', 'Meta', 'ClickBank'].map((brand) => (
                <span
                  key={brand}
                  className="text-sm font-bold text-zinc-600 hover:text-zinc-400 transition-colors tracking-tight select-none"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/[0.06]">
        <div
          ref={statsView.ref}
          className="max-w-7xl mx-auto px-6 md:px-10 py-12 grid grid-cols-2 md:grid-cols-4"
        >
          {[
            { value: '10x', label: 'Faster than manual editing' },
            { value: '9:16', label: 'TikTok-native format' },
            { value: '< 2m', label: 'Per video generation' },
            { value: '100%', label: 'AI-generated model shots' },
          ].map(({ value, label }, i) => (
            <div
              key={label}
              className={cn(
                'flex flex-col items-center gap-1.5 px-6 py-4 text-center',
                'border-r border-white/[0.06] last:border-r-0',
                i === 1 && 'border-r-0 md:border-r md:border-white/[0.06]',
                'transition-all duration-700 ease-out',
                statsView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
              )}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="text-[40px] font-extrabold tracking-[-0.02em] text-white leading-none">{value}</span>
              <span className="text-[13px] text-zinc-500 leading-snug max-w-[110px]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="max-w-7xl mx-auto px-6 md:px-10 py-28">
        <div
          ref={featuresHeaderView.ref}
          className={cn(
            'text-center mb-16 max-w-xl mx-auto',
            'transition-all duration-700 ease-out',
            featuresHeaderView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">Features</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] mb-4">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              go viral
            </span>
          </h2>
          <p className="text-[15px] text-zinc-500 leading-relaxed">
            Affilify handles the entire pipeline — from face upload to ready-to-post video.
          </p>
        </div>

        <div ref={featuresBentoView.ref} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Large — AI Image Generation */}
          <div
            className={cn(
              'md:col-span-2 group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] hover:bg-[#111111] p-7 overflow-hidden',
              'transition-all duration-700 ease-out',
              featuresBentoView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '0ms' }}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-5 group-hover:border-violet-500/30 group-hover:bg-violet-500/[0.07] transition-all duration-300">
              <ImageIcon className="w-5 h-5 text-zinc-400 group-hover:text-violet-300 transition-colors duration-300" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">AI Model Image Generation</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed max-w-sm mb-6">
              Upload your face once. Affilify composites it onto AI-generated model
              bodies wearing your product — no studio, no photographer needed.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 aspect-[9/16] rounded-lg bg-violet-900/20 border border-white/[0.06] flex items-end p-2">
                <div className="w-full h-1 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 aspect-[9/16] rounded-lg bg-fuchsia-900/20 border border-white/[0.06] flex items-end p-2">
                <div className="w-full h-1 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 aspect-[9/16] rounded-lg bg-indigo-900/20 border border-white/[0.06] flex items-end p-2">
                <div className="w-full h-1 rounded-full bg-white/10" />
              </div>
            </div>
          </div>

          {/* Ken Burns Video */}
          <div
            className={cn(
              'group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] hover:bg-[#111111] p-7 overflow-hidden',
              'transition-all duration-700 ease-out',
              featuresBentoView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '80ms' }}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-5 group-hover:border-violet-500/30 group-hover:bg-violet-500/[0.07] transition-all duration-300">
              <Video className="w-5 h-5 text-zinc-400 group-hover:text-violet-300 transition-colors duration-300" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">Ken Burns Motion Video</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Each image gets cinematic zoom &amp; pan effects, outputting a native
              9:16 MP4 ready for TikTok or Reels.
            </p>
            <div className="mt-6 aspect-video rounded-xl bg-[#0a0a0a] border border-white/[0.06] flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center">
                <Play className="w-4 h-4 text-zinc-400 ml-0.5" />
              </div>
            </div>
          </div>

          {/* Multi-variation */}
          <div
            className={cn(
              'group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] hover:bg-[#111111] p-7 overflow-hidden',
              'transition-all duration-700 ease-out',
              featuresBentoView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '160ms' }}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-5 group-hover:border-violet-500/30 group-hover:bg-violet-500/[0.07] transition-all duration-300">
              <Layers className="w-5 h-5 text-zinc-400 group-hover:text-violet-300 transition-colors duration-300" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">Multi-Variation Batch</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Upload 1–5 product images and get a unique video for every one. A/B test
              creatives at scale — 10 videos in 10 minutes.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={cn(
                    'flex-1 h-1 rounded-full transition-all duration-300',
                    n <= 3 ? 'bg-violet-500/60' : 'bg-white/[0.08]'
                  )}
                />
              ))}
              <span className="text-[11px] text-zinc-600 ml-1">3/5</span>
            </div>
          </div>

          {/* Avatar Builder */}
          <div
            className={cn(
              'group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] hover:bg-[#111111] p-7 overflow-hidden',
              'transition-all duration-700 ease-out',
              featuresBentoView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '240ms' }}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-5 group-hover:border-violet-500/30 group-hover:bg-violet-500/[0.07] transition-all duration-300">
              <Users className="w-5 h-5 text-zinc-400 group-hover:text-violet-300 transition-colors duration-300" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">Personal Avatar Builder</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Set your gender and body type once. Your avatar is saved and applied
              automatically to every new generation.
            </p>
          </div>

          {/* Instant Download */}
          <div
            className={cn(
              'group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] hover:bg-[#111111] p-7 overflow-hidden',
              'transition-all duration-700 ease-out',
              featuresBentoView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '320ms' }}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-5 group-hover:border-violet-500/30 group-hover:bg-violet-500/[0.07] transition-all duration-300">
              <Download className="w-5 h-5 text-zinc-400 group-hover:text-violet-300 transition-colors duration-300" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">One-Click MP4 Export</h3>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Download your finished videos as MP4s — no watermarks, no platform lock-in.
              Post anywhere instantly.
            </p>
          </div>

          {/* Wide — Speed */}
          <div
            className={cn(
              'md:col-span-3 group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] hover:bg-[#111111] p-7 overflow-hidden',
              'transition-all duration-700 ease-out',
              featuresBentoView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '400ms' }}
          >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="flex-1">
                <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-5 group-hover:border-violet-500/30 group-hover:bg-violet-500/[0.07] transition-all duration-300">
                  <TrendingUp className="w-5 h-5 text-zinc-400 group-hover:text-violet-300 transition-colors duration-300" />
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">Built for Affiliate Speed</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed max-w-lg">
                  Volume beats polish in affiliate marketing. Affilify's entire UX is designed
                  around one goal: generate the most test videos, the fastest — so you find
                  your winner before your competition does.
                </p>
              </div>
              <div className="flex gap-10 shrink-0">
                {[
                  { label: 'Videos / session', value: '10+' },
                  { label: 'Avg. gen time', value: '< 2m' },
                  { label: 'Products tested', value: '∞' },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-[32px] font-extrabold tracking-[-0.02em] text-white leading-none">{value}</div>
                    <div className="text-[12px] text-zinc-500 mt-1.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div
            ref={howItWorksHeaderView.ref}
            className={cn(
              'text-center mb-16 max-w-xl mx-auto',
              'transition-all duration-700 ease-out',
              howItWorksHeaderView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">How it works</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em]">
              From upload to TikTok in{' '}
              <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                4 steps
              </span>
            </h2>
          </div>

          <div ref={howItWorksStepsView.ref} className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-7 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

            {[
              { Icon: Users, label: 'Build your avatar', body: 'Upload a face photo and set your gender / body type once.', color: 'fuchsia' },
              { Icon: ShoppingBag, label: 'Upload products', body: 'Drop in 1–5 product images you want to feature.', color: 'fuchsia' },
              { Icon: Sparkles, label: 'AI generates images', body: 'Imagen composites your face onto model shots with the product.', color: 'fuchsia' },
              { Icon: Download, label: 'Export & post', body: 'Select your favourites and download 9:16 MP4s instantly.', color: 'fuchsia' },
            ].map(({ Icon, label, body }, i) => (
              <div
                key={label}
                className={cn(
                  'group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] p-6 flex flex-col items-center text-center overflow-hidden',
                  'transition-all duration-700 ease-out',
                  howItWorksStepsView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
                )}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative w-14 h-14 rounded-2xl border border-white/[0.07] bg-white/[0.03] flex items-center justify-center mb-5 group-hover:border-fuchsia-500/20 transition-colors duration-300">
                  <Icon className="w-5 h-5 text-zinc-500 group-hover:text-fuchsia-300 transition-colors duration-300" />
                  <span className="absolute -top-2.5 -right-2.5 text-[10px] font-bold text-white bg-[#0a0a0a] border border-white/[0.10] rounded-full w-5 h-5 flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold text-white mb-2">{label}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-28">
        <div
          ref={useCasesHeaderView.ref}
          className={cn(
            'text-center mb-16 max-w-xl mx-auto',
            'transition-all duration-700 ease-out',
            useCasesHeaderView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">Use cases</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em]">
            One product,{' '}
            <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
              endless creatives
            </span>
          </h2>
        </div>

        <div ref={useCasesCardsView.ref} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { Icon: TrendingUp, title: 'TikTok Shop', body: 'Generate dozens of product showcase clips per day to keep your TikTok Shop feed stocked with fresh content.' },
            { Icon: Zap, title: 'Dropshipping', body: 'Test 10 different products in one afternoon. Kill losers fast, scale winners with more video variations.' },
            { Icon: BarChart2, title: 'A/B Creative Testing', body: 'Each generation produces N unique clips from N images. Run them as organic posts or paid ads and let data decide.' },
          ].map(({ Icon, title, body }, i) => (
            <div
              key={title}
              className={cn(
                'group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] p-7 overflow-hidden',
                'transition-all duration-700 ease-out',
                useCasesCardsView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
              )}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Watermark number */}
              <span className="absolute top-5 right-6 text-[64px] font-extrabold text-white/[0.03] leading-none select-none pointer-events-none tabular-nums">
                0{i + 1}
              </span>
              <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center mb-5 group-hover:border-pink-500/25 group-hover:bg-pink-500/[0.06] transition-all duration-300">
                <Icon className="w-5 h-5 text-zinc-500 group-hover:text-pink-300 transition-colors duration-300" />
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2 tracking-tight">{title}</h3>
              <p className="text-[13px] text-zinc-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 md:px-10 py-28">
        <div
          ref={pricingView.ref}
          className="text-center mb-4"
        >
          <p
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4',
              'transition-all duration-700 ease-out',
              pricingView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
          >
            Pricing
          </p>
          <h2
            className={cn(
              'text-4xl md:text-5xl font-bold tracking-[-0.025em] mb-4',
              'transition-all duration-700 ease-out',
              pricingView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
          >
            Pay for what you{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              actually use
            </span>
          </h2>
          <p
            className={cn(
              'text-[15px] text-zinc-500 max-w-xl mx-auto mb-10',
              'transition-all duration-700 ease-out',
              pricingView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
          >
            Token-based pricing — every generation deducts tokens from your balance. Upgrade or top up anytime.
          </p>
          <div
            className={cn(
              'transition-all duration-700 ease-out',
              pricingView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '100ms' }}
          >
            <PricingGrid />
          </div>
        </div>
      </section>

      {/* Reviews — only rendered when real approved reviews exist */}
      {reviews.length > 0 && (
        <section className="py-28 border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div
              ref={reviewsHeaderView.ref}
              className={cn(
                'text-center mb-16 max-w-xl mx-auto',
                'transition-all duration-700 ease-out',
                reviewsHeaderView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">Reviews</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.025em] mb-4">
                Loved by{' '}
                <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  creators worldwide
                </span>
              </h2>
              {reviews.length >= 3 && (
                <div className="flex items-center justify-center gap-1 mt-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-2 text-[13px] text-zinc-500">
                    {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} / 5 · {reviews.length} reviews
                  </span>
                </div>
              )}
            </div>

            <div ref={reviewsCardsView.ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((r, i) => (
                <div
                  key={r.id}
                  className={cn(
                    'group relative rounded-2xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.13] p-6 flex flex-col gap-4 overflow-hidden',
                    'transition-all duration-700 ease-out',
                    reviewsCardsView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
                  )}
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <Quote className="w-4 h-4 text-white/[0.05] absolute top-5 right-5" />
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-9 h-9 rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center text-xs font-bold text-white',
                      r.avatar_color ?? 'from-violet-500 to-fuchsia-600',
                    )}>
                      {r.avatar_letter ?? r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white leading-tight">{r.name}</p>
                      {r.handle && <p className="text-[11px] text-zinc-600">{r.handle}</p>}
                    </div>
                    {r.tag && (
                      <span className="ml-auto text-[10px] font-medium text-zinc-600 border border-white/[0.06] rounded-full px-2 py-0.5 shrink-0">{r.tag}</span>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[13px] text-zinc-500 leading-relaxed flex-1">"{r.body}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative py-28 overflow-hidden border-t border-white/[0.06]">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-b from-violet-600/[0.07] to-transparent blur-[80px] pointer-events-none" />

        <div ref={ctaView.ref} className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <div
            className={cn(
              'inline-flex items-center gap-2 border border-white/[0.10] bg-white/[0.02] rounded-full px-4 py-1.5 text-[12px] text-zinc-400 mb-8',
              'transition-all duration-700 ease-out',
              ctaView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '0ms' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Start creating today
          </div>

          <h2
            className={cn(
              'text-5xl md:text-6xl font-extrabold tracking-[-0.03em] leading-[1.0] mb-6',
              'transition-all duration-700 ease-out',
              ctaView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '100ms' }}
          >
            Ready to go viral with{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Affilify?
            </span>
          </h2>

          <p
            className={cn(
              'text-[15px] text-zinc-500 mb-10 leading-relaxed',
              'transition-all duration-700 ease-out',
              ctaView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '200ms' }}
          >
            Create your account and generate your first TikTok affiliate video in under 2 minutes.
          </p>

          <div
            className={cn(
              'flex flex-col sm:flex-row items-center justify-center gap-4',
              'transition-all duration-700 ease-out',
              ctaView.inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
            )}
            style={{ transitionDelay: '300ms' }}
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-white text-[#0a0a0a] hover:bg-zinc-100 font-semibold px-8 py-3.5 rounded-full text-[15px] transition-all duration-200"
            >
              Get started free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/login" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors">
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">

          {/* Brand col */}
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 w-fit">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                <Video className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-[15px] tracking-tight">Affilify</span>
            </Link>
            <p className="text-[13px] text-zinc-600 leading-relaxed max-w-[220px]">
              Turn product images into TikTok-ready affiliate videos in under 2 minutes using AI.
            </p>
            <p className="text-[11px] text-zinc-700 mt-auto">© {CURRENT_YEAR} Affilify. All rights reserved.</p>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-2">Product</span>
            <a href="#features" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Features</a>
            <a href="#how-it-works" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">How it works</a>
            <a href="#pricing" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Pricing</a>
            <Link href="/signup" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Sign up</Link>
            <Link href="/login" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Sign in</Link>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-2">Features</span>
            <span className="text-[13px] text-zinc-600">Avatar Builder</span>
            <span className="text-[13px] text-zinc-600">AI Image Generation</span>
            <span className="text-[13px] text-zinc-600">Ken Burns Video</span>
            <span className="text-[13px] text-zinc-600">Multi-Variation Batch</span>
            <span className="text-[13px] text-zinc-600">MP4 Export</span>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600 mb-2">Legal</span>
            <Link href="/terms" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Terms of Service</Link>
            <Link href="/privacy" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Privacy Policy</Link>
            <Link href="/cookies" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Cookie Policy</Link>
            <Link href="/refunds" className="text-[13px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
