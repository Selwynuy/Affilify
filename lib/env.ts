/**
 * Validates required environment variables at startup.
 * Import this in instrumentation.ts or any server entrypoint.
 */

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_AI_STUDIO_KEY',
  'REPLICATE_API_KEY',
  'NEXT_PUBLIC_APP_URL',
  'PAYMONGO_SECRET_KEY',
  'PAYMONGO_WEBHOOK_SECRET',
  'RESEND_API_KEY',
] as const

export function validateEnv() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\nSet these in your .env.local or hosting environment.`
    )
  }
}
