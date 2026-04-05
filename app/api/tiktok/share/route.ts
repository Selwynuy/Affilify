import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchTikTokPublishStatus,
  getValidTikTokAccessToken,
  initTikTokDirectPost,
  queryTikTokCreatorInfo,
  uploadVideoToTikTok,
} from '@/lib/tiktok'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      storageFileId,
      title,
      privacyLevel,
      disableComment,
      disableDuet,
      disableStitch,
      brandContentToggle,
      brandOrganicToggle,
      videoCoverTimestampMs,
    } = await req.json()

    if (!storageFileId) {
      return NextResponse.json({ error: 'storageFileId is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: file, error } = await admin
      .from('storage_files')
      .select('id, file_name, public_url, storage_path, file_type')
      .eq('id', storageFileId)
      .eq('user_id', user.id)
      .eq('file_type', 'generated_video')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!file) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const sourceUrl = file.public_url || file.storage_path
    if (!sourceUrl) return NextResponse.json({ error: 'Video URL missing' }, { status: 400 })

    const { accessToken } = await getValidTikTokAccessToken(user.id)
    const creatorInfo = await queryTikTokCreatorInfo(accessToken)

    if (!creatorInfo.privacy_level_options.includes(privacyLevel)) {
      return NextResponse.json({ error: 'Selected privacy level is not allowed for this TikTok account.' }, { status: 400 })
    }

    const sourceResponse = await fetch(sourceUrl)
    if (!sourceResponse.ok) {
      return NextResponse.json({ error: 'Could not fetch the generated video for TikTok upload.' }, { status: 400 })
    }

    const mimeType = sourceResponse.headers.get('content-type') || 'video/mp4'
    const arrayBuffer = await sourceResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'TikTok upload failed: video file is empty.' }, { status: 400 })
    }

    const minChunkSize = 5 * 1024 * 1024
    const chunkSize = buffer.byteLength < minChunkSize
      ? buffer.byteLength
      : Math.min(10 * 1024 * 1024, buffer.byteLength)
    const totalChunkCount = buffer.byteLength < minChunkSize
      ? 1
      : Math.max(1, Math.floor(buffer.byteLength / chunkSize))

    const initialized = await initTikTokDirectPost(accessToken, {
      post_info: {
        title: typeof title === 'string' && title.trim() ? title.trim() : undefined,
        privacy_level: privacyLevel,
        disable_comment: Boolean(disableComment) || creatorInfo.comment_disabled,
        disable_duet: Boolean(disableDuet) || creatorInfo.duet_disabled,
        disable_stitch: Boolean(disableStitch) || creatorInfo.stitch_disabled,
        brand_content_toggle: Boolean(brandContentToggle),
        brand_organic_toggle: Boolean(brandOrganicToggle),
        is_aigc: true,
        video_cover_timestamp_ms: typeof videoCoverTimestampMs === 'number' ? videoCoverTimestampMs : undefined,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: buffer.byteLength,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    })

    await uploadVideoToTikTok(initialized.upload_url, buffer, mimeType)

    let initialStatus: Record<string, unknown> | null = null
    try {
      initialStatus = await fetchTikTokPublishStatus(accessToken, initialized.publish_id)
    } catch {
      initialStatus = null
    }

    return NextResponse.json({
      ok: true,
      publishId: initialized.publish_id,
      status: initialStatus,
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'TikTok share failed.',
    }, { status: 500 })
  }
}
