function LoadingRow() {
  return <div className="h-14 animate-pulse rounded-xl border border-white/8 bg-white/[0.02]" />
}

export default function Loading() {
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-end gap-4">
        <div className="h-10 w-36 animate-pulse rounded-xl bg-white/[0.06]" />
      </div>

      <div className="space-y-1">
        <div className="h-8 w-40 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-4 w-56 animate-pulse rounded bg-white/[0.05]" />
      </div>

      <div className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <div className="h-11 w-full max-w-sm animate-pulse rounded-xl bg-white/[0.05]" />
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="h-11 flex-1 animate-pulse rounded-xl bg-white/[0.05]" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-white/[0.05] md:w-56" />
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <LoadingRow key={index} />
        ))}
      </div>
    </div>
  )
}
