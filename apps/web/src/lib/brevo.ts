// Brevo transactional email client
// Gracefully skips if BREVO_API_KEY is not configured

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendInviteEmailParams {
    to: string;
    orgName: string;
    role: string;
    inviteLink: string;
    inviterName?: string;
}

export async function sendInviteEmail({ to, orgName, role, inviteLink, inviterName }: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        console.warn("[Brevo] BREVO_API_KEY not configured, skipping email send");
        return { success: false, error: "Email service not configured" };
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@theagenttrace.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'AgentTrace';

    const payload = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject: `You've been invited to join ${orgName} on AgentTrace`,
        htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentTrace: Workspace Invitation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
    body {
      margin: 0; padding: 0; background-color: #000000; color: #fafafa;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      background-image: radial-gradient(#27272a 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .wrapper { width: 100%; table-layout: fixed; padding-top: 60px; padding-bottom: 60px; }
    .card { max-width: 520px; margin: 0 auto; background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 40px; text-align: left; }
    .brand-name { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; color: #ffffff; margin-bottom: 32px; display: flex; align-items: center; gap: 8px; }
    .brand-name svg { color: #ffffff; }
    h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.03em; margin: 0 0 12px 0; color: #ffffff; }
    p { font-size: 15px; line-height: 1.6; color: #a1a1aa; margin: 0 0 32px 0; }
    .btn { display: inline-block; background-color: #ffffff; color: #000000 !important; text-decoration: none; font-size: 14px; font-weight: 500; padding: 12px 24px; border-radius: 6px; }
    .divider { height: 1px; background-color: #27272a; margin: 40px 0; }
    .code-block { background-color: #000000; border: 1px solid #27272a; border-radius: 6px; padding: 16px; font-family: 'JetBrains Mono', 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.6; color: #d4d4d8; }
    .code-comment { color: #71717a; }
    .code-key { color: #ffffff; }
    .code-string { color: #a1a1aa; }
    .footer-links { margin-top: 24px; font-size: 13px; color: #71717a; text-align: center; }
    .footer-links a { color: #a1a1aa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <div class="card">
            <div class="brand-name">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="18" r="3"></circle>
                <circle cx="6" cy="6" r="3"></circle>
                <path d="M13 6h3a2 2 0 0 1 2 2v7"></path>
                <line x1="6" y1="9" x2="6" y2="21"></line>
              </svg>
              AgentTrace
            </div>

            <h1>Workspace Invitation</h1>
            <p>
              ${inviterName ? `<strong style="color:#fff">${inviterName}</strong> has invited you to` : 'You have been invited to'}
              join <strong style="color:#fff">${orgName}</strong> as
              <strong style="color:#fff;text-transform:uppercase">${role}</strong>.
              Accept the invitation below to provision your access and begin collaborating.
            </p>

            <div>
              <a href="${inviteLink}" class="btn">Accept Invitation</a>
            </div>

            <div class="divider"></div>

            <div class="code-block">
              <span class="code-comment">// network_invite_payload</span><br>
              <span class="code-key">target_node:</span> <span class="code-string">"${to}"</span><br>
              <span class="code-key">status:</span> <span class="code-string">"pending_acceptance"</span><br>
              <span class="code-key">workspace:</span> <span class="code-string">"${orgName}"</span><br>
              <span class="code-key">role:</span> <span class="code-string">"${role}"</span>
            </div>

            <div class="footer-links">
              Protected by AgentTrace &middot; <a href="https://theagenttrace.com">View Documentation</a>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`,
    };

    try {
        const res = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error("[Brevo] Send failed:", res.status, errData);
            return { success: false, error: `Email send failed: ${res.status}` };
        }

        console.log("[Brevo] Invite email sent to:", to);
        return { success: true };
    } catch (err: any) {
        console.error("[Brevo] Network error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Generic Brevo transactional email sender.
 * Used for 2FA OTP codes, alerts, etc.
 */
interface SendEmailParams {
    to: { email: string; name?: string }[];
    subject: string;
    htmlContent: string;
    sender?: { email: string; name: string };
}

export async function sendBrevoEmail({
    to,
    subject,
    htmlContent,
    sender = { email: "noreply@theagenttrace.com", name: "AgentTrace" },
}: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        console.error("[Brevo] BREVO_API_KEY is not set");
        return { success: false, error: "Email service not configured" };
    }

    try {
        const res = await fetch(BREVO_API_URL, {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({ sender, to, subject, htmlContent }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("[Brevo] Send failed:", data);
            return { success: false, error: data.message || "Failed to send email" };
        }

        return { success: true, messageId: data.messageId };
    } catch (err: any) {
        console.error("[Brevo] Network error:", err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Generate a 6-digit OTP code.
 */
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
