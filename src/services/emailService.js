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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #0a0a0f; }
          .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
          .card { background: linear-gradient(145deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo-text { font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
          .greeting { color: #ffffff; font-size: 18px; margin-bottom: 20px; }
          .message { color: #a0a0b0; font-size: 14px; line-height: 1.6; margin-bottom: 30px; }
          .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px; }
          .otp-code { font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .expiry { color: #ffc107; font-size: 12px; margin-top: 10px; }
          .warning { background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .warning-text { color: #ffc107; font-size: 12px; margin: 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="logo">
              <span class="logo-text">🔐 OTP Auth</span>
            </div>
            <div class="greeting">Merhaba ${name},</div>
            <div class="message">
              ${type === 'login' 
                ? 'Hesabınıza giriş yapmak için aşağıdaki doğrulama kodunu kullanın.' 
                : 'E-posta adresinizi doğrulamak için aşağıdaki kodu kullanın.'}
            </div>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
              <div class="expiry">Bu kod ${process.env.OTP_EXPIRES_MINUTES || 5} dakika içinde geçerliliğini yitirecek</div>
            </div>
            <div class="warning">
              <p class="warning-text">⚠️ Bu kodu kimseyle paylaşmayın. Resmi temsilcilerimiz asla kodunuzu sormaz.</p>
            </div>
            <div class="footer">
              Bu e-postayı siz talep etmediyseniz, lütfen dikkate almayın.
            </div>
          </div>
        </div>
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

