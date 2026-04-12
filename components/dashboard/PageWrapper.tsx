import { cn } from '@/lib/utils'

// Restores the standard padded, max-width-constrained page area for non-studio dashboard pages.
export function PageWrapper({
  children,
  className,
}: {
  children: React.ReactNode
  /** Applied to the inner width-constrained container (e.g. max-w-6xl for dense grids). */
  className?: string
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden pt-20 lg:pt-10 px-4 pb-10 sm:px-6 md:px-10 md:pt-10">
      <div className={cn('mx-auto w-full max-w-5xl', className)}>
        {children}
      </div>
    </div>
  )
}
