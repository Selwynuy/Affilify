import { baseTemplate, ctaButton, divider } from './base'

interface PaymentFailedOptions {
  planName: string
  attemptDate: string   // e.g. "March 29, 2026"
}

export function paymentFailedEmail(opts: PaymentFailedOptions): { subject: string; html: string } {
  return {
    subject: 'Action required — your Genetrify payment failed',
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ff6b6b;letter-spacing:-0.3px;">
        Payment failed
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        We were unable to charge your card for your
        <strong style="color:#EEEEEE;">${opts.planName}</strong> plan on ${opts.attemptDate}.
        Your account has been marked as <strong style="color:#ff6b6b;">past due</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:rgba(255,107,107,0.08);border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <tr>
          <td style="font-size:14px;color:#EEEEEE99;line-height:1.7;">
            <strong style="color:#EEEEEE;">What happens next:</strong><br/>
            &bull; PayMongo will retry the charge automatically.<br/>
            &bull; If all retries fail your subscription will be cancelled and access will be revoked.<br/>
            &bull; Update your payment method now to avoid losing access.
          </td>
        </tr>
      </table>

      ${divider}

      <p style="margin:0;font-size:13px;color:#EEEEEE55;line-height:1.6;">
        Questions? Contact <a href="mailto:support@genetrify.com" style="color:#00ADB5;">support@genetrify.com</a>.
      </p>

      ${ctaButton('Update payment method', 'https://genetrify.com/billing')}
    `),
  }
}
