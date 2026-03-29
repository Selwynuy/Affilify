import { baseTemplate, ctaButton, divider } from './base'

interface PasswordResetOptions {
  resetUrl: string
}

export function passwordResetEmail(opts: PasswordResetOptions): { subject: string; html: string } {
  return {
    subject: 'Reset your Genetrify password',
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#EEEEEE;letter-spacing:-0.3px;">
        Reset your password
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        We received a request to reset the password for your Genetrify account.
        Click the button below to choose a new password. This link expires in
        <strong style="color:#EEEEEE;">1 hour</strong>.
      </p>

      ${ctaButton('Reset password', opts.resetUrl)}

      ${divider}

      <p style="margin:0;font-size:13px;color:#EEEEEE55;line-height:1.6;">
        If you didn&rsquo;t request a password reset, you can safely ignore this email &mdash;
        your password will not change. If you&rsquo;re concerned about your account security,
        contact <a href="mailto:support@genetrify.com" style="color:#00ADB5;">support@genetrify.com</a>.
      </p>
    `),
  }
}
