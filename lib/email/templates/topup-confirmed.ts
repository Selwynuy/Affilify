import { baseTemplate, ctaButton, divider, infoRow } from './base'

interface TopupConfirmedOptions {
  email: string
  tokens: number
  amountPaid: string   // e.g. "₱299.00"
  newBalance: number
}

export function topupConfirmedEmail(opts: TopupConfirmedOptions): { subject: string; html: string } {
  return {
    subject: `${opts.tokens.toLocaleString()} tokens added to your account`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#EEEEEE;letter-spacing:-0.3px;">
        Top-up confirmed ✓
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        Your token top-up was successful.
        <strong style="color:#00ADB5;">${opts.tokens.toLocaleString()} tokens</strong> have been
        added to your account.
      </p>

      ${divider}

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${infoRow('Tokens added', `+${opts.tokens.toLocaleString()}`)}
        ${infoRow('Amount charged', opts.amountPaid)}
        ${infoRow('New balance', opts.newBalance.toLocaleString() + ' tokens')}
      </table>

      ${divider}

      <p style="margin:0;font-size:13px;color:#EEEEEE55;line-height:1.6;">
        If you did not authorise this charge, contact
        <a href="mailto:support@genetrify.com" style="color:#00ADB5;">support@genetrify.com</a> immediately.
      </p>

      ${ctaButton('Start generating', 'https://genetrify.com/dashboard')}
    `),
  }
}
