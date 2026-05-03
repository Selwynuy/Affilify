import { BrandLogo } from '@/components/brand-logo'

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-brand-bg)' }}>
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden border-r border-white/[0.06]"
        style={{ background: '#1a1f27' }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'rgba(139,92,246,0.18)' }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <BrandLogo size={64} className="mb-8 drop-shadow-[0_0_28px_rgba(139,92,246,0.25)]" />

          <span className="inline-flex items-center gap-2 mb-4 rounded-full border border-brand-accent/30 bg-brand-accent/15 px-3 py-1 text-[11px] font-semibold text-brand-accent uppercase tracking-widest">
            Early access invite
          </span>

          <h1
            className="text-4xl font-black text-brand-text uppercase mb-3 leading-[0.85]"
            style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}
          >
            Welcome in.
          </h1>
          <p className="text-brand-text/50 text-base leading-relaxed">
            Your spot just opened up. Set a password and you&rsquo;ll be generating
            AI fashion content in under a minute.
          </p>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6"
        style={{ background: 'var(--color-brand-bg)' }}
      >
        <div className="lg:hidden flex flex-col items-center gap-2 mb-6">
          <BrandLogo size={40} />
          <span
            className="text-sm font-black uppercase tracking-widest text-brand-text"
            style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif" }}
          >
            Genetrify
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
