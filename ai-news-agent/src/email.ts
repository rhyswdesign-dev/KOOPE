import type { Env } from './index';

export async function sendDigestEmail(
  env: Env,
  digest: { subject: string; html: string; text: string }
): Promise<void> {
  const weekOf = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${digest.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#1a1a1a;padding:20px 28px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#888;">HomeGameAdvantage</p>
          <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${digest.subject}</h1>
          <p style="margin:6px 0 0;font-size:12px;color:#666;">${weekOf}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px;color:#1a1a1a;font-size:15px;line-height:1.6;">
          ${digest.html}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 28px;border-top:1px solid #e5e5e5;background:#fafaf8;">
          <p style="margin:0;font-size:11px;color:#999;line-height:1.5;">
            Curated every Monday for Rhys building HomeGameAdvantage.<br>
            Powered by Claude + Cloudflare Workers.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await env.EMAIL.send({
    to: env.RECIPIENT_EMAIL,
    from: { email: env.FROM_EMAIL, name: env.FROM_NAME },
    subject: digest.subject,
    html: wrappedHtml,
    text: digest.text,
  });
}
