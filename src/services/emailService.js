const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendOTP(email, name, otpCode, type = 'login') {
    const subject = type === 'login' 
      ? 'Giriş Doğrulama Kodunuz' 
      : 'E-posta Doğrulama Kodunuz';

    const headerText = type === 'login' ? 'Giriş Yapalım' : 'Hesabınızı Doğrulayın';
    const bodyText = type === 'login' 
      ? 'inMapper sistemine giriş yapmak için bu kodu kullanın.'
      : 'inMapper hesabınızı doğrulamak için bu kodu kullanın.';

    const otpDigits = otpCode.split('').map(digit => 
      `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-size:28px;font-weight:700;color:#1a1a2e;background:#f0f0f5;border-radius:8px;margin:0 4px;">${digit}</span>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-height:100vh;">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:440px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding:40px 40px 32px;text-align:center;">
                    <!-- Logo -->
                    <img src="https://inmapper-otp.netlify.app/inmapper.png" alt="inMapper" style="height:48px;width:auto;margin-bottom:32px;">
                    
                    <!-- Header -->
                    <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#1a1a2e;">${headerText}</h1>
                    
                    <!-- Body Text -->
                    <p style="margin:0 0 8px;font-size:15px;color:#64748b;line-height:1.5;">${bodyText}</p>
                    <p style="margin:0 0 32px;font-size:14px;color:#94a3b8;">Bu kod ${process.env.OTP_EXPIRES_MINUTES || 5} dakika içinde geçersiz olacak.</p>
                    
                    <!-- OTP Code -->
                    <div style="margin-bottom:32px;">
                      ${otpDigits}
                    </div>
                    
                    <!-- Info Text -->
                    <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Bu kod ile güvenli giriş yapılacak:</p>
                    <p style="margin:0 0 24px;font-size:15px;color:#3b82f6;font-weight:500;">${email}</p>
                    
                    <!-- Footer -->
                    <p style="margin:0;font-size:13px;color:#94a3b8;">Bu e-postayı siz talep etmediyseniz, güvenle görmezden gelebilirsiniz.</p>
                  </td>
                </tr>
              </table>
              
              <!-- Bottom Footer -->
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} inMapper - Mapping and Location Technologies</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"OTP Auth" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send error:', error);
      throw new Error('Failed to send email');
    }
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();



