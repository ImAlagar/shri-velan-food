import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
 async sendEmail({ to, subject, html, text }) {
    try {
      // Validate required fields
      if (!to) {
        throw new Error('Missing required field: to');
      }

      console.log('📧 Attempting to send email to:', to);

      // For testing, only send to verified email addresses
      const verifiedEmails = ['rohit17302@gmail.com']; // Add your verified emails here
      const recipients = Array.isArray(to) ? to : [to];
      
      // Filter to only verified emails in development
      const allowedRecipients = process.env.NODE_ENV === 'development' 
        ? recipients.filter(email => verifiedEmails.includes(email))
        : recipients;

      if (allowedRecipients.length === 0) {
        console.log('⚠️ No verified recipients for development testing');
        return { simulated: true, message: 'Email simulated for unverified recipient in development' };
      }

      const { data, error } = await resend.emails.send({
        from: 'Velan Store <onboarding@resend.dev>',
        to: allowedRecipients,
        subject,
        html,
        text: text || this.htmlToText(html),
      });

      if (error) {
        console.error('❌ Resend error:', error);
        throw error;
      }

      console.log('✅ Email sent successfully to:', allowedRecipients);
      return data;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      
      // Don't crash the app
      if (process.env.NODE_ENV === 'production') {
        console.log('📧 Email failure ignored in production');
        return { error: 'Email failed silently' };
      }
      
      throw error;
    }
  }

  // Helper to convert HTML to plain text
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async sendVerificationEmail(user, token) {
    if (!user || !user.email) {
      throw new Error('User or user email is missing');
    }

    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Velan Store!</h2>
        <p>Hello ${user.name || 'there'},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email
        </a>
        <p>Or copy this link: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Velan Store',
      html
    });
  }

  async sendPasswordResetEmail(user, token) {
    if (!user || !user.email) {
      throw new Error('User or user email is missing');
    }

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Reset Your Password</h2>
        <p>Hello ${user.name || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <a href="${resetUrl}" 
           style="background-color: #dc2626; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
      </div>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password - Velan Store',
      html
    });
  }

  async sendOrderConfirmation(order, user) {
    if (!user || !user.email) {
      throw new Error('User or user email is missing');
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Order Confirmed!</h2>
        <p>Thank you for your order, ${user.name}!</p>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
        <p>We'll notify you when your order ships.</p>
      </div>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `Order Confirmation #${order.id} - Velan Store`,
      html
    });
  }
}

export default new EmailService();