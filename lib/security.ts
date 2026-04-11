import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const DEFAULT_ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function sanitizeText(value: unknown, options?: {
  maxLength?: number
  allowNewlines?: boolean
}) {
  if (typeof value !== 'string') return ''

  const collapsed = options?.allowNewlines
    ? value.replace(/\r\n/g, '\n').replace(/\0/g, '')
    : value.replace(/\s+/g, ' ').replace(/\0/g, '')

  const trimmed = collapsed.trim()
  const maxLength = options?.maxLength ?? 500

  return trimmed.slice(0, maxLength)
}

export function parseBoolean(value: unknown) {
  return value === true || value === 'true'
}

export function parseInteger(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number.parseInt(value, 10)
  return null
}

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin
  } catch {
    return null
  }
}

export function verifySameOrigin(request: NextRequest) {
  const allowedOrigins = new Set<string>()
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? '')
  const requestUrlOrigin = normalizeOrigin(request.nextUrl.origin)

  if (configuredOrigin) allowedOrigins.add(configuredOrigin)
  if (requestUrlOrigin) allowedOrigins.add(requestUrlOrigin)

  if (allowedOrigins.size === 0) return null

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  const requestOrigin = origin
    ? normalizeOrigin(origin)
    : referer
      ? normalizeOrigin(referer)
      : null

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  return null
}

export function assertAllowedMimeType(
  mimeType: string,
  kind: 'image' | 'video',
) {
  const allowed = kind === 'image'
    ? DEFAULT_ALLOWED_IMAGE_MIME_TYPES
    : DEFAULT_ALLOWED_VIDEO_MIME_TYPES

  return allowed.has(mimeType.toLowerCase())
}

export function getExtensionForMimeType(mimeType: string, fallback: string) {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'video/mp4':
      return 'mp4'
    case 'video/quicktime':
      return 'mov'
    case 'video/webm':
      return 'webm'
    default:
      return fallback
  }
}

export function isSafeHttpUrl(value: string, options?: { allowHosts?: string[] }) {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    if (options?.allowHosts?.length) {
      return options.allowHosts.includes(parsed.host)
    }
    return !isPrivateHostname(parsed.hostname)
  } catch {
    return false
  }
}

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase()

  // IPv4-mapped IPv6 — unwrap and recheck the embedded IPv4 address
  if (/^::ffff:/i.test(lower)) return isPrivateHostname(lower.slice(7))

  // Loopback and link-local (IPv4 + IPv6)
  if (lower === 'localhost' || lower.endsWith('.local')) return true
  if (lower === '127.0.0.1' || lower === '::1') return true
  if (/^127\./.test(lower)) return true

  // Private IPv4 ranges
  if (/^10\./.test(lower) || /^192\.168\./.test(lower)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true

  // Link-local / APIPA (also covers AWS/GCP IMDS at 169.254.169.254)
  if (/^169\.254\./.test(lower)) return true

  // Catch-all 0.0.0.0
  if (lower === '0.0.0.0') return true

  // Cloud metadata endpoints by hostname
  if (lower === 'metadata.google.internal' || lower.endsWith('.metadata.google.internal')) return true

  // Alibaba Cloud IMDS
  if (lower === '100.100.100.200') return true

  // Private IPv6 ranges: unique-local (fc00::/7) and link-local (fe80::/10)
  if (/^f[c-d][0-9a-f]{2}:/i.test(lower) || /^fe[89ab][0-9a-f]:/i.test(lower)) return true

  return false
}
