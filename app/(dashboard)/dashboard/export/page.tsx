'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type VideoStatus = 'idle' | 'processing' | 'ready'

const MOCK_VIDEOS = [
  { id: '1', label: 'Video 1', status: 'ready' as VideoStatus },
  { id: '2', label: 'Video 2', status: 'ready' as VideoStatus },
]

export default function ExportPage() {
  const [videos, setVideos] = useState(MOCK_VIDEOS)
  const [processing, setProcessing] = useState(false)

  async function handleProcess() {
    setProcessing(true)
    setVideos((v) => v.map((vid) => ({ ...vid, status: 'processing' as VideoStatus })))
    // TODO: call /api/export — FFmpeg processes selected images into 9:16 MP4
    await new Promise((r) => setTimeout(r, 2000))
    setVideos((v) => v.map((vid) => ({ ...vid, status: 'ready' as VideoStatus })))
    setProcessing(false)
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Export Videos</h1>
        <p className="text-zinc-400 mt-1 text-sm">
          Each selected image becomes a 5–10 second 9:16 TikTok-ready MP4.
        </p>
      </div>

      <div className="space-y-3">
        {videos.map(({ id, label, status }) => (
          <Card key={id} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white text-base">{label}</CardTitle>
                <CardDescription className="text-zinc-500 text-xs">9:16 · MP4 · ~5–10s</CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  status === 'ready'
                    ? 'border-green-700 text-green-400'
                    : status === 'processing'
                    ? 'border-yellow-700 text-yellow-400'
                    : 'border-zinc-700 text-zinc-400'
                }
              >
                {status === 'processing' ? 'Processing…' : status === 'ready' ? 'Ready' : 'Idle'}
              </Badge>
            </CardHeader>
            <CardContent className="pb-4">
              {status === 'ready' ? (
                <a
                  href="#"
                  download={`affilify-video-${id}.mp4`}
                  className="inline-flex h-7 items-center justify-center rounded-lg border border-zinc-700 bg-transparent px-2.5 text-[0.8rem] font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  Download MP4
                </a>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleProcess}
        disabled={processing}
        className="bg-white text-black hover:bg-zinc-200"
      >
        {processing ? 'Processing…' : 'Process all videos'}
      </Button>
    </div>
  )
}
