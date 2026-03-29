import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch the last 10 projects that have videos
  const { data: projects } = await admin
    .from('projects')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('status', 'videos_ready')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!projects || projects.length === 0) return NextResponse.json({ runs: [] })

  const runs = await Promise.all(projects.map(async (project) => {
    const { data: videos } = await admin
      .from('project_videos')
      .select('id, url, image_id')
      .eq('project_id', project.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: true })

    return {
      projectId: project.id,
      createdAt: project.created_at,
      videos: (videos ?? []).map((v, i) => ({
        imageId: v.image_id ?? v.id,
        videoUrl: v.url,
        filename: `genetrify-video-${i + 1}.mp4`,
      })),
    }
  }))

  // Filter out runs with no videos
  return NextResponse.json({ runs: runs.filter((r) => r.videos.length > 0) })
}
