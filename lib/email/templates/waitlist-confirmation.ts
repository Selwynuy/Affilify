import { baseTemplate, ctaButton } from './base'

export function waitlistConfirmationEmail(email: string): { subject: string; html: string } {
  return {
    subject: "You're on the Genetrify waitlist 🎉",
    html: baseTemplate(`
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#EEEEEE;letter-spacing:-0.3px;">
        You&rsquo;re on the list.
      </h1>
      <p style="margin:0 0 18px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        Hi ${email}, thanks for joining the Genetrify waitlist. We&rsquo;ll email you the moment
        early access opens.
      </p>

      <p style="margin:0 0 8px;font-size:14px;color:#EEEEEEcc;line-height:1.6;font-weight:600;">
        What you get when we launch:
      </p>
      <ul style="margin:0 0 20px;padding-left:18px;font-size:14px;color:#EEEEEE99;line-height:1.7;">
        <li>Priority access ahead of public signups</li>
        <li>Launch-day perks for waitlist members</li>
        <li>One-on-one onboarding from the founder</li>
      </ul>

      <p style="margin:0 0 6px;font-size:14px;color:#EEEEEEcc;line-height:1.6;font-weight:600;">
        While you wait
      </p>
      <p style="margin:0;font-size:14px;color:#EEEEEE99;line-height:1.6;">
        Want a sneak peek of how Genetrify works? Check the demo on the landing page.
        We turn one face photo plus product images into a fully styled AI model + a
        TikTok-ready video.
      </p>

      ${ctaButton('See how it works', 'https://genetrify.com/#how-it-works')}
    `),
  }
}
