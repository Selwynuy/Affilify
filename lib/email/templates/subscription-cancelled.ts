import { baseTemplate, ctaButton, divider } from './base'

interface SubscriptionCancelledOptions {
  planName: string
  accessUntil: string  // e.g. "April 29, 2026"
}

export function subscriptionCancelledEmail(opts: SubscriptionCancelledOptions): { subject: string; html: string } {
  return {
    subject: 'Your Genetrify subscription has been cancelled',
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#EEEEEE;letter-spacing:-0.3px;">
        Subscription cancelled
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        Your <strong style="color:#EEEEEE;">${opts.planName}</strong> subscription has been cancelled.
        You&rsquo;ll retain full access to Genetrify until
        <strong style="color:#00ADB5;">${opts.accessUntil}</strong>, after which your account
        will revert to the free tier.
      </p>

      ${divider}

      <p style="margin:0;font-size:14px;color:#EEEEEE66;line-height:1.6;">
        Changed your mind? You can resubscribe at any time from your
        <a href="https://genetrify.com/billing" style="color:#00ADB5;">Billing</a> page &mdash;
        no waiting period.
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#EEEEEE44;line-height:1.6;">
        If you cancelled due to an issue, let us know at
        <a href="mailto:support@genetrify.com" style="color:#00ADB5;">support@genetrify.com</a>.
        We&rsquo;d love to help.
      </p>

      ${ctaButton('Resubscribe', 'https://genetrify.com/billing')}
    `),
  }
}
