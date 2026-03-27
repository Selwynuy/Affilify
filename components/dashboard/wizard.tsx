'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedImage { id: string; url: string }
interface VideoResult { imageId: string; blobUrl: string; filename: string }

// Template variable values — keys match the template's {{variable}} slots
type TemplateVars = Record<string, string | number>

interface VideoMotionTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: { key: string; label: string; type: string; options?: string[]; default: string }[]
}

interface WizardState {
  projectId: string | null
  faceFile: File | null
  // avatar fields
  gender: string
  height: number
  weight: number
  roomAesthetic: string
  cameraAngle: string
  focalLength: string
  outfitTop: string
  outfitBottom: string
  shoes: string
  roomColors: string
  roomElements: string
  // product
  productFiles: File[]
  productDescription: string
  // template
  templateVars: TemplateVars
  // generation outputs
  generatedImages: GeneratedImage[]
  lastPrompt: string
  selectedImageIds: Set<string>
  // video
  selectedMotionTemplate: VideoMotionTemplate | null
  videoPromptVars: TemplateVars
  videos: VideoResult[]
}

const INITIAL_STATE: WizardState = {
  projectId: null,
  faceFile: null,
  gender: 'man',
  height: 175,
  weight: 70,
  roomAesthetic: 'masculine',
  cameraAngle: 'directly above the subject at 45° high-angle overhead',
  focalLength: '35-50mm (natural, balanced)',
  outfitTop: 'a plain white t-shirt',
  outfitBottom: 'dark slim-fit pants',
  shoes: 'Adidas Samba OG white gum shoes',
  roomColors: 'white and black',
  roomElements: 'a dark gray round shag rug, an open black clothes rack with streetwear jackets, a tiered black shoe rack with sneakers, minimalist black-framed posters, a low-profile bed with black sheets, warm LED strips behind shelves, soft natural light from a window',
  productFiles: [],
  productDescription: '',
  templateVars: {},
  generatedImages: [],
  lastPrompt: '',
  selectedImageIds: new Set(),
  selectedMotionTemplate: null,
  videoPromptVars: {},
  videos: [],
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

const STEPS = ['Model & Scene', 'Product & Outfit', 'Generate', 'Select', 'Export']

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full">
      {STEPS.map((label, i) => {
        const stepNum = i + 1
        const done = stepNum < current
        const active = stepNum === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                done && 'bg-white text-black',
                active && 'bg-zinc-700 text-white ring-2 ring-white/30',
                !done && !active && 'bg-zinc-800 text-zinc-500',
              )}>
                {done ? '✓' : stepNum}
              </div>
              <span className={cn(
                'text-[10px] hidden sm:block',
                active ? 'text-white' : done ? 'text-zinc-400' : 'text-zinc-600',
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px mx-2 mb-4 transition-colors', done ? 'bg-white/40' : 'bg-zinc-800')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SelectPills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          className={cn('px-3 py-1.5 rounded-md text-sm transition-colors',
            value === o ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700')}>
          {o}
        </button>
      ))}
    </div>
  )
}

function NumberInput({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-white"
      />
      <span className="text-zinc-200 text-sm w-14 text-right tabular-nums">{value}</span>
    </div>
  )
}

function TextInput({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
    />
  )
}

function TextareaInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea value={value} rows={3}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
    />
  )
}

// ─── Step 1: Model & Scene ────────────────────────────────────────────────────

function StepModel({ state, onChange, onSavePreferences }: {
  state: WizardState
  onChange: (p: Partial<WizardState>) => void
  onSavePreferences: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSavePreferences()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Model & Scene</h2>
        <p className="text-zinc-400 text-sm mt-1">Upload a face and configure the model body and scene style.</p>
      </div>

      {/* Face photo */}
      <div className="space-y-2">
        <Label htmlFor="face" className="text-zinc-300">Face photo <span className="text-red-400">*</span></Label>
        <input id="face" type="file" accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange({ faceFile: f }) }}
          className="block w-full text-sm text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600 cursor-pointer"
        />
        {state.faceFile && <p className="text-xs text-zinc-500">{state.faceFile.name}</p>}
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Gender</Label>
        <SelectPills options={['man', 'woman']} value={state.gender} onChange={(v) => onChange({ gender: v })} />
      </div>

      {/* Height */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Height — <span className="text-zinc-400">{state.height} cm</span></Label>
        <NumberInput value={state.height} min={150} max={210} onChange={(v) => onChange({ height: v })} />
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Weight — <span className="text-zinc-400">{state.weight} kg</span></Label>
        <NumberInput value={state.weight} min={45} max={120} onChange={(v) => onChange({ weight: v })} />
      </div>

      <div className="border-t border-zinc-800 pt-5 space-y-5">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Scene</p>

        {/* Room aesthetic */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Room aesthetic</Label>
          <SelectPills
            options={['masculine', 'feminine', 'minimalist', 'streetwear', 'luxury']}
            value={state.roomAesthetic}
            onChange={(v) => onChange({ roomAesthetic: v })}
          />
        </div>

        {/* Room colors */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Room colors</Label>
          <SelectPills
            options={['white and black', 'warm beige and wood tones', 'grey and navy', 'all white minimalist', 'dark moody tones']}
            value={state.roomColors}
            onChange={(v) => onChange({ roomColors: v })}
          />
        </div>

        {/* Camera angle */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Camera angle</Label>
          <SelectPills
            options={[
              'directly above the subject at 45° high-angle overhead',
              'at eye level, straight on',
              'slightly below eye level looking up',
              'from the side at 90°',
            ]}
            value={state.cameraAngle}
            onChange={(v) => onChange({ cameraAngle: v })}
          />
        </div>

        {/* Focal length */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Focal length</Label>
          <SelectPills
            options={['24-35mm (wide, environmental)', '35-50mm (natural, balanced)', '50-85mm (portrait, compressed)']}
            value={state.focalLength}
            onChange={(v) => onChange({ focalLength: v })}
          />
        </div>

        {/* Room elements */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Room elements</Label>
          <TextareaInput value={state.roomElements} onChange={(v) => onChange({ roomElements: v })} />
          <p className="text-xs text-zinc-600">Furniture, decor, lighting — anything visible in the scene</p>
        </div>
      </div>

      {/* Save preferences */}
      <div className="border-t border-zinc-800 pt-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-300">Save as my defaults</p>
          <p className="text-xs text-zinc-600">Auto-loads every time you start a new project</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 text-sm px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save defaults'}
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Product & Outfit ─────────────────────────────────────────────────

function StepProducts({ state, onChange }: { state: WizardState; onChange: (p: Partial<WizardState>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Product & Outfit</h2>
        <p className="text-zinc-400 text-sm mt-1">Upload product images and describe what the model is wearing.</p>
      </div>

      {/* Product images */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Product images <span className="text-red-400">*</span></Label>
        <input
          type="file" accept="image/*" multiple
          onChange={(e) => onChange({ productFiles: Array.from(e.target.files ?? []).slice(0, 5) })}
          className="block w-full text-sm text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600 cursor-pointer"
        />
        <p className="text-xs text-zinc-600">1–5 images · Best results: front-facing, well-lit</p>
      </div>

      {state.productFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {state.productFiles.map((f) => (
            <div key={f.name} className="flex items-center gap-1.5 bg-zinc-800 rounded-md px-2.5 py-1">
              <span className="text-zinc-300 text-xs">{f.name}</span>
              <button onClick={() => onChange({ productFiles: state.productFiles.filter((x) => x.name !== f.name) })}
                className="text-zinc-500 hover:text-zinc-200 text-xs leading-none">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="desc" className="text-zinc-300">Product description <span className="text-zinc-600">(optional)</span></Label>
        <input
          id="desc" type="text"
          placeholder="e.g. wireless earbuds, yoga mat, face serum"
          value={state.productDescription}
          onChange={(e) => onChange({ productDescription: e.target.value })}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
        <p className="text-xs text-zinc-600">Helps the AI understand the product</p>
      </div>

      {/* Outfit */}
      <div className="border-t border-zinc-800 pt-5 space-y-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Outfit</p>
        <p className="text-xs text-zinc-600 -mt-2">What the model is wearing in the generated image</p>

        <div className="space-y-2">
          <Label className="text-zinc-300">Top</Label>
          <TextInput value={state.outfitTop} placeholder="e.g. plain white t-shirt" onChange={(v) => onChange({ outfitTop: v })} />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300">Bottom</Label>
          <TextInput value={state.outfitBottom} placeholder="e.g. dark slim-fit pants" onChange={(v) => onChange({ outfitBottom: v })} />
        </div>

        <div className="space-y-2">
          <Label className="text-zinc-300">Shoes</Label>
          <TextInput value={state.shoes} placeholder="e.g. Adidas Samba OG white gum" onChange={(v) => onChange({ shoes: v })} />
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Generate ─────────────────────────────────────────────────────────

function StepGenerate({ state, onChange }: { state: WizardState; onChange: (p: Partial<WizardState>) => void }) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'generating' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleGenerate() {
    setStatus('uploading')
    setErrorMsg('')

    try {
      // Upload face + products, create project
      const fd = new FormData()
      // Pass all avatar fields so the server stores them on the project
      fd.append('gender', state.gender)
      fd.append('height', String(state.height))
      fd.append('weight', String(state.weight))
      fd.append('roomAesthetic', state.roomAesthetic)
      fd.append('cameraAngle', state.cameraAngle)
      fd.append('focalLength', state.focalLength)
      fd.append('outfitTop', state.outfitTop)
      fd.append('outfitBottom', state.outfitBottom)
      fd.append('shoes', state.shoes)
      fd.append('roomColors', state.roomColors)
      fd.append('roomElements', state.roomElements)
      if (state.faceFile) fd.append('face', state.faceFile)
      state.productFiles.forEach((f) => fd.append('products', f))
      if (state.projectId) fd.append('projectId', state.projectId)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error ?? 'Upload failed')

      const projectId: string = uploadData.projectId
      onChange({ projectId })

      setStatus('generating')

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          productDescription: state.productDescription,
        }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error ?? 'Generation failed')

      onChange({ generatedImages: genData.images, projectId, lastPrompt: genData.prompt ?? '' })
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStatus('error')
    }
  }

  if (status === 'done' || state.generatedImages.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Images generated</h2>
          <p className="text-zinc-400 text-sm mt-1">Continue to select which ones to use.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {state.generatedImages.map(({ id, url }, i) => (
            <div key={id} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-zinc-700 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Generated" className="w-full h-full object-cover" />
              <a
                href={url}
                download={`affilify-image-${i + 1}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap"
              >
                ↓ Save
              </a>
            </div>
          ))}
        </div>
        {state.lastPrompt && (
          <details className="group">
            <summary className="text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer select-none">
              View prompt used
            </summary>
            <p className="mt-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-md p-3 whitespace-pre-wrap leading-relaxed">
              {state.lastPrompt}
            </p>
          </details>
        )}
        <button
          onClick={() => { onChange({ generatedImages: [], lastPrompt: '' }); setStatus('idle') }}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Regenerate all
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Generate AI images</h2>
        <p className="text-zinc-400 text-sm mt-1">The AI generates 4 images of your avatar showcasing the product.</p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-1.5">
        <p className="text-sm text-zinc-300">Ready to generate</p>
        <p className="text-xs text-zinc-500">Face: {state.faceFile?.name ?? '—'}</p>
        <p className="text-xs text-zinc-500">Products: {state.productFiles.map((f) => f.name).join(', ') || '—'}</p>
        <p className="text-xs text-zinc-500">Avatar: {state.gender}, {state.height}cm, {state.weight}kg</p>
      </div>

      {(status === 'uploading' || status === 'generating') && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-white animate-spin shrink-0" />
            {status === 'uploading' ? 'Uploading files…' : 'Generating 4 images with Imagen 4…'}
          </div>
          <p className="text-xs text-zinc-600">This takes 20–40 seconds</p>
        </div>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}

      {(status === 'idle' || status === 'error') && (
        <Button onClick={handleGenerate} className="bg-white text-black hover:bg-zinc-200">
          Generate images
        </Button>
      )}
    </div>
  )
}

// ─── Step 4: Select ───────────────────────────────────────────────────────────

function StepSelect({ state, onChange }: { state: WizardState; onChange: (p: Partial<WizardState>) => void }) {
  function toggle(id: string) {
    const next = new Set(state.selectedImageIds)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange({ selectedImageIds: next })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Select images</h2>
        <p className="text-zinc-400 text-sm mt-1">Each selected image becomes one video.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {state.generatedImages.map(({ id, url }, i) => (
          <div key={id} className="relative group">
            <button onClick={() => toggle(id)}
              className={cn(
                'relative w-full rounded-lg overflow-hidden border-2 transition-all aspect-[9/16]',
                state.selectedImageIds.has(id) ? 'border-white ring-2 ring-white/20' : 'border-zinc-700 hover:border-zinc-500',
              )}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Generated" className="w-full h-full object-cover" />
              {state.selectedImageIds.has(id) && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <span className="text-black text-xs font-bold">✓</span>
                </div>
              )}
            </button>
            <a
              href={url}
              download={`affilify-image-${i + 1}.jpg`}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs px-2.5 py-1 rounded-md whitespace-nowrap z-10"
            >
              ↓ Save
            </a>
          </div>
        ))}
      </div>

      {state.selectedImageIds.size > 0 && (
        <p className="text-sm text-zinc-400">
          {state.selectedImageIds.size} image{state.selectedImageIds.size > 1 ? 's' : ''} → {state.selectedImageIds.size} video{state.selectedImageIds.size > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Video prompt template helpers ────────────────────────────────────────────

const BUILT_IN_MOTION_TEMPLATES: VideoMotionTemplate[] = [
  {
    id: 'collar-adjust',
    name: 'Collar Adjust',
    description: 'Step back, adjust collar, look at camera. Best for shirts and tops.',
    template:
      'A {{gender}} with an elegant style standing in an {{room_aesthetic}} bedroom, facing the camera. ' +
      'They clearly take one small step backward, then use both hands to adjust the collar of their {{outfit_top}} while looking downward. ' +
      'After a brief moment, they slowly lift their head and look directly at the camera with a calm and confident expression. ' +
      'Smooth, natural movement, static camera, aesthetic atmosphere. ' +
      'No speaking, no lip-sync, and no slow motion.',
    variables: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['young man', 'young woman', 'man', 'woman'], default: 'young man' },
      { key: 'room_aesthetic', label: 'Room aesthetic', type: 'select', options: ['masculine', 'feminine', 'minimalist', 'streetwear', 'luxury'], default: 'masculine' },
      { key: 'outfit_top', label: 'Outfit top', type: 'text', default: 'shirt' },
    ],
  },
  {
    id: '360-spin',
    name: '360° Spin',
    description: 'Full clockwise spin showcasing outfit from every angle.',
    template:
      'A {{gender}} with an elegant style standing in an {{room_aesthetic}} bedroom, performing a complete 360-degree spin clockwise in one continuous direction, making a full circle. ' +
      'They smoothly rotate through front, right side, back, left side, and front again, without stopping or reversing. ' +
      'The motion is elegant, uninterrupted, and confident, clearly showcasing their outfit from every angle. ' +
      'The camera stays static with a calm and aesthetic atmosphere. ' +
      'No speaking, no lip-sync, and no slow motion.',
    variables: [
      { key: 'gender', label: 'Gender', type: 'select', options: ['young man', 'young woman', 'man', 'woman'], default: 'young man' },
      { key: 'room_aesthetic', label: 'Room aesthetic', type: 'select', options: ['masculine', 'feminine', 'minimalist', 'streetwear', 'luxury'], default: 'masculine' },
    ],
  },
]

function fillVideoPrompt(template: VideoMotionTemplate, vars: TemplateVars): string {
  const merged: TemplateVars = {}
  for (const v of template.variables) merged[v.key] = vars[v.key] ?? v.default
  return template.template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in merged ? String(merged[key]) : `{{${key}}}`
  )
}

// ─── Step 5: Export ───────────────────────────────────────────────────────────

function StepExport({ state, onChange }: { state: WizardState; onChange: (p: Partial<WizardState>) => void }) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const selected = state.generatedImages.filter((img) => state.selectedImageIds.has(img.id))
  const tmpl = state.selectedMotionTemplate ?? BUILT_IN_MOTION_TEMPLATES[0]
  const filledPrompt = fillVideoPrompt(tmpl, {
    // seed with avatar values as defaults so user doesn't have to re-enter them
    gender: state.gender,
    room_aesthetic: state.roomAesthetic,
    outfit_top: state.outfitTop,
    ...state.videoPromptVars,
  })

  function setVar(key: string, value: string) {
    onChange({ videoPromptVars: { ...state.videoPromptVars, [key]: value } })
  }

  async function handleExport() {
    setStatus('generating')
    setProgress(`Generating video 1 of ${selected.length}…`)
    setErrorMsg('')

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: state.projectId,
          imageIds: selected.map((img) => img.id),
          imageUrls: selected.map((img) => img.url),
          motionPrompt: filledPrompt,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Export failed')

      onChange({
        videos: data.videos.map((v: { videoUrl: string }, i: number) => ({
          imageId: selected[i]?.id ?? String(i),
          blobUrl: v.videoUrl,
          filename: `affilify-video-${i + 1}.mp4`,
        })),
      })
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Export failed')
      setStatus('error')
    }
  }

  if (status === 'done' || state.videos.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Your videos are ready</h2>
          <p className="text-zinc-400 text-sm mt-1">Download your TikTok-ready 9:16 MP4s.</p>
        </div>
        <div className="space-y-3">
          {state.videos.map((v, i) => (
            <div key={v.imageId} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div>
                <p className="text-sm text-white font-medium">Video {i + 1}</p>
                <p className="text-xs text-zinc-500">9:16 · MP4 · Kling AI</p>
              </div>
              <a href={v.blobUrl} download={v.filename}
                className="inline-flex h-7 items-center justify-center rounded-lg border border-zinc-700 px-2.5 text-[0.8rem] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
                Download
              </a>
            </div>
          ))}
        </div>
        <button onClick={() => onChange({ videos: [] })}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          Regenerate videos
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Choose motion style</h2>
        <p className="text-zinc-400 text-sm mt-1">
          {selected.length} image{selected.length !== 1 ? 's' : ''} → {selected.length} video{selected.length !== 1 ? 's' : ''} via Kling AI.
        </p>
      </div>

      {/* Template picker */}
      <div className="space-y-2">
        <Label className="text-zinc-300">Motion template</Label>
        <div className="space-y-2">
          {BUILT_IN_MOTION_TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => onChange({ selectedMotionTemplate: t, videoPromptVars: {} })}
              className={cn(
                'w-full text-left rounded-lg border px-4 py-3 transition-colors',
                tmpl.id === t.id ? 'border-white bg-zinc-800' : 'border-zinc-700 hover:border-zinc-500',
              )}>
              <p className="text-sm font-medium text-white">{t.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Variable inputs for selected template */}
      <div className="space-y-4">
        <Label className="text-zinc-300">Motion settings</Label>
        {tmpl.variables.map((v) => (
          <div key={v.key} className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">{v.label}</Label>
            {v.type === 'select' && v.options ? (
              <SelectPills
                options={v.options}
                value={String(state.videoPromptVars[v.key] ?? v.default)}
                onChange={(val) => setVar(v.key, val)}
              />
            ) : (
              <TextInput
                value={String(state.videoPromptVars[v.key] ?? v.default)}
                onChange={(val) => setVar(v.key, val)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Filled prompt preview */}
      <details>
        <summary className="text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer select-none">
          View video prompt
        </summary>
        <p className="mt-2 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-md p-3 whitespace-pre-wrap leading-relaxed">
          {filledPrompt}
        </p>
      </details>

      {status === 'generating' && (
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-white animate-spin shrink-0" />
          {progress}
        </div>
      )}

      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

      {(status === 'idle' || status === 'error') && (
        <Button onClick={handleExport} className="bg-white text-black hover:bg-zinc-200">
          Generate {selected.length} video{selected.length !== 1 ? 's' : ''}
        </Button>
      )}
    </div>
  )
}

// ─── Wizard shell ─────────────────────────────────────────────────────────────

function canAdvance(step: number, state: WizardState): boolean {
  if (step === 1) return !!state.faceFile
  if (step === 2) return state.productFiles.length > 0
  if (step === 3) return state.generatedImages.length > 0
  if (step === 4) return state.selectedImageIds.size > 0
  return true
}

// Keys from WizardState that are saved/loaded as user preferences
const PREF_KEYS: (keyof WizardState)[] = [
  'gender', 'height', 'weight',
  'roomAesthetic', 'cameraAngle', 'focalLength',
  'outfitTop', 'outfitBottom', 'shoes',
  'roomColors', 'roomElements',
]

function extractPrefs(state: WizardState): Partial<WizardState> {
  return Object.fromEntries(PREF_KEYS.map((k) => [k, state[k]])) as Partial<WizardState>
}

export function Wizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = Math.max(1, Math.min(5, Number(searchParams.get('step') ?? '1')))

  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  // Load user preferences once on mount, merge over INITIAL_STATE
  useEffect(() => {
    fetch('/api/preferences')
      .then((r) => r.json())
      .then(({ defaults }) => {
        if (defaults && typeof defaults === 'object') {
          setState((prev) => ({ ...prev, ...defaults }))
        }
      })
      .catch(() => {/* silently ignore — fall back to INITIAL_STATE */})
      .finally(() => setPrefsLoaded(true))
  }, [])

  const setStep = useCallback((s: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('step', String(s))
    router.push(`/dashboard/create?${params.toString()}`)
  }, [router, searchParams])

  function patch(p: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...p }))
  }

  async function savePreferences() {
    await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaults: extractPrefs(state) }),
    })
  }

  // Don't render until prefs are loaded to avoid flash of default values
  if (!prefsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <span className="text-white font-semibold">Affilify</span>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Exit
        </button>
      </header>

      <div className="px-6 pt-6 pb-2 max-w-2xl mx-auto w-full">
        <ProgressBar current={step} />
      </div>

      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        {step === 1 && <StepModel state={state} onChange={patch} onSavePreferences={savePreferences} />}
        {step === 2 && <StepProducts state={state} onChange={patch} />}
        {step === 3 && <StepGenerate state={state} onChange={patch} />}
        {step === 4 && <StepSelect state={state} onChange={patch} />}
        {step === 5 && <StepExport state={state} onChange={patch} />}
      </main>

      <footer className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            ← Back
          </button>
          <span className="text-xs text-zinc-600">Step {step} of 5</span>
          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance(step, state)}
              className="bg-white text-black hover:bg-zinc-200 disabled:opacity-40"
            >
              Continue →
            </Button>
          ) : (
            <Button onClick={() => router.push('/dashboard')} className="bg-white text-black hover:bg-zinc-200">
              Done
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
