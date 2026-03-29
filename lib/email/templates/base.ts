/**
 * Base HTML wrapper shared by all Genetrify transactional emails.
 * Dark-themed to match the app, renders well in Gmail / Outlook / Apple Mail.
 */

export function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Genetrify</title>
  <style>
    body { margin:0; padding:0; background:#222831; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#EEEEEE; }
    a { color:#00ADB5; text-decoration:none; }
    a:hover { text-decoration:underline; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#222831">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- Logo / header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#EEEEEE;font-family:'Arial Black',Arial,sans-serif;text-transform:uppercase;">
                GENE<span style="color:#00ADB5;">TRIFY</span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="#393E46" style="border-radius:12px;padding:36px 40px;border:1px solid rgba(255,255,255,0.07);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;font-size:12px;color:#EEEEEE66;line-height:1.6;">
              Genetrify &mdash; AI affiliate video generator<br/>
              You&rsquo;re receiving this because you have an account at
              <a href="https://genetrify.com" style="color:#EEEEEE66;">genetrify.com</a>.<br/>
              &copy; ${new Date().getFullYear()} Genetrify. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Reusable CTA button block */
export function ctaButton(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
    <tr>
      <td bgcolor="#00ADB5" style="border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:700;color:#222831;text-decoration:none;letter-spacing:0.3px;">${label}</a>
      </td>
    </tr>
  </table>`
}

/** Horizontal divider */
export const divider = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr><td style="border-top:1px solid rgba(255,255,255,0.08);"></td></tr>
</table>`

/** Key-value info row */
export function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:#EEEEEE99;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#EEEEEE;text-align:right;font-weight:600;">${value}</td>
  </tr>`
}
