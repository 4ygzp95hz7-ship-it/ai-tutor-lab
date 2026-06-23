import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'AI Tutor Lab <noreply@aitutorlab.com>'

export async function sendWelcomeEmail(email: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Welcome to AI Tutor Lab, ${name}!`,
    html: `
      <h1>Welcome, ${name}! 🎓</h1>
      <p>You're all set. AI Tutor Lab will build you a complete, personalized learning roadmap for any topic you want to master.</p>
      <p><strong>Your first step:</strong> Type any topic in the search bar — "Machine Learning", "React", "System Design" — and we'll build your complete curriculum instantly.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" style="display:inline-block;background:#185FA5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Start Learning →</a>
      <p style="margin-top:24px;color:#64748b;font-size:13px">The AI Tutor Lab team</p>
    `,
  }).catch(console.error)
}

export async function sendStreakRiskEmail(email: string, name: string, streak: number) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Your ${streak}-day streak is at risk 🔥`,
    html: `
      <h2>Hey ${name}, don't lose your streak!</h2>
      <p>You haven't practiced in 3 days. Your <strong>${streak}-day streak</strong> will reset if you don't complete at least one module today.</p>
      <p>5 minutes is all it takes.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#185FA5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Continue Learning →</a>
    `,
  }).catch(console.error)
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your AI Tutor Lab password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#185FA5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">Reset Password →</a>
      <p style="margin-top:16px;color:#64748b;font-size:13px">If you didn't request this, ignore this email.</p>
    `,
  }).catch(console.error)
}
