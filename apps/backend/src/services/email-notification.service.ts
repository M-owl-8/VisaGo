import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { EmailTemplatesService } from './email-templates.service';

/**
 * Email Notification Service
 * Handles sending transactional emails to users
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

interface EmailLog {
  id: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  type: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  sentAt?: Date;
  createdAt: Date;
}

type EmailType = 'payment_confirmation' | 'payment_failed' | 'visa_status_update' | 'welcome';

export class EmailNotificationService {
  private transporter: nodemailer.Transporter;
  private prisma: PrismaClient;
  private emailTemplatesService: EmailTemplatesService;
  private retryAttempts: number = 3;
  private retryDelay: number = 5000; // 5 seconds

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.emailTemplatesService = new EmailTemplatesService();

    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'apikey',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    userId: string,
    userEmail: string,
    paymentDetails: {
      transactionId: string;
      amount: number;
      currency: string;
      method: string;
      applicationId?: string;
      applicationCountry?: string;
      visaType?: string;
    }
  ): Promise<EmailLog> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

      const html = this.emailTemplatesService.paymentConfirmationTemplate({
        userName,
        transactionId: paymentDetails.transactionId,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        method: paymentDetails.method,
        date: new Date().toLocaleDateString(),
        applicationCountry: paymentDetails.applicationCountry,
        visaType: paymentDetails.visaType,
      });

      const emailLog = await this.sendEmail(
        {
          to: userEmail,
          subject: 'Payment Confirmation - VisaBuddy',
          html,
        },
        userId,
        'payment_confirmation'
      );

      return emailLog;
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailed(
    userId: string,
    userEmail: string,
    failureDetails: {
      transactionId?: string;
      amount: number;
      currency: string;
      reason: string;
      errorCode?: string;
      retryUrl?: string;
    }
  ): Promise<EmailLog> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

      const html = this.emailTemplatesService.paymentFailedTemplate({
        userName,
        transactionId: failureDetails.transactionId,
        amount: failureDetails.amount,
        currency: failureDetails.currency,
        method: 'card',
        reason: failureDetails.reason,
        errorCode: failureDetails.errorCode,
        retryUrl: failureDetails.retryUrl,
      });

      const emailLog = await this.sendEmail(
        {
          to: userEmail,
          subject: 'Payment Failed - Retry Available - VisaBuddy',
          html,
        },
        userId,
        'payment_failed'
      );

      return emailLog;
    } catch (error) {
      console.error('Error sending payment failed notification:', error);
      throw error;
    }
  }

  /**
   * Send visa status update email
   */
  async sendVisaStatusUpdate(
    userId: string,
    userEmail: string,
    statusDetails: {
      applicationId: string;
      country: string;
      visaType: string;
      previousStatus: string;
      newStatus: string;
      updateDate: Date;
      notes?: string;
    }
  ): Promise<EmailLog> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const userName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';

      const html = this.emailTemplatesService.visaStatusUpdateTemplate({
        userName,
        applicationId: 'default',
        country: statusDetails.country,
        visaType: statusDetails.visaType,
        status: statusDetails.newStatus,
        previousStatus: statusDetails.previousStatus,
        date: statusDetails.updateDate.toISOString().split('T')[0],
      });

      const emailLog = await this.sendEmail(
        {
          to: userEmail,
          subject: `Visa Status Update: ${statusDetails.country} - VisaBuddy`,
          html,
        },
        userId,
        'visa_status_update'
      );

      return emailLog;
    } catch (error) {
      console.error('Error sending visa status update:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(userId: string, userEmail: string, userName: string): Promise<EmailLog> {
    try {
      const html = this.emailTemplatesService.welcomeTemplate({
        userName,
        email: userEmail,
      });

      const emailLog = await this.sendEmail(
        {
          to: userEmail,
          subject: 'Welcome to VisaBuddy - Your Visa Assistant',
          html,
        },
        userId,
        'welcome'
      );

      return emailLog;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(
    userId: string,
    userEmail: string,
    subject: string,
    html: string,
    emailType: EmailType = 'welcome'
  ): Promise<EmailLog> {
    return this.sendEmail(
      {
        to: userEmail,
        subject,
        html,
      },
      userId,
      emailType
    );
  }

  /**
   * Get email logs for a user
   */
  async getEmailLogs(userId: string, limit: number = 50): Promise<EmailLog[]> {
    try {
      const logs = await this.prisma.emailLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs.map((log: any) => ({
        id: log.id,
        userId: log.userId,
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        type: log.type || 'general',
        status: log.status as 'pending' | 'sent' | 'failed',
        error: log.error || undefined,
        sentAt: log.sentAt || undefined,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      console.error('Error retrieving email logs:', error);
      throw new Error('Failed to retrieve email logs');
    }
  }

  /**
   * Get email statistics
   */
  async getEmailStats(userId: string) {
    try {
      const logs = await this.prisma.emailLog.findMany({
        where: { userId },
      });

      const stats = {
        total: logs.length,
        sent: logs.filter((l: any) => l.status === 'sent').length,
        failed: logs.filter((l: any) => l.status === 'failed').length,
        pending: logs.filter((l: any) => l.status === 'pending').length,
        byType: this.groupByType(logs),
      };

      return stats;
    } catch (error) {
      console.error('Error getting email statistics:', error);
      throw new Error('Failed to retrieve email statistics');
    }
  }

  /**
   * Verify email configuration
   */
  async verifyConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email configuration is valid');
      return true;
    } catch (error) {
      console.error('Email configuration error:', error);
      return false;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(recipientEmail: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || 'noreply@visabuddy.com',
        to: recipientEmail,
        subject: 'VisaBuddy - Test Email',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif;">
              <h1>Test Email</h1>
              <p>This is a test email from VisaBuddy.</p>
              <p>Email configuration is working correctly!</p>
            </body>
          </html>
        `,
      });

      console.log(`Test email sent to ${recipientEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending test email:', error);
      return false;
    }
  }

  /**
   * Private helper: Send email with retry logic
   */
  private async sendEmail(
    options: EmailOptions,
    userId: string,
    emailType: EmailType,
    attempt: number = 1
  ): Promise<EmailLog> {
    // Create initial email log
    let emailLog = await this.prisma.emailLog.create({
      data: {
        userId,
        recipientEmail: options.to,
        subject: options.subject,
        type: emailType,
        status: 'pending',
      },
    });

    try {
      // Send email
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM_EMAIL || 'noreply@visabuddy.com',
        ...options,
      });

      // Update log to sent
      emailLog = await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      });

      console.log(`Email sent: ${emailType} to ${options.to}`);
      return this.mapEmailLog(emailLog);
    } catch (error) {
      console.error(`Error sending email (attempt ${attempt}/${this.retryAttempts}):`, error);

      // Retry if attempts remain
      if (attempt < this.retryAttempts) {
        console.log(`Retrying in ${this.retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.sendEmail(options, userId, emailType, attempt + 1);
      }

      // Max retries reached - mark as failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      emailLog = await this.prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'failed',
          error: errorMessage,
        },
      });

      throw error;
    }
  }

  /**
   * Private helper: Map email log
   */
  private mapEmailLog(log: { id: string; userId: string; recipientEmail: string; subject: string; type: string | null; status: string; error: string | null; sentAt: Date | null; createdAt: Date }): EmailLog {
    return {
      id: log.id,
      userId: log.userId,
      recipientEmail: log.recipientEmail,
      subject: log.subject,
      type: log.type || 'general',
      status: (log.status as 'pending' | 'sent' | 'failed'),
      error: log.error || undefined,
      sentAt: log.sentAt || undefined,
      createdAt: log.createdAt,
    };
  }

  /**
   * Private helper: Group logs by type
   */
  private groupByType(logs: { type: string | null }[]) {
    const grouped: Record<string, number> = {};

    logs.forEach((log: typeof logs[0]) => {
      const type = log.type || 'general';
      grouped[type] = (grouped[type] || 0) + 1;
    });

    return grouped;
  }
}