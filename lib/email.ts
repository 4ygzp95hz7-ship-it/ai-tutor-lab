import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'AI Tutor Lab <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai-tutor-lab-nine.vercel.app'

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#1e40af;padding:24px 32px">
      <span style="color:#fff;font-size:16px;font-weight:700">AI Tutor Lab</span>
    </div>
    <div style="padding:32px">
      ${content}
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
      <p style="margin:0;font-size:12px;color:#94a3b8">AI Tutor Lab · <a href="${APP_URL}" style="color:#3b82f6;text-decoration:none">Visit app</a></p>
    </div>
  </div>
</body>
</html>`
}

export async function sendWelcomeEmail(email: string, name: string) {
  const firstName = name?.split(' ')[0] ?? 'there'
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Welcome to AI Tutor Lab, ${firstName}! 🎓`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a">Welcome, ${firstName}! 🎓</h1>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px">You're all set. Tell us what you want to learn and we'll build your complete, personalized curriculum — every module, sub-module, and lesson — powered by AI.</p>
      <a href="${APP_URL}/onboarding" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Start Learning →</a>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
      <p style="color:#64748b;font-size:13px;margin:0">What you get with AI Tutor Lab:</p>
      <ul style="color:#475569;font-size:13px;line-height:1.8;margin:8px 0 0;padding-left:20px">
        <li>Complete, uncompromised syllabus for any topic</li>
        <li>Full lesson content per module — no half-explanations</li>
        <li>AI Doubt Assistant that knows exactly where you are</li>
        <li>Coding exercises, capstone projects, and interview prep</li>
      </ul>
    `),
  }).catch(err => console.error('[email] welcome failed:', err))
}

export async function sendStreakRiskEmail(email: string, name: string, streak: number) {
  const firstName = name?.split(' ')[0] ?? 'there'
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${streak}-day streak is at risk 🔥`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">Don't lose your streak, ${firstName}!</h1>
      <p style="color:#475569;line-height:1.6;margin:0 0 16px">You haven't practiced in 3 days. Your <strong style="color:#0f172a">${streak}-day streak</strong> will reset if you don't complete at least one module today.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px">5 minutes is all it takes.</p>
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Continue Learning →</a>
    `),
  }).catch(err => console.error('[email] streak risk failed:', err))
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your AI Tutor Lab password',
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">Password Reset</h1>
      <p style="color:#475569;line-height:1.6;margin:0 0 24px">Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password →</a>
      <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">If you didn't request this, you can safely ignore this email.</p>
    `),
  }).catch(err => console.error('[email] password reset failed:', err))
}

export async function sendModuleCompleteEmail(email: string, name: string, moduleName: string, nextModule?: string) {
  const firstName = name?.split(' ')[0] ?? 'there'
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Module complete: ${moduleName} ✓`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">Nice work, ${firstName}! ✓</h1>
      <p style="color:#475569;line-height:1.6;margin:0 0 8px">You completed <strong style="color:#0f172a">${moduleName}</strong>.</p>
      ${nextModule ? `<p style="color:#475569;font-size:14px;margin:0 0 24px">Up next: <strong>${nextModule}</strong></p>` : '<p style="color:#475569;font-size:14px;margin:0 0 24px">Keep going — you\'re making great progress.</p>'}
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Continue Learning →</a>
    `),
  }).catch(err => console.error('[email] module complete failed:', err))
}
