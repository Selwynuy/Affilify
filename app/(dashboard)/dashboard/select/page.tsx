'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Placeholder images — replaced by real generated images from API
const PLACEHOLDER_IMAGES = [
  { id: '1', url: 'https://placehold.co/360x640/1c1c1c/555?text=Image+1' },
  { id: '2', url: 'https://placehold.co/360x640/1c1c1c/555?text=Image+2' },
  { id: '3', url: 'https://placehold.co/360x640/1c1c1c/555?text=Image+3' },
  { id: '4', url: 'https://placehold.co/360x640/1c1c1c/555?text=Image+4' },
]

export default function SelectPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Select Images</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Pick the images you want to turn into videos. Each selected image = one video.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {PLACEHOLDER_IMAGES.map(({ id, url }) => (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={cn(
              'relative rounded-lg overflow-hidden border-2 transition-all aspect-[9/16]',
              selected.has(id)
                ? 'border-white ring-2 ring-white/20'
                : 'border-zinc-700 hover:border-zinc-500'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Generated image ${id}`} className="w-full h-full object-cover" />
            {selected.has(id) && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <span className="text-black text-xs font-bold">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <Badge variant="outline" className="border-zinc-700 text-zinc-400">
          {selected.size} selected
        </Badge>
        <Link href="/dashboard/export">
          <Button
            disabled={selected.size === 0}
            className="bg-white text-black hover:bg-zinc-200"
          >
            Convert to video{selected.size > 1 ? `s (${selected.size})` : ''} →
          </Button>
        </Link>
      </div>
    </div>
  )
}
