export async function sendVerificationEmail({ to, code, purpose = 'login' }) {
  const subject = purpose === 'reset' ? 'KikiJob 密码重置验证码' : 'KikiJob 登录验证码';

  if (process.env.NODE_ENV === 'production') {
    console.info(`[auth-email-disabled] ${subject} -> ${maskEmail(to)}. Supabase Auth handles email/password login.`);
    return { provider: 'disabled', sent: false };
  }

  console.info(`[dev-email] ${subject} -> ${maskEmail(to)} code=${code}`);
  return { provider: 'console', sent: true };
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}
