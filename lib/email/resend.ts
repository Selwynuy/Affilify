/**
 * Resend email client.
 * All transactional emails go through here — never call Resend directly.
 */

import { Resend } from 'resend'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = 'Genetrify <noreply@genetrify.com>'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send a transactional email via Resend.
 * Never throws — logs and swallows errors so email failures don't block
 * the caller (payment webhooks, auth actions, etc.).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    })
    if (error) {
      logger.error('Resend: failed to send email', { to: opts.to, subject: opts.subject, resendError: error.message })
    }
  } catch (err) {
    logger.error('Resend: unexpected error sending email', { to: opts.to, subject: opts.subject }, err)
  }
}
