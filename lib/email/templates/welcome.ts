import { baseTemplate, ctaButton } from './base'

export function welcomeEmail(email: string): { subject: string; html: string } {
  return {
    subject: 'Welcome to Genetrify — your account is ready',
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#EEEEEE;letter-spacing:-0.3px;">
        You&rsquo;re in. Let&rsquo;s make videos.
      </h1>
      <p style="margin:0 0 20px;font-size:15px;color:#EEEEEE99;line-height:1.6;">
        Hi ${email}, your Genetrify account is ready. Upload a face + product images and generate
        your first affiliate video in minutes.
      </p>
      <p style="margin:0;font-size:14px;color:#EEEEEE66;line-height:1.6;">
        <strong style="color:#EEEEEE99;">What to do first:</strong><br/>
        1. Open the studio and review your default avatar/background<br/>
        2. Upload 1&ndash;5 product images<br/>
        3. Generate an image &rarr; approve it &rarr; export your video
      </p>
      ${ctaButton('Open Genetrify', 'https://genetrify.com/dashboard')}
    `),
  }
}
