import * as nodemailer from 'nodemailer';
import { generateWelcomeEmail, WelcomeEmailData, generateSignupWelcomeEmail, SignupWelcomeEmailData, generateCouponEmail, CouponEmailData, generateFeedbackEmail, FeedbackEmailData, generateOnboardingCheckInEmail, OnboardingCheckInEmailData, generateOnboardingWithCouponEmail, OnboardingWithCouponEmailData, generateFormatDenialEmail, FormatDenialEmailData, generateDuplicateOrdersEmail, DuplicateOrdersEmailData, generateUploadDeletionNotificationEmail, UploadDeletionNotificationEmailData } from './templates';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
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
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_FROM,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      // Test transporter configuration
      try {
        await this.transporter!.verify();
      } catch (error) {
        console.error('Email transporter verification failed:', error);
        throw new Error('Failed to configure email service');
      }
    }

    return this.transporter!;
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

      // Add HTML content if provided
      if (options.html) {
        mailOptions.html = options.html;
      }

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

  async sendSubscriptionWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendSubscriptionWelcomeEmail called with data:`, {
        userEmail: data.userEmail,
        userName: data.userName,
        subscriptionTier: data.subscriptionTier,
        supportEmail: data.supportEmail
      });

      const emailContent = generateWelcomeEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      console.log('Welcome email sent successfully:', {
        to: data.userEmail,
        userName: data.userName,
        subscriptionTier: data.subscriptionTier
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  async sendSignupWelcomeEmail(data: SignupWelcomeEmailData): Promise<void> {
    try {
      const emailContent = generateSignupWelcomeEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      console.log('Signup welcome email sent successfully:', {
        to: data.userEmail,
        userName: data.userName
      });
    } catch (error) {
      console.error('Failed to send signup welcome email:', error);
      throw new Error('Failed to send signup welcome email');
    }
  }

  async sendCouponEmail(data: CouponEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendCouponEmail called with data:`, {
        userEmail: data.userEmail,
        userName: data.userName,
        supportEmail: data.supportEmail
      });

      const emailContent = generateCouponEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      console.log('Coupon email sent successfully:', {
        to: data.userEmail,
        userName: data.userName
      });
    } catch (error) {
      console.error('Failed to send coupon email:', error);
      throw new Error('Failed to send coupon email');
    }
  }

  async sendFeedbackRequest(data: FeedbackEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendFeedbackRequest called with data:`, {
        userEmail: data.userEmail,
        userName: data.userName,
        supportEmail: data.supportEmail
      });

      const emailContent = generateFeedbackEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        replyTo: data.supportEmail,
      });

      console.log('Feedback request email sent successfully:', {
        to: data.userEmail,
        userName: data.userName
      });
    } catch (error) {
      console.error('Failed to send feedback request email:', error);
      throw new Error('Failed to send feedback request email');
    }
  }

  async sendOnboardingCheckIn(data: OnboardingCheckInEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendOnboardingCheckIn called with data:`, {
        userEmail: data.userEmail,
        userName: data.userName,
        supportEmail: data.supportEmail
      });

      const emailContent = generateOnboardingCheckInEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        replyTo: data.supportEmail,
      });

      console.log('Onboarding check-in email sent successfully:', {
        to: data.userEmail,
        userName: data.userName
      });
    } catch (error) {
      console.error('Failed to send onboarding check-in email:', error);
      throw new Error('Failed to send onboarding check-in email');
    }
  }

  async sendOnboardingWithCoupon(data: OnboardingWithCouponEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendOnboardingWithCoupon called with data:`, {
        userEmail: data.userEmail,
        userName: data.userName,
        supportEmail: data.supportEmail
      });

      const emailContent = generateOnboardingWithCouponEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        replyTo: data.supportEmail,
      });

      console.log('Onboarding with coupon email sent successfully:', {
        to: data.userEmail,
        userName: data.userName
      });
    } catch (error) {
      console.error('Failed to send onboarding with coupon email:', error);
      throw new Error('Failed to send onboarding with coupon email');
    }
  }

  async sendFormatDenialEmail(data: FormatDenialEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendFormatDenialEmail called with data:`, {
        userEmail: data.userEmail,
        userName: data.userName,
        denialReason: data.denialReason,
        supportEmail: data.supportEmail
      });

      const emailContent = generateFormatDenialEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        replyTo: data.supportEmail,
      });

      console.log('Format denial email sent successfully:', {
        to: data.userEmail,
        userName: data.userName,
        denialReason: data.denialReason
      });
    } catch (error) {
      console.error('Failed to send format denial email:', error);
      throw new Error('Failed to send format denial email');
    }
  }

  async sendDuplicateOrdersNotification(data: DuplicateOrdersEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendDuplicateOrdersNotification called with data:`, {
        importBatchId: data.importBatchId,
        filename: data.filename,
        userId: data.userId,
        duplicatesCount: data.duplicates.length
      });

      const emailContent = generateDuplicateOrdersEmail(data);

      // Send to admin email (EMAIL_FROM)
      await this.sendEmail({
        to: process.env.EMAIL_FROM!,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      console.log('Duplicate orders notification sent successfully:', {
        importBatchId: data.importBatchId,
        duplicatesCount: data.duplicates.length
      });
    } catch (error) {
      console.error('Failed to send duplicate orders notification:', error);
      // Don't throw - we don't want email failures to break migration
      // Just log the error
    }
  }

  async sendUploadDeletionNotification(data: UploadDeletionNotificationEmailData): Promise<void> {
    try {
      console.log(`[DEBUG] sendUploadDeletionNotification called with data:`, {
        userEmail: data.userEmail,
        userName: data.userName,
        fileName: data.fileName,
        uploadDate: data.uploadDate,
        tradesAffected: data.tradesAffected,
        supportEmail: data.supportEmail
      });

      const emailContent = generateUploadDeletionNotificationEmail(data);

      await this.sendEmail({
        to: data.userEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        replyTo: data.supportEmail,
      });

      console.log('Upload deletion notification email sent successfully:', {
        to: data.userEmail,
        userName: data.userName,
        fileName: data.fileName
      });
    } catch (error) {
      console.error('Failed to send upload deletion notification email:', error);
      throw new Error('Failed to send upload deletion notification email');
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();