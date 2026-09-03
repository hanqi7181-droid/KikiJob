export async function sendVerificationEmail({ to, code, purpose = 'login' }) {
  const provider = String(process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  const from = process.env.EMAIL_FROM || 'KikiJob <no-reply@kikijob.local>';
  const subject = purpose === 'reset' ? 'KikiJob 密码重置验证码' : 'KikiJob 登录验证码';
  const text = `你的 KikiJob 验证码是：${code}。验证码 10 分钟内有效，请勿转发给他人。`;

  if (provider === 'resend') {
    return sendWithResend({ from, to, subject, text });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境邮件服务未配置：请设置 EMAIL_PROVIDER=resend、EMAIL_PROVIDER_API_KEY 和 EMAIL_FROM');
  }

  console.info(`[dev-email] ${subject} -> ${maskEmail(to)} code=${code}`);
  return { provider: 'console', sent: true };
}

async function sendWithResend({ from, to, subject, text }) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  if (!apiKey) throw new Error('EMAIL_PROVIDER_API_KEY is required for Resend email delivery');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    throw new Error(`邮件发送失败：${response.status} ${payload.slice(0, 160)}`);
  }

  return { provider: 'resend', sent: true };
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}
