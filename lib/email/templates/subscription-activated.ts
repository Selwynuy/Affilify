import { baseTemplate, ctaButton, divider, infoRow } from './base'

interface SubscriptionActivatedOptions {
  email: string
  planName: string
  tokensGranted: number
  amountPaid: string        // e.g. "₱1,099.00"
  nextBillingDate: string   // e.g. "April 29, 2026"
}

export function subscriptionActivatedEmail(opts: SubscriptionActivatedOptions): { subject: string; html: string } {
  return {
    subject: `Your ${opts.planName} plan is now active`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#EEEEEE;letter-spacing:-0.3px;">
        Payment confirmed ✓
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        Your <strong style="color:#00ADB5;">${opts.planName}</strong> plan is active.
        ${opts.tokensGranted.toLocaleString()} tokens have been added to your account.
      </p>

      ${divider}

      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${infoRow('Plan', opts.planName)}
        ${infoRow('Tokens added', opts.tokensGranted.toLocaleString())}
        ${infoRow('Amount charged', opts.amountPaid)}
        ${infoRow('Next billing date', opts.nextBillingDate)}
      </table>

      ${divider}

      <p style="margin:0;font-size:13px;color:#EEEEEE55;line-height:1.6;">
        You can manage your subscription, view usage, or cancel at any time from your
        <a href="https://genetrify.com/billing" style="color:#00ADB5;">Billing</a> page.
        If you did not authorise this charge, please contact
        <a href="mailto:support@genetrify.com" style="color:#00ADB5;">support@genetrify.com</a> immediately.
      </p>

      ${ctaButton('Start creating', 'https://genetrify.com/dashboard')}
    `),
  }
}
