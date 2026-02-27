/**
 * Branded email templates for AgentTrace.
 * Used by Brevo transactional emails and Supabase custom templates.
 */

const BRAND_COLOR = "#171717";
const MUTED_COLOR = "#737373";
const BG_COLOR = "#fafafa";

function baseLayout(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: ${BG_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 480px; margin: 40px auto; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 40px; }
    .logo { font-size: 16px; font-weight: 600; color: ${BRAND_COLOR}; letter-spacing: -0.02em; margin-bottom: 32px; }
    .title { font-size: 20px; font-weight: 600; color: ${BRAND_COLOR}; margin: 0 0 12px 0; }
    .text { font-size: 14px; color: ${MUTED_COLOR}; line-height: 1.6; margin: 0 0 24px 0; }
    .btn { display: inline-block; background: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; }
    .footer { font-size: 12px; color: #a3a3a3; text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
    .code { font-family: monospace; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: ${BRAND_COLOR}; background: ${BG_COLOR}; padding: 16px 24px; border-radius: 6px; border: 1px solid #e5e5e5; display: inline-block; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">AgentTrace</div>
    ${content}
    <div class="footer">
      AgentTrace — Deterministic AI Agent Replay<br>
      <a href="https://theagenttrace.com" style="color: #a3a3a3;">theagenttrace.com</a>
    </div>
  </div>
</body>
</html>`;
}

export const emailTemplates = {
    /** Supabase confirm signup email */
    confirmSignup: baseLayout(`
    <h1 class="title">Verify your email</h1>
    <p class="text">Click the button below to verify your email address and activate your AgentTrace account.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" class="btn">Verify Email</a>
    </p>
    <p class="text" style="font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
  `),

    /** Supabase password reset email */
    resetPassword: baseLayout(`
    <h1 class="title">Reset your password</h1>
    <p class="text">You requested a password reset for your AgentTrace account. Click the button below to choose a new password.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" class="btn">Reset Password</a>
    </p>
    <p class="text" style="font-size: 12px;">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
  `),

    /** Supabase magic link email */
    magicLink: baseLayout(`
    <h1 class="title">Sign in to AgentTrace</h1>
    <p class="text">Click the button below to sign in to your account. No password needed.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" class="btn">Sign In</a>
    </p>
    <p class="text" style="font-size: 12px;">This link expires in 10 minutes and can only be used once.</p>
  `),

    /** Team invite email (sent via Brevo API) */
    teamInvite: (inviterName: string, orgName: string, acceptUrl: string) =>
        baseLayout(`
    <h1 class="title">You've been invited</h1>
    <p class="text"><strong>${inviterName}</strong> invited you to join <strong>${orgName}</strong> on AgentTrace.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${acceptUrl}" class="btn">Accept Invite</a>
    </p>
    <p class="text" style="font-size: 12px;">If you don't recognize this invite, you can safely ignore it.</p>
  `),

    /** 2FA OTP email */
    otpCode: (code: string) =>
        baseLayout(`
    <h1 class="title">Verification code</h1>
    <p class="text">Enter this code to complete your sign-in:</p>
    <p style="text-align: center;">
      <span class="code">${code}</span>
    </p>
    <p class="text" style="font-size: 12px;">This code expires in 10 minutes. If you didn't try to sign in, please secure your account immediately.</p>
  `),
};
