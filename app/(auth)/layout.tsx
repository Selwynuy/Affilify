export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-brand-bg)' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden border-r border-white/[0.06]" style={{ background: '#1a1f27' }}>
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px]" />
        {/* Teal glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,173,181,0.07)' }} />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Logo mark */}
          <div className="w-16 h-16 rounded-2xl bg-brand-accent flex items-center justify-center mb-8 shadow-lg shadow-brand-accent/20">
            <svg className="w-8 h-8 text-brand-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>

          <h1 className="text-4xl font-black text-brand-text uppercase mb-3 leading-[0.85]" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif", letterSpacing: '-0.01em' }}>Genetrify</h1>
          <p className="text-brand-text/50 text-base leading-relaxed mb-10">
            Build your AI model. Dress it in your products. Generate videos — instantly.
          </p>

          {/* Mini feature list */}
          <ul className="space-y-3 text-left w-full">
            {[
              'Upload your face — build a custom AI model',
              'Dress it in any product you sell',
              'Export 9:16 videos ready for TikTok',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-brand-text/70">
                <span className="w-5 h-5 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6" style={{ background: 'var(--color-brand-bg)' }}>
        {/* Mobile logo — visible only on small screens */}
        <div className="lg:hidden flex flex-col items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20">
            <svg className="w-5 h-5 text-brand-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <span className="text-sm font-black uppercase tracking-widest text-brand-text" style={{ fontFamily: "'Bebas Neue', 'Arial Black', sans-serif" }}>Genetrify</span>
        </div>
        {children}
      </div>
    </div>
  )
}
