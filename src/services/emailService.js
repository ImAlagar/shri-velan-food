import nodemailer from 'nodemailer';
import { 
  SMTP_HOST, 
  SMTP_PORT, 
  SMTP_USER, 
  SMTP_PASS, 
  FROM_EMAIL,
  CLIENT_URL 
} from '../config/index.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // Use TLS
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      }
    });

    // Verify transporter configuration
    this.verifyTransporter();
  }

  async verifyTransporter() {
    try {
      await this.transporter.verify();
      console.log('Email transporter is ready');
    } catch (error) {
      console.error('Email transporter verification failed:', error);
    }
  }

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: FROM_EMAIL,
        to,
        subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to: ${to}`, result.messageId);
      return result;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await this.sendEmail(email, 'Password Reset Request', html);
  }

  async sendOrderConfirmationEmail(email, order) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
        <p>We'll notify you when your order ships.</p>
      </div>
    `;

    await this.sendEmail(email, 'Order Confirmation', html);
  }
}

export default new EmailService();