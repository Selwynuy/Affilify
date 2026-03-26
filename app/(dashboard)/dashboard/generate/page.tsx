'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type Gender = 'male' | 'female'
type BodyType = 'lean' | 'average' | 'bulky'

export default function GeneratePage() {
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [productFiles, setProductFiles] = useState<File[]>([])
  const [gender, setGender] = useState<Gender>('female')
  const [bodyType, setBodyType] = useState<BodyType>('average')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  function handleFaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setFaceFile(file)
  }

  function handleProductChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5)
    setProductFiles(files)
  }

  async function handleGenerate() {
    if (!faceFile || productFiles.length === 0) return
    setGenerating(true)
    // TODO: call /api/generate with FormData (face + products + settings)
    await new Promise((r) => setTimeout(r, 1500))
    setGenerating(false)
    setGenerated(true)
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Generate Images</h1>
        <p className="text-zinc-400 mt-1 text-sm">Upload your face and product — AI handles the rest.</p>
      </div>

      {/* Avatar setup */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Avatar</CardTitle>
          <CardDescription className="text-zinc-500">Upload your face photo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="face" className="text-zinc-300">Face photo</Label>
            <input
              id="face"
              type="file"
              accept="image/*"
              onChange={handleFaceChange}
              className="block w-full text-sm text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600 cursor-pointer"
            />
            {faceFile && <p className="text-xs text-zinc-500">{faceFile.name}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Gender</Label>
            <div className="flex gap-2">
              {(['female', 'male'] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                    gender === g
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300">Body type</Label>
            <div className="flex gap-2">
              {(['lean', 'average', 'bulky'] as BodyType[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBodyType(b)}
                  className={`px-3 py-1.5 rounded-md text-sm capitalize transition-colors ${
                    bodyType === b
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product images */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Product Images</CardTitle>
          <CardDescription className="text-zinc-500">Upload 1–5 product images</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleProductChange}
            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600 cursor-pointer"
          />
          {productFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {productFiles.map((f) => (
                <Badge key={f.name} variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                  {f.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 items-center">
        <Button
          onClick={handleGenerate}
          disabled={!faceFile || productFiles.length === 0 || generating}
          className="bg-white text-black hover:bg-zinc-200"
        >
          {generating ? 'Generating…' : 'Generate 3–4 images'}
        </Button>
        {generated && (
          <Link href="/dashboard/select">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
              Select images →
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}
