import { verifySession } from '@/lib/dal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const steps = [
  { step: 1, title: 'Upload & Configure Avatar', desc: 'Upload your face photo and select gender + body type', href: '/dashboard/generate' },
  { step: 2, title: 'Add Product Images', desc: 'Upload 1–5 product images', href: '/dashboard/generate' },
  { step: 3, title: 'Generate AI Images', desc: 'AI generates 3–4 model images with your product', href: '/dashboard/generate' },
  { step: 4, title: 'Select Images', desc: 'Pick the best images for your video', href: '/dashboard/select' },
  { step: 5, title: 'Export Video', desc: 'Convert to TikTok-style 9:16 MP4 and download', href: '/dashboard/export' },
]

export default async function DashboardPage() {
  const session = await verifySession()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="text-zinc-400 mt-1 text-sm">{session?.user.email}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Your workflow</h2>
        {steps.map(({ step, title, desc, href }) => (
          <Card key={step} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2 pt-4 flex flex-row items-center gap-3">
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 shrink-0">
                {step}
              </Badge>
              <CardTitle className="text-white text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 flex items-center justify-between">
              <CardDescription className="text-zinc-500">{desc}</CardDescription>
              <Link href={href}>
                <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white shrink-0 ml-4">
                  Go →
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Link href="/dashboard/generate">
        <Button className="bg-white text-black hover:bg-zinc-200">
          Start generating
        </Button>
      </Link>
    </div>
  )
}
