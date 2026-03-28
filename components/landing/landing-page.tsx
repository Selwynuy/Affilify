'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  ChevronRight,
  ShoppingBag,
  Check,
  Quote,
} from 'lucide-react'
import { useState, useEffect } from 'react'
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
    monthlyPrice: 19,
    annualPrice: 15,
    tokens: '4,500',
    runs: '~51',
    popular: false,
    features: [
      '4,500 tokens / month',
      '~51 full video runs',
      'Standard AI models',
      '3 GB storage',
      'Image approval flow',
      'Motion templates',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 39,
    annualPrice: 31,
    tokens: '10,000',
    runs: '~113',
    popular: true,
    features: [
      '10,000 tokens / month',
      '~113 full video runs',
      'Standard + Pro models',
      '10 GB storage',
      '30-day token rollover',
      'Everything in Starter',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 89,
    annualPrice: 71,
    tokens: '24,000',
    runs: '~186',
    popular: false,
    features: [
      '24,000 tokens / month',
      '~186 full video runs',
      'Standard + Pro models',
      '15 GB storage',
      '30-day token rollover',
      'Everything in Growth',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 199,
    annualPrice: 159,
    tokens: '65,000',
    runs: '~500',
    popular: false,
    features: [
      '65,000 tokens / month',
      '~500 full video runs',
      'All models incl. Elite',
      '50 GB storage',
      '60-day token rollover',
      'Priority queue',
    ],
  },
]

const CURRENT_YEAR = new Date().getFullYear()

function PricingToggle() {
  const [annual, setAnnual] = useState(false)

  return (
    <>
      {/* Toggle */}
      <div className="inline-flex items-center gap-3 mb-12">
        <span className={cn('text-sm transition-colors', !annual ? 'text-white' : 'text-zinc-500')}>Monthly</span>
        <button
          onClick={() => setAnnual((a) => !a)}
          className={cn(
            'relative w-11 h-6 rounded-full border transition-all duration-200',
            annual ? 'bg-violet-600 border-violet-500' : 'bg-white/10 border-white/15',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200',
              annual ? 'left-[calc(100%-1.375rem)]' : 'left-0.5',
            )}
          />
        </button>
        <span className={cn('text-sm transition-colors flex items-center gap-1.5', annual ? 'text-white' : 'text-zinc-500')}>
          Annual
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">2 months free</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS_DISPLAY.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-300',
              plan.popular
                ? 'border-fuchsia-500/50 bg-gradient-to-b from-fuchsia-500/[0.07] to-transparent'
                : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]',
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-[10px] font-bold text-white whitespace-nowrap tracking-wide uppercase">
                Most Popular
              </div>
            )}

            <div className="mb-5">
              <p className="text-sm font-semibold text-white/70 mb-3">{plan.name}</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold text-white">
                  ${annual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                <span className="text-sm text-zinc-500 mb-1">/mo</span>
              </div>
              {annual && (
                <p className="text-xs text-emerald-400 mt-1">billed annually</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Zap className="w-3 h-3 text-violet-400 shrink-0" />
                <span className="text-xs text-zinc-400">{plan.tokens} tokens · {plan.runs} runs</span>
              </div>
            </div>

            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                  <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className={cn(
                'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                plan.popular
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white',
              )}
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-600 mt-8">
        All plans include a token top-up option. No contracts — cancel anytime.
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

  return (
    <div className="min-h-screen bg-[#07050f] text-white overflow-x-hidden">

      {/* Navbar */}
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 py-5',
          scrolled && 'bg-[#07050f]/80 backdrop-blur-md border-b border-white/5'
        )}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center">
          <div className="flex-1 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Affilify</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex-1 flex items-center justify-end gap-3">
            {user ? (
              <NavbarUserMenu email={user.email} />
            ) : (
              <NavbarGuestButtons />
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
        <div className="absolute inset-0 z-0">
          <Image
            src="/Affilify-hero.png"
            alt=""
            fill
            className="object-cover object-center opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07050f]/30 via-transparent to-[#07050f]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_30%,#07050f_100%)]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-powered TikTok affiliate videos</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Turn Products Into{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Viral Videos
            </span>
            <br />in Under 2 Minutes
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your face + product images. Affilify generates AI model photos
            and converts them into scroll-stopping 9:16 TikTok videos — instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 text-base"
            >
              Get started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-8 py-3.5 rounded-xl transition-all duration-200 text-base backdrop-blur-sm"
            >
              <Play className="w-4 h-4 text-violet-400" />
              See how it works
            </a>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                <div className="w-7 h-7 rounded-full bg-violet-500 border-2 border-[#07050f]" />
                <div className="w-7 h-7 rounded-full bg-fuchsia-500 border-2 border-[#07050f]" />
                <div className="w-7 h-7 rounded-full bg-pink-500 border-2 border-[#07050f]" />
                <div className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-[#07050f]" />
              </div>
              <span>Join 2,400+ creators</span>
            </div>
            <span className="hidden sm:block text-zinc-700">|</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1">4.9/5 from 800+ reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '10x', label: 'Faster than manual editing' },
            { value: '9:16', label: 'TikTok-native format' },
            { value: '5–10s', label: 'Videos per generation' },
            { value: '100%', label: 'AI-generated model shots' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-3xl font-extrabold text-white">{value}</span>
              <span className="text-sm text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3 block">Features</span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              go viral
            </span>
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto">
            Affilify handles the entire pipeline — from face upload to ready-to-post video.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Large — AI Image Generation */}
          <div className="md:col-span-2 group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 overflow-hidden transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <ImageIcon className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Model Image Generation</h3>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mb-6">
              Upload your face once. Affilify composites it onto AI-generated model
              bodies wearing your product — no studio, no photographer needed.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 aspect-[9/16] rounded-lg bg-violet-900/30 border border-white/5 flex items-end p-2">
                <div className="w-full h-1.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 aspect-[9/16] rounded-lg bg-fuchsia-900/30 border border-white/5 flex items-end p-2">
                <div className="w-full h-1.5 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 aspect-[9/16] rounded-lg bg-indigo-900/30 border border-white/5 flex items-end p-2">
                <div className="w-full h-1.5 rounded-full bg-white/10" />
              </div>
            </div>
          </div>

          {/* Ken Burns Video */}
          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 overflow-hidden transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <Video className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ken Burns Motion Video</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Each image gets cinematic zoom &amp; pan effects, outputting a native
              9:16 MP4 ready for TikTok or Reels.
            </p>
            <div className="mt-6 aspect-video rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Play className="w-5 h-5 text-fuchsia-400 ml-0.5" />
              </div>
            </div>
          </div>

          {/* Multi-variation */}
          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 overflow-hidden transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Multi-Variation Batch</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Upload 1–5 product images and get a unique video for every one. A/B test
              creatives at scale — 10 videos in 10 minutes.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={cn(
                    'flex-1 h-1.5 rounded-full transition-all duration-300',
                    n <= 3 ? 'bg-indigo-500' : 'bg-white/10'
                  )}
                />
              ))}
              <span className="text-xs text-zinc-600 ml-1">3/5</span>
            </div>
          </div>

          {/* Avatar Builder */}
          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 overflow-hidden transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <Users className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Personal Avatar Builder</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Set your gender and body type once. Your avatar is saved and applied
              automatically to every new generation.
            </p>
          </div>

          {/* Instant Download */}
          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 overflow-hidden transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">One-Click MP4 Export</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Download your finished videos as MP4s — no watermarks, no platform lock-in.
              Post anywhere instantly.
            </p>
          </div>

          {/* Wide — Speed */}
          <div className="md:col-span-3 group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 overflow-hidden transition-all duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="flex-1">
                <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Built for Affiliate Speed</h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                  Volume beats polish in affiliate marketing. Affilify's entire UX is designed
                  around one goal: generate the most test videos, the fastest — so you find
                  your winner before your competition does.
                </p>
              </div>
              <div className="flex gap-8 shrink-0">
                {[
                  { label: 'Videos / session', value: '10+' },
                  { label: 'Avg. gen time', value: '< 2m' },
                  { label: 'Products tested', value: '∞' },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-3xl font-extrabold text-white">{value}</div>
                    <div className="text-xs text-zinc-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white/[0.02] border-y border-white/5 py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400 mb-3 block">How it works</span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              From upload to TikTok in{' '}
              <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                4 steps
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-[1.75rem] left-[12.5%] right-[12.5%] h-px bg-white/5" />

            <div className="flex flex-col items-center text-center group">
              <div className="relative w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-violet-500/40 transition-all duration-300">
                <Users className="w-6 h-6 text-violet-400" />
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-violet-400 bg-[#07050f] border border-violet-500/30 rounded-full w-5 h-5 flex items-center justify-center">1</span>
              </div>
              <h3 className="font-semibold text-base mb-2">Build your avatar</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Upload a face photo and set your gender / body type once.</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="relative w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-fuchsia-500/40 transition-all duration-300">
                <ShoppingBag className="w-6 h-6 text-fuchsia-400" />
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-fuchsia-400 bg-[#07050f] border border-fuchsia-500/30 rounded-full w-5 h-5 flex items-center justify-center">2</span>
              </div>
              <h3 className="font-semibold text-base mb-2">Upload products</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Drop in 1–5 product images you want to feature.</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="relative w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-pink-500/40 transition-all duration-300">
                <Sparkles className="w-6 h-6 text-pink-400" />
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-pink-400 bg-[#07050f] border border-pink-500/30 rounded-full w-5 h-5 flex items-center justify-center">3</span>
              </div>
              <h3 className="font-semibold text-base mb-2">AI generates images</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Imagen composites your face onto model shots with the product.</p>
            </div>

            <div className="flex flex-col items-center text-center group">
              <div className="relative w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-emerald-500/40 transition-all duration-300">
                <Download className="w-6 h-6 text-emerald-400" />
                <span className="absolute -top-2 -right-2 text-[10px] font-bold text-emerald-400 bg-[#07050f] border border-emerald-500/30 rounded-full w-5 h-5 flex items-center justify-center">4</span>
              </div>
              <h3 className="font-semibold text-base mb-2">Export &amp; post</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Select your favourites and download 9:16 MP4s instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-pink-400 mb-3 block">Use cases</span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            One product,{' '}
            <span className="bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
              endless creatives
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-pink-500/15 border border-pink-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <TrendingUp className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">TikTok Shop</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Generate dozens of product showcase clips per day to keep your TikTok Shop feed stocked with fresh content.</p>
          </div>

          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Dropshipping</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Test 10 different products in one afternoon. Kill losers fast, scale winners with more video variations.</p>
          </div>

          <div className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-8 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
              <BarChart2 className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">A/B Creative Testing</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Each generation produces N unique clips from N images. Run them as organic posts or paid ads and let data decide.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-28">
        <div className="text-center mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3 block">Pricing</span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Pay for what you{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              actually use
            </span>
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto mb-10">
            Token-based pricing — every generation deducts tokens from your balance. Upgrade or top up anytime.
          </p>

          {/* Interval toggle */}
          <PricingToggle />
        </div>
      </section>

      {/* Reviews — only rendered when real approved reviews exist */}
      {reviews.length > 0 && (
        <section className="bg-white/[0.02] border-y border-white/5 py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-xs font-semibold uppercase tracking-widest text-fuchsia-400 mb-3 block">Reviews</span>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Loved by{' '}
                <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  creators worldwide
                </span>
              </h2>
              {reviews.length >= 3 && (
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-2 text-sm text-zinc-400">
                    {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)} / 5 · {reviews.length} reviews
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] p-6 flex flex-col gap-4 transition-all duration-300"
                >
                  <Quote className="w-5 h-5 text-white/10 absolute top-5 right-5" />
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center text-sm font-bold text-white',
                      r.avatar_color ?? 'from-violet-500 to-fuchsia-600',
                    )}>
                      {r.avatar_letter ?? r.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{r.name}</p>
                      {r.handle && <p className="text-xs text-zinc-500">{r.handle}</p>}
                    </div>
                    {r.tag && (
                      <span className="ml-auto text-[10px] font-medium text-white/30 border border-white/10 rounded-full px-2 py-0.5 shrink-0">{r.tag}</span>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed flex-1">"{r.body}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(139,92,246,0.08),transparent)]" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <span className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Start creating today
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Ready to go viral with{' '}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Affilify?
            </span>
          </h2>
          <p className="text-zinc-500 text-lg mb-10">
            Create your account and generate your first TikTok affiliate video in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold px-10 py-4 rounded-xl transition-all duration-200 text-base"
            >
              Get started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
              Already have an account? Sign in
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">

          {/* Brand col */}
          <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-base">Affilify</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
              Turn product images into TikTok-ready affiliate videos in under 2 minutes using AI.
            </p>
            <p className="text-xs text-zinc-700 mt-auto">© {CURRENT_YEAR} Affilify. All rights reserved.</p>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Product</span>
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <Link href="/signup" className="text-sm text-zinc-400 hover:text-white transition-colors">Sign up</Link>
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">Sign in</Link>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Features</span>
            <span className="text-sm text-zinc-400">Avatar Builder</span>
            <span className="text-sm text-zinc-400">AI Image Generation</span>
            <span className="text-sm text-zinc-400">Ken Burns Video</span>
            <span className="text-sm text-zinc-400">Multi-Variation Batch</span>
            <span className="text-sm text-zinc-400">MP4 Export</span>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">Legal</span>
            <Link href="/terms" className="text-sm text-zinc-400 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="text-sm text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/cookies" className="text-sm text-zinc-400 hover:text-white transition-colors">Cookie Policy</Link>
            <Link href="/refunds" className="text-sm text-zinc-400 hover:text-white transition-colors">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
