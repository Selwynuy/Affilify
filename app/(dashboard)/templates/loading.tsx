function LoadingCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-brand-surface">
      <div className="aspect-[2/3] w-full animate-pulse bg-white/[0.06]" />
      <div className="space-y-2 border-t border-white/[0.07] px-3 py-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="max-w-5xl space-y-8">
      <div className="space-y-2">
        <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-8 w-40 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/[0.05]" />
      </div>

      <div className="h-12 w-full max-w-md animate-pulse rounded-xl border border-white/[0.07] bg-brand-bg" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <LoadingCard key={index} />
        ))}
      </div>
    </div>
  )
}
