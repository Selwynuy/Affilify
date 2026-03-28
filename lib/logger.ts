/**
 * Structured server-side logger.
 * Drop-in replacement for console.error/warn/info with context support.
 * Outputs JSON in production (machine-parseable by Vercel/Datadog/etc.),
 * human-readable in development.
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  projectId?: string
  route?: string
  [key: string]: unknown
}

function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const isDev = process.env.NODE_ENV !== 'production'

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
    ...(error
      ? {
          error: error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error),
        }
      : {}),
  }

  if (isDev) {
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️'
    const ctx = context ? ` ${JSON.stringify(context)}` : ''
    const err = error ? `\n  ${error instanceof Error ? error.stack : error}` : ''
    console[level](`${prefix} [${entry.timestamp}] ${message}${ctx}${err}`)
  } else {
    // JSON lines — picked up by Vercel log drains, Datadog, etc.
    process.stdout.write(JSON.stringify(entry) + '\n')
  }
}

export const logger = {
  info(message: string, context?: LogContext) {
    log('info', message, context)
  },
  warn(message: string, context?: LogContext) {
    log('warn', message, context)
  },
  error(message: string, context?: LogContext, error?: unknown) {
    log('error', message, context, error)
  },
}
