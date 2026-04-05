'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, Music2, Unplug, ExternalLink } from 'lucide-react'

interface TikTokCreator {
  creator_avatar_url: string | null
  creator_username: string | null
  creator_nickname: string | null
  privacy_level_options: string[]
  comment_disabled: boolean
  duet_disabled: boolean
  stitch_disabled: boolean
  max_video_post_duration_sec: number
}

interface TikTokAccountResponse {
  connected: boolean
  creator?: TikTokCreator
  warning?: string
}

export function TikTokShareButton({
  storageFileId,
  fileName,
  fileUrl,
  className,
  buttonLabel = 'Share to TikTok',
}: {
  storageFileId: string
  fileName: string
  fileUrl?: string | null
  className?: string
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState<TikTokAccountResponse | null>(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [publishId, setPublishId] = useState<string | null>(null)
  const [publishStatus, setPublishStatus] = useState<Record<string, unknown> | null>(null)
  const [title, setTitle] = useState('')
  const [privacyLevel, setPrivacyLevel] = useState('')
  const [allowComment, setAllowComment] = useState(true)
  const [allowDuet, setAllowDuet] = useState(true)
  const [allowStitch, setAllowStitch] = useState(true)
  const [contentDisclosureEnabled, setContentDisclosureEnabled] = useState(false)
  const [brandContentToggle, setBrandContentToggle] = useState(false)
  const [brandOrganicToggle, setBrandOrganicToggle] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  async function loadAccount() {
    setLoadingAccount(true)
    setMessage(null)

    try {
      const res = await fetch('/api/tiktok/account')
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json.error ?? 'Could not load TikTok status')

      setAccount(json)
      const creator = json.creator as TikTokCreator | undefined
      if (creator) {
        setPrivacyLevel(creator.privacy_level_options.length === 1 ? creator.privacy_level_options[0] ?? '' : '')
        setAllowComment(!creator.comment_disabled)
        setAllowDuet(!creator.duet_disabled)
        setAllowStitch(!creator.stitch_disabled)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load TikTok status')
    } finally {
      setLoadingAccount(false)
    }
  }

  useEffect(() => {
    if (!open) return
    void loadAccount()
  }, [open])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'tiktok-oauth') return

      setConnecting(false)

      if (event.data.success) {
        setMessage('TikTok connected.')
        void loadAccount()
        return
      }

      setMessage(typeof event.data.message === 'string' ? event.data.message : 'TikTok connection failed')
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!publishId) return

    const interval = window.setInterval(async () => {
      const res = await fetch(`/api/tiktok/publish-status?publishId=${encodeURIComponent(publishId)}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) return

      const status = json?.status as Record<string, unknown> | undefined
      if (!status) return

      setPublishStatus(status)

      const publishStatusValue = String(status.publish_status ?? status.status ?? '').toUpperCase()
      if (['PUBLISH_COMPLETE', 'PUBLISHED', 'FAILED'].includes(publishStatusValue)) {
        window.clearInterval(interval)
      }
    }, 5000)

    return () => window.clearInterval(interval)
  }, [publishId])

  function connectTikTok() {
    setConnecting(true)
    setMessage(null)
    window.open('/api/tiktok/connect', 'tiktok-oauth', 'width=520,height=780')
  }

  async function disconnectTikTok() {
    setDisconnecting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/tiktok/account', { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not disconnect TikTok')

      setAccount({ connected: false })
      setPublishId(null)
      setPublishStatus(null)
      setPrivacyLevel('')
      setAllowComment(true)
      setAllowDuet(true)
      setAllowStitch(true)
      setContentDisclosureEnabled(false)
      setBrandContentToggle(false)
      setBrandOrganicToggle(false)
      setConsentChecked(false)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not disconnect TikTok')
    } finally {
      setDisconnecting(false)
    }
  }

  async function shareToTikTok() {
    setSharing(true)
    setMessage(null)
    setPublishId(null)
    setPublishStatus(null)

    try {
      const res = await fetch('/api/tiktok/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storageFileId,
          title,
          privacyLevel,
          disableComment: !allowComment,
          disableDuet: !allowDuet,
          disableStitch: !allowStitch,
          brandContentToggle: contentDisclosureEnabled && brandContentToggle,
          brandOrganicToggle: contentDisclosureEnabled && brandOrganicToggle,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json.error ?? 'TikTok share failed')

      setPublishId(json.publishId)
      setPublishStatus(json.status ?? null)
      setMessage('Upload sent to TikTok. Publishing can take a moment.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'TikTok share failed')
    } finally {
      setSharing(false)
    }
  }

  const creator = account?.creator
  const resolvedStatus = String(publishStatus?.publish_status ?? publishStatus?.status ?? '').toUpperCase()
  const requiresExplicitPrivacy = (creator?.privacy_level_options?.length ?? 0) > 1
  const canSubmit = consentChecked && Boolean(privacyLevel)

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 text-xs', className)}
      >
        <Music2 className="w-3.5 h-3.5" />
        {buttonLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-brand-bg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Share to TikTok</p>
                <p className="text-xs text-white/40 mt-1">{fileName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-xs text-white/35 hover:text-white/70 transition-colors">
                Close
              </button>
            </div>

            {loadingAccount ? (
              <div className="flex items-center gap-2 text-sm text-white/55">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading TikTok account...
              </div>
            ) : !account?.connected ? (
              <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-white/75">Connect a TikTok account first.</p>
                <p className="text-xs text-white/40">Your TikTok app must have `video.publish` approved and Direct Post enabled.</p>
                <Button
                  type="button"
                  onClick={connectTikTok}
                  disabled={connecting}
                  className="h-10 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg text-sm font-semibold"
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music2 className="w-4 h-4" />}
                  {connecting ? 'Waiting for TikTok...' : 'Connect TikTok'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fileUrl && (
                  <div className="rounded-xl overflow-hidden border border-white/8 bg-black">
                    <video src={fileUrl} controls playsInline className="w-full max-h-72 object-contain" />
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {creator?.creator_avatar_url ? (
                      <img src={creator.creator_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{creator?.creator_nickname || 'TikTok account'}</p>
                      <p className="text-xs text-white/35 truncate">@{creator?.creator_username || 'unknown'}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={disconnectTikTok}
                    disabled={disconnecting}
                    className="h-8 rounded-lg bg-transparent hover:bg-red-500/10 text-white/45 hover:text-red-300 border border-white/8 text-xs"
                  >
                    {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                    Disconnect
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.15em] text-white/35">Caption</label>
                  <textarea
                    rows={3}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Write a caption for TikTok"
                    className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-accent/40 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-white/35">Privacy</label>
                    <select
                      value={privacyLevel}
                      onChange={(e) => setPrivacyLevel(e.target.value)}
                      className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-accent/40"
                    >
                      {requiresExplicitPrivacy && (
                        <option value="" className="text-black">
                          Select who can watch
                        </option>
                      )}
                      {(creator?.privacy_level_options ?? []).map((option) => (
                        <option key={option} value={option} className="text-black">
                          {option}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-white/35">
                      {creator?.privacy_level_options.includes('SELF_ONLY')
                        ? 'For unaudited TikTok apps, select SELF_ONLY and use a private TikTok account during testing.'
                        : 'Select one of the privacy options returned by TikTok for this account.'}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] uppercase tracking-[0.15em] text-white/35">AIGC label</label>
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white/65">
                      Enabled automatically for Genetrify videos
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/70">
                  <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <input type="checkbox" checked={allowComment} disabled={Boolean(creator?.comment_disabled)} onChange={(e) => setAllowComment(e.target.checked)} />
                    Allow comments
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <input type="checkbox" checked={allowDuet} disabled={Boolean(creator?.duet_disabled)} onChange={(e) => setAllowDuet(e.target.checked)} />
                    Allow duet
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                    <input type="checkbox" checked={allowStitch} disabled={Boolean(creator?.stitch_disabled)} onChange={(e) => setAllowStitch(e.target.checked)} />
                    Allow stitch
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={contentDisclosureEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setContentDisclosureEnabled(checked)
                        if (!checked) {
                          setBrandContentToggle(false)
                          setBrandOrganicToggle(false)
                        }
                      }}
                    />
                    This post promotes a brand, product, or service
                  </label>
                </div>

                {contentDisclosureEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-white/70">
                    <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <input type="checkbox" checked={brandContentToggle} onChange={(e) => setBrandContentToggle(e.target.checked)} />
                      Paid partnership
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <input type="checkbox" checked={brandOrganicToggle} onChange={(e) => setBrandOrganicToggle(e.target.checked)} />
                      Promotes my own business
                    </label>
                  </div>
                )}

                <label className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
                  <input type="checkbox" className="mt-0.5" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
                  <span>I confirm this upload is intentional, I have the rights to share this content and any included music, and I want Genetrify to send it to my TikTok account.</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={shareToTikTok}
                    disabled={sharing || !canSubmit}
                    className="h-10 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-brand-bg text-sm font-semibold disabled:opacity-40"
                  >
                    {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music2 className="w-4 h-4" />}
                    {sharing ? 'Uploading...' : 'Post to TikTok'}
                  </Button>
                  {!privacyLevel && (
                    <span className="text-xs text-white/35">Choose a privacy setting first.</span>
                  )}
                  {publishId && (
                    <span className="text-xs text-white/35">Publish ID: {publishId}</span>
                  )}
                </div>
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm text-white/70">
                {message}
              </div>
            )}

            {account?.warning && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
                {account.warning}
              </div>
            )}

            {publishStatus && (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 space-y-1.5">
                <p className="text-sm text-white/80">TikTok status: {resolvedStatus || 'PROCESSING'}</p>
                {'fail_reason' in publishStatus && typeof publishStatus.fail_reason === 'string' && (
                  <p className="text-xs text-red-300">{publishStatus.fail_reason}</p>
                )}
                {'publicaly_available_post_url' in publishStatus && typeof publishStatus.publicaly_available_post_url === 'string' && (
                  <a
                    href={publishStatus.publicaly_available_post_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent-hover"
                  >
                    View on TikTok
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
