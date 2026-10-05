import nodemailer from 'nodemailer';
export function mailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}
export async function sendResetCode(email, code) {
  if (!mailConfigured())
    throw Object.assign(new Error('Dịch vụ email chưa được cấu hình. Vui lòng thử lại sau.'), {
      status: 503,
    });
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    requireTLS: process.env.SMTP_PORT !== '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Mã khôi phục mật khẩu Playroom',
    text: `Mã xác minh của bạn: ${code}\nMã có hiệu lực 10 phút và chỉ dùng một lần. Không chia sẻ mã với người khác. Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.`,
  });
}
