import nodemailer from 'nodemailer';
import { User } from '@shared/schema';

// Email templates
const EMAIL_TEMPLATES = {
  verification: (token: string, email: string) => ({
    subject: 'Verify your PerraStay account',
    html: `
      <h1>Welcome to PerraStay!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${process.env.APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `
  }),
  passwordReset: (token: string) => ({
    subject: 'Reset your PerraStay password',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <a href="${process.env.APP_URL}/reset-password?token=${token}">Reset Password</a>
      <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
    `
  })
};

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationEmail(user: User, token: string) {
    const template = EMAIL_TEMPLATES.verification(token, user.email);
    return this.sendEmail(user.email, template.subject, template.html);
  }

  async sendPasswordResetEmail(user: User, token: string) {
    const template = EMAIL_TEMPLATES.passwordReset(token);
    return this.sendEmail(user.email, template.subject, template.html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html
      });
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();