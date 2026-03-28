'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CheckCircle2, Camera, Sparkles, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MOTION_TEMPLATES } from '@/lib/data/templates'
import { usePreferences } from '@/lib/context/preferences-context'
import type { MotionTemplate } from '@/lib/types/templates'

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: MotionTemplate
  isSelected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const hasPreview = !!template.previewUrl

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative flex flex-col rounded-2xl border overflow-hidden text-left transition-all duration-150',
        isSelected
          ? 'border-violet-500 ring-1 ring-violet-500/50 shadow-lg shadow-violet-500/10'
          : 'border-white/10 hover:border-white/25',
      )}
    >
      {/* Media area — 9:16 */}
      <div className="relative aspect-[9/16] bg-white/5 w-full overflow-hidden">

        {/* Static thumbnail always present */}
        <img
          src={template.thumbnailUrl}
          alt={template.name}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-200',
            hovered && hasPreview ? 'opacity-0' : 'opacity-100',
          )}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />

        {/* GIF/video preview — loads only on hover */}
        {hasPreview && hovered && (
          <img
            src={template.previewUrl}
            alt={`${template.name} preview`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* "Hover to preview" hint — only shown if preview exists and not yet hovered */}
        {hasPreview && !hovered && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
            <Play className="w-2.5 h-2.5 text-white/70 fill-white/70" />
            <span className="text-[9px] text-white/60 font-medium">Preview</span>
          </div>
        )}

        {/* No preview placeholder */}
        {!hasPreview && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
            <span className="text-[9px] text-white/30">Preview coming</span>
          </div>
        )}

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        )}

        {/* Badge */}
        {template.badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-violet-600/90 text-[9px] font-semibold text-white backdrop-blur-sm">
            {template.badge}
          </div>
        )}

        {/* Hover overlay tint */}
        {!isSelected && (
          <div className="absolute inset-0 bg-violet-500/0 group-hover:bg-violet-500/8 transition-colors duration-150" />
        )}

        {/* Selected overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-violet-500/10" />
        )}
      </div>

      {/* Info */}
      <div className={cn(
        'px-3 py-2.5 border-t space-y-0.5 transition-colors',
        isSelected
          ? 'bg-violet-500/8 border-violet-500/30'
          : 'bg-white/[0.02] border-white/8 group-hover:bg-white/[0.04]',
      )}>
        <p className={cn('text-sm font-medium leading-tight', isSelected ? 'text-white' : 'text-white/80')}>
          {template.name}
        </p>
        <p className="text-[11px] text-white/40 leading-snug">{template.description}</p>
      </div>
    </button>
  )
}

export default function TemplatesPage() {
  const { cameraTemplateId, movementTemplateId, setCameraTemplateId, setMovementTemplateId } = usePreferences()
  const [selectedCamera, setSelectedCamera] = useState(cameraTemplateId)
  const [selectedMovement, setSelectedMovement] = useState(movementTemplateId)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const cameraTemplates = MOTION_TEMPLATES.filter((t) => t.category === 'camera')
  const movementTemplates = MOTION_TEMPLATES.filter((t) => t.category === 'movement')

  const hasChanges = selectedCamera !== cameraTemplateId || selectedMovement !== movementTemplateId

  function handleSave() {
    startTransition(async () => {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_template_id: selectedCamera,
          movement_template_id: selectedMovement,
        }),
      })
      setCameraTemplateId(selectedCamera)
      setMovementTemplateId(selectedMovement)
      router.push('/dashboard')
    })
  }

  return (
    <div className="space-y-10 max-w-5xl">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-white">Motion Templates</h1>
        <p className="text-sm text-white/50">
          Pick one camera angle and one movement style. Hover any card to preview the motion.
        </p>
      </div>

      {/* Camera angles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Camera className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Camera Angle</h2>
            <p className="text-[11px] text-white/35">Sets the framing of your AI image</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {cameraTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedCamera === template.id}
              onSelect={() => setSelectedCamera(template.id)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-white/8" />

      {/* Model movements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Movement Style</h2>
            <p className="text-[11px] text-white/35">The motion your model performs in the video</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {movementTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedMovement === template.id}
              onSelect={() => setSelectedMovement(template.id)}
            />
          ))}
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-6 flex items-center gap-4 pt-4 border-t border-white/8">
        <Button
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          className="h-10 px-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white disabled:opacity-30 font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20"
        >
          {isPending ? 'Saving…' : hasChanges ? 'Save & go to Studio' : 'No changes'}
        </Button>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Cancel
        </button>
        {hasChanges && (
          <p className="ml-auto text-xs text-white/25 hidden sm:block">
            Unsaved changes
          </p>
        )}
      </div>
    </div>
  )
}
