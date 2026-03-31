import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string
  imageClassName?: string
  size?: number
}

export function BrandLogo({ className, imageClassName, size = 28 }: BrandLogoProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/logo.png"
        alt="Genetrify logo"
        fill
        sizes={`${size}px`}
        className={cn('object-contain', imageClassName)}
        priority
      />
    </div>
  )
}
