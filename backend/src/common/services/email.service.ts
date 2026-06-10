import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoApiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  /** True only when a non-placeholder API key is configured */
  private get isConfigured(): boolean {
    return (
      !!this.brevoApiKey &&
      this.brevoApiKey.length > 20 &&
      !this.brevoApiKey.startsWith('your-') &&
      !this.brevoApiKey.startsWith('REPLACE')
    );
  }

  constructor(private configService: ConfigService) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') ?? '';
    this.senderEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') ?? 'no-reply@example.com';
    this.senderName =
      this.configService.get<string>('BREVO_SENDER_NAME') ?? 'E-Nutrition Rwanda';
  }

  private async sendEmail(
    to: string,
    name: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    // Skip silently if email is not configured — don't block the caller
    if (!this.isConfigured) {
      this.logger.warn(
        `Email not sent to ${to} — BREVO_API_KEY is not configured. ` +
          'Add a valid key to .env to enable email delivery.',
      );
      return;
    }

    try {
      const response = await fetch(this.brevoApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.brevoApiKey,
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: to, name }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        this.logger.error(
          `Email delivery failed [${response.status}] to ${to}: ${body}`,
        );
      } else {
        this.logger.log(`Email delivered to ${to} — "${subject}"`);
      }
    } catch (error: any) {
      // Network error, DNS failure, etc. — log but do NOT re-throw
      this.logger.error(
        `Email send error to ${to}: ${error?.message ?? error}`,
      );
    }
  }

  /**
   * Send welcome email with auto-generated credentials.
   * This call is fire-and-forget — it never rejects.
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    email: string,
    password: string,
  ): Promise<void> {
    const subject = 'Welcome to E-Nutrition Rwanda — Your Login Credentials';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #16a34a, #047857); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">E-Nutrition Rwanda</h1>
            <p style="color: #bbf7d0; margin: 4px 0 0; font-size: 13px;">Ministry of Health · Rwanda Biomedical Center</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; font-size: 18px;">Welcome, ${name}!</h2>
            <p style="color: #4b5563;">Your account has been created. Use the credentials below to sign in:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 10px 14px; background: #ffffff; border: 1px solid #e5e7eb; font-weight: 600; width: 100px;">Email</td>
                <td style="padding: 10px 14px; background: #ffffff; border: 1px solid #e5e7eb; font-family: monospace;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; background: #ffffff; border: 1px solid #e5e7eb; font-weight: 600;">Password</td>
                <td style="padding: 10px 14px; background: #ffffff; border: 1px solid #e5e7eb; font-family: monospace; font-size: 16px; letter-spacing: 2px;">${password}</td>
              </tr>
            </table>
            <p style="color: #dc2626; font-size: 13px;">⚠ Please log in and change your password immediately after your first sign-in.</p>
            <a href="http://localhost:5173" style="display: inline-block; margin-top: 8px; padding: 10px 20px; background: #16a34a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Sign in now →</a>
          </div>
          <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 16px;">
            This is an automated message from E-Nutrition Rwanda. Do not reply to this email.
          </p>
        </body>
      </html>
    `;
    await this.sendEmail(to, name, subject, htmlContent);
  }

  /**
   * Send a one-time password reset OTP.
   * This call is fire-and-forget — it never rejects.
   */
  async sendOtpEmail(to: string, name: string, otp: string): Promise<void> {
    const subject = 'Your Password Reset OTP — E-Nutrition Rwanda';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #16a34a, #047857); padding: 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">E-Nutrition Rwanda</h1>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; font-size: 18px;">Password Reset Request</h2>
            <p style="color: #4b5563;">Hi ${name}, use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #16a34a; background: #f0fdf4; padding: 16px 32px; border-radius: 8px; border: 2px dashed #86efac;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 13px;">If you did not request a password reset, please ignore this email. Your account remains secure.</p>
          </div>
        </body>
      </html>
    `;
    await this.sendEmail(to, name, subject, htmlContent);
  }
}
