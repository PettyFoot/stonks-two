import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporter) {
      // Check environment variables
      if (!process.env.EMAIL_FROM || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error('Email service not configured - missing EMAIL_FROM or EMAIL_APP_PASSWORD');
      }

      // Create transporter for sending emails
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_FROM,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      // Test transporter configuration
      try {
        await this.transporter.verify();
      } catch (error) {
        console.error('Email transporter verification failed:', error);
        throw new Error('Failed to configure email service');
      }
    }

    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = await this.getTransporter();

      const mailOptions: nodemailer.SendMailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
      };

      // Add reply-to if provided
      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', { messageId: result.messageId, to: options.to });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendNewUserNotification(userData: {
    name: string;
    email: string;
    auth0Id: string;
    signupTime: Date;
  }): Promise<void> {
    const emailContent = `
New User Signup - Trade Voyager Analytics

User Details:
Name: ${userData.name}
Email: ${userData.email}
Auth0 ID: ${userData.auth0Id}
Signup Time: ${userData.signupTime.toISOString()}
Signup Time (Local): ${userData.signupTime.toLocaleString()}

--
Automated notification from Trade Voyager Analytics
    `.trim();

    await this.sendEmail({
      to: process.env.EMAIL_FROM!,
      subject: `New User Signup: ${userData.name} (${userData.email})`,
      text: emailContent,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();