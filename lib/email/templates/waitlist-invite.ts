import { baseTemplate, ctaButton } from './base'

export function waitlistInviteEmail(params: {
  email: string
  inviteUrl: string
  expiresInDays: number
}): { subject: string; html: string } {
  const { email, inviteUrl, expiresInDays } = params

  return {
    subject: "You're invited to Genetrify — claim your spot",
    html: baseTemplate(`
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#EEEEEE;letter-spacing:-0.3px;">
        You&rsquo;re in.
      </h1>
      <p style="margin:0 0 18px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        Hi ${email}, your spot on the Genetrify waitlist just opened up. Click below to
        finish your account and start generating AI fashion content.
      </p>

      ${ctaButton('Claim my spot', inviteUrl)}

      <p style="margin:24px 0 0;font-size:13px;color:#EEEEEE66;line-height:1.6;text-align:center;">
        This invite is single-use and expires in ${expiresInDays} days.
        If the button doesn&rsquo;t work, paste this link into your browser:<br/>
        <span style="color:#00ADB5;word-break:break-all;">${inviteUrl}</span>
      </p>

      <p style="margin:20px 0 0;font-size:13px;color:#EEEEEE66;line-height:1.6;">
        Didn&rsquo;t request this? Ignore this email and the invite will quietly expire.
      </p>
    `),
  }
}
