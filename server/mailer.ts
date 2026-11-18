import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;
let cachedSignature = '';

function isPlaceholder(val: string | undefined): boolean {
  if (!val) return true;
  const clean = val.trim().toLowerCase();
  return (
    !clean ||
    clean === 'your-email@gmail.com' ||
    clean === 'your_email@gmail.com' ||
    clean === 'your-app-password' ||
    clean === 'your_16_digit_app_password' ||
    clean.startsWith('your-') ||
    clean.startsWith('your_')
  );
}

function resolveMailerCredentials() {
  const gmailUser = !isPlaceholder(process.env.GMAIL_USER) ? process.env.GMAIL_USER!.trim() : '';
  const gmailAppPass = !isPlaceholder(process.env.GMAIL_APP_PASSWORD)
    ? process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, '')
    : '';

  if (gmailUser && gmailAppPass) {
    const customHost =
      process.env.SMTP_HOST && process.env.SMTP_HOST.trim() !== 'smtp.gmail.com'
        ? process.env.SMTP_HOST.trim()
        : null;
    return {
      provider: customHost ? 'custom-smtp' : 'gmail',
      host: customHost || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      user: gmailUser,
      pass: gmailAppPass,
      from: !isPlaceholder(process.env.SMTP_FROM_EMAIL)
        ? process.env.SMTP_FROM_EMAIL!.trim()
        : gmailUser,
    };
  }

  const smtpHost = !isPlaceholder(process.env.SMTP_HOST) ? process.env.SMTP_HOST!.trim() : '';
  const smtpUser = !isPlaceholder(process.env.SMTP_USER) ? process.env.SMTP_USER!.trim() : '';
  const smtpPass = !isPlaceholder(process.env.SMTP_PASSWORD)
    ? process.env.SMTP_PASSWORD!.trim()
    : '';

  if (smtpHost && smtpUser && smtpPass) {
    const isGmail = smtpHost.toLowerCase() === 'smtp.gmail.com';
    return {
      provider: isGmail ? 'gmail' : 'custom-smtp',
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      user: smtpUser,
      pass: isGmail ? smtpPass.replace(/\s+/g, '') : smtpPass,
      from: !isPlaceholder(process.env.SMTP_FROM_EMAIL)
        ? process.env.SMTP_FROM_EMAIL!.trim()
        : smtpUser,
    };
  }

  return null;
}

export function isSmtpConfigured(): boolean {
  return resolveMailerCredentials() !== null;
}

export function getMailerStatus() {
  const creds = resolveMailerCredentials();
  return {
    configured: creds !== null,
    provider: creds?.provider || null,
    host: creds?.host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: creds?.port || Number(process.env.SMTP_PORT || 587),
    from: creds?.from || null,
  };
}

function getTransporter(): { transporter: Transporter; from: string } | null {
  const creds = resolveMailerCredentials();
  if (!creds) return null;

  const signature = `${creds.provider}:${creds.host}:${creds.port}:${creds.user}`;
  if (cachedTransporter && cachedSignature === signature) {
    return { transporter: cachedTransporter, from: creds.from };
  }

  if (creds.provider === 'gmail') {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: creds.user,
        pass: creds.pass,
      },
    });
  } else {
    const isLocalhost = creds.host === '127.0.0.1' || creds.host === 'localhost';
    cachedTransporter = nodemailer.createTransport({
      host: creds.host,
      port: creds.port,
      secure: creds.port === 465,
      ignoreTLS: isLocalhost,
      auth: {
        user: creds.user,
        pass: creds.pass,
      },
    });
  }

  cachedSignature = signature;
  return { transporter: cachedTransporter, from: creds.from };
}

async function sendMailSafe(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const bundle = getTransporter();
  if (!bundle) return false;

  try {
    await bundle.transporter.sendMail({
      from: `EventSphere Security <${bundle.from}>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.warn(`[EventSphere] Email delivery failed for ${to}:`, err instanceof Error ? err.message : 'SMTP error');
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendResetCodeEmail(to: string, name: string, otp: string): Promise<boolean> {
  const safeName = escapeHtml(name || 'there');
  const safeEmail = escapeHtml(to);
  const safeOtp = escapeHtml(otp);
  const year = new Date().getFullYear();

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset Verification</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0B0B0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F2F3F7;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0B0B0E;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#121217;border:1px solid #2D2D3A;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#B88B3D 0%,#D4AF63 50%,#F3DCAA 100%);font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #242430;background:linear-gradient(180deg,#16161D 0%,#121217 100%);">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#B88B3D 0%,#F3DCAA 100%);color:#0B0B0E;font-weight:800;font-size:15px;line-height:36px;text-align:center;letter-spacing:0.5px;">ES</div>
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#F8F9FC;line-height:1.2;">EventSphere</div>
                      <div style="font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#E8C987;margin-top:2px;">Expo Portal Security</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#F8F9FC;">
                  Password Reset Verification
                </h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:#B8BAC8;">
                  Hi ${safeName}, we received a request to reset the password for your EventSphere account (<span style="color:#F8F9FC;font-weight:600;">${safeEmail}</span>).
                </p>
                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.65;color:#B8BAC8;">
                  Enter the 6-digit verification code below on the EventSphere verification screen to continue:
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px 0;">
                  <tr>
                    <td align="center" style="padding:20px 16px;background:linear-gradient(180deg,#181612 0%,#111116 100%);border:1px solid #D4AF63;border-radius:12px;">
                      <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#F3DCAA;margin-bottom:8px;">
                        One-Time Verification Code
                      </div>
                      <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#E8C987;line-height:1.1;padding-left:10px;">
                        ${safeOtp}
                      </div>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#9497A6;text-align:center;">
                  <strong style="color:#F8F9FC;">This code expires in 5 minutes</strong> and can only be used once.
                </p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:14px 16px;background-color:#15141A;border-left:3px solid #D4AF63;border-radius:8px;">
                      <div style="font-size:12px;font-weight:700;color:#E8C987;margin-bottom:4px;">Security Notice</div>
                      <div style="font-size:12px;line-height:1.55;color:#9497A6;">
                        Never share this verification code with anyone. EventSphere staff will never ask for your password or OTP. If you did not request a password reset, you can safely ignore this email.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;background-color:#0D0D11;border-top:1px solid #242430;font-size:11px;color:#737685;text-align:center;">
                &copy; ${year} EventSphere Management Platform &middot; Automated Security Notification
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'EventSphere — Password Reset Verification',
    '',
    `Hi ${name || 'there'},`,
    `We received a request to reset the password for ${to}.`,
    '',
    `Your 6-digit verification code is: ${otp}`,
    '',
    'This code expires in 5 minutes and can only be used once.',
    'Security Notice: Never share this code with anyone. If you did not request this reset, you can safely ignore this email.',
  ].join('\n');

  return sendMailSafe(to, 'EventSphere — Password Reset Verification', html, text);
}

export async function sendTicketConfirmationEmail(
  to: string,
  name: string,
  expoTitle: string,
  expoDate: string,
  expoLocation: string,
  ticketCode: string,
): Promise<boolean> {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(expoTitle);
  const safeDate = escapeHtml(expoDate);
  const safeLocation = escapeHtml(expoLocation);
  const safeTicket = escapeHtml(ticketCode);
  return sendMailSafe(
    to,
    `Your EventSphere Pass: ${expoTitle} (${ticketCode})`,
    `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0B0B0E;color:#F2F3F7;border-radius:12px;border:1px solid #2D2D3A">
      <h2 style="margin:0 0 12px;color:#E8C987">Pass Confirmed</h2>
      <p style="margin:0 0 12px;color:#B8BAC8">Hi ${safeName}, your registration for <strong>${safeTitle}</strong> is confirmed.</p>
      <div style="padding:14px 18px;background:#121217;border:1px solid #D4AF63;border-radius:8px;margin-bottom:14px">
        <div style="font-size:12px;color:#9497A6">TICKET CODE</div>
        <div style="font-family:monospace;font-size:20px;font-weight:700;color:#E8C987;margin-top:4px">${safeTicket}</div>
        <div style="font-size:13px;color:#B8BAC8;margin-top:8px">${safeDate} · ${safeLocation}</div>
      </div>
      <p style="margin:0;font-size:12px;color:#9497A6">Present this pass code in your Attendee Portal upon arrival.</p>
    </div>`,
    `Hi ${name}, your pass ${ticketCode} for ${expoTitle} (${expoDate} at ${expoLocation}) is confirmed.`,
  );
}

export async function sendApplicationStatusEmail(
  to: string,
  companyName: string,
  status: 'approved' | 'rejected' | 'info_requested',
  detail: string,
): Promise<boolean> {
  const statusLabel =
    status === 'approved' ? 'Approved' : status === 'rejected' ? 'Update Required' : 'More Info Requested';
  const safeCompany = escapeHtml(companyName);
  const safeDetail = escapeHtml(detail);
  return sendMailSafe(
    to,
    `EventSphere Exhibitor Application ${statusLabel}: ${companyName}`,
    `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0B0B0E;color:#F2F3F7;border-radius:12px;border:1px solid #2D2D3A">
      <h2 style="margin:0 0 12px;color:#E8C987">Exhibitor Application ${statusLabel}</h2>
      <p style="margin:0 0 12px;color:#B8BAC8">Application for <strong>${safeCompany}</strong> has been reviewed by the EventSphere organizer team:</p>
      <div style="padding:14px 18px;background:#121217;border:1px solid #D4AF63;border-radius:8px;color:#F8F9FC">${safeDetail}</div>
    </div>`,
    `Exhibitor Application ${statusLabel} for ${companyName}: ${detail}`,
  );
}
