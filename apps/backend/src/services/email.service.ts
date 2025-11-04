import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private nodemailerTransporter: nodemailer.Transporter | null = null;
  private sendgridConfigured = false;

  constructor() {
    this.initializeServices();
  }

  private initializeServices(): void {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.sendgridConfigured = true;
        console.log('✅ SendGrid email service initialized');
      } catch (error) {
        console.warn('⚠️ SendGrid initialization failed, will use Nodemailer');
      }
    }

    // Initialize Nodemailer
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      try {
        this.nodemailerTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        });
        console.log('✅ Nodemailer email service initialized');
      } catch (error) {
        console.warn('⚠️ Nodemailer initialization failed');
      }
    }

    if (!this.sendgridConfigured && !this.nodemailerTransporter) {
      console.warn('⚠️ No email service configured. Emails will be logged only.');
    }
  }

  async send(payload: EmailPayload): Promise<boolean> {
    const from = process.env.SMTP_FROM_EMAIL || 'noreply@visabuddy.com';

    try {
      // Try SendGrid first (if configured)
      if (this.sendgridConfigured) {
        try {
          await sgMail.send({
            to: payload.to,
            from,
            subject: payload.subject,
            html: payload.html,
            text: payload.text || payload.html,
          });
          console.log(`📧 Email sent via SendGrid to ${payload.to}`);
          return true;
        } catch (error) {
          console.warn(`⚠️ SendGrid delivery failed: ${error}. Trying Nodemailer...`);
        }
      }

      // Fallback to Nodemailer
      if (this.nodemailerTransporter) {
        await this.nodemailerTransporter.sendMail({
          from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text || payload.html,
        });
        console.log(`📧 Email sent via Nodemailer to ${payload.to}`);
        return true;
      }

      // Log if no service available
      console.log(`📧 [DEV MODE] Email would be sent to ${payload.to}:\n${payload.subject}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // Email templates

  static welcomeEmail(userName: string, email: string): EmailPayload {
    return {
      to: email,
      subject: 'Welcome to VisaBuddy!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Welcome to VisaBuddy, ${userName}!</h2>
          <p>We're excited to have you on board. VisaBuddy is your personal visa application assistant.</p>
          <p><strong>What you can do:</strong></p>
          <ul>
            <li>📋 Track your visa applications</li>
            <li>📄 Upload and manage documents</li>
            <li>💬 Get AI-powered assistance</li>
            <li>💳 Secure online payments</li>
          </ul>
          <p>Get started by selecting your destination country.</p>
          <a href="${process.env.FRONTEND_URL || 'https://visabuddy.com'}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Start Your Application
          </a>
          <br><br>
          <p style="color: #666; font-size: 12px;">Questions? Contact us at support@visabuddy.com</p>
        </div>
      `,
      text: `Welcome to VisaBuddy, ${userName}!\n\nStart your visa application at ${process.env.FRONTEND_URL || 'https://visabuddy.com'}`,
    };
  }

  static paymentConfirmationEmail(userName: string, email: string, data: {
    amount: number;
    currency: string;
    transactionId: string;
    country: string;
    visaType: string;
  }): EmailPayload {
    return {
      to: email,
      subject: `✅ Payment Confirmed - ${data.country} ${data.visaType} Visa`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Payment Confirmed!</h2>
          <p>Hi ${userName},</p>
          <p>Your payment has been successfully processed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.amount} ${data.currency}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Application</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.country} - ${data.visaType}</td>
            </tr>
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Transaction ID</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><code>${data.transactionId}</code></td>
            </tr>
          </table>
          <p>You can now proceed to upload your documents. Our team will review them shortly.</p>
          <a href="${process.env.FRONTEND_URL || 'https://visabuddy.com'}/dashboard" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Application
          </a>
          <br><br>
          <p style="color: #666; font-size: 12px;">Keep this transaction ID for your records.</p>
        </div>
      `,
      text: `Payment Confirmed!\n\nAmount: ${data.amount} ${data.currency}\nApplication: ${data.country} - ${data.visaType}\nTransaction ID: ${data.transactionId}`,
    };
  }

  static documentUploadedEmail(userName: string, email: string, data: {
    documentType: string;
    applicationId: string;
    country: string;
  }): EmailPayload {
    return {
      to: email,
      subject: `📄 Document Uploaded - ${data.documentType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Document Uploaded!</h2>
          <p>Hi ${userName},</p>
          <p>Your <strong>${data.documentType}</strong> has been successfully uploaded to your ${data.country} visa application.</p>
          <p>Our team will review it shortly. We'll notify you once the document is verified.</p>
          <a href="${process.env.FRONTEND_URL || 'https://visabuddy.com'}/dashboard/application/${data.applicationId}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Application
          </a>
          <br><br>
          <p style="color: #666; font-size: 12px;">Status updates will be sent as your application progresses.</p>
        </div>
      `,
      text: `Document Uploaded!\n\nYour ${data.documentType} has been uploaded to your ${data.country} visa application.`,
    };
  }

  static documentVerifiedEmail(userName: string, email: string, data: {
    documentType: string;
    applicationId: string;
    country: string;
    status: 'verified' | 'rejected';
  }): EmailPayload {
    const statusLabel = data.status === 'verified' ? '✅ Verified' : '❌ Rejected';
    const statusColor = data.status === 'verified' ? '#28a745' : '#dc3545';

    return {
      to: email,
      subject: `${statusLabel} - ${data.documentType}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: ${statusColor};">Document ${statusLabel}</h2>
          <p>Hi ${userName},</p>
          <p>Your <strong>${data.documentType}</strong> has been ${data.status === 'verified' ? 'verified ✅' : 'rejected ❌'}.</p>
          ${
            data.status === 'rejected'
              ? '<p>Please upload a new document or contact support for details.</p>'
              : '<p>Thank you for providing this document. We\'ll continue processing your application.</p>'
          }
          <a href="${process.env.FRONTEND_URL || 'https://visabuddy.com'}/dashboard/application/${data.applicationId}" style="background: ${statusColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Application
          </a>
          <br><br>
          <p style="color: #666; font-size: 12px;">Questions? Contact us at support@visabuddy.com</p>
        </div>
      `,
      text: `Document ${statusLabel}\n\nYour ${data.documentType} has been ${data.status === 'verified' ? 'verified' : 'rejected'}.`,
    };
  }

  static visaStatusUpdateEmail(userName: string, email: string, data: {
    country: string;
    visaType: string;
    status: 'approved' | 'rejected' | 'pending_review';
    applicationId: string;
  }): EmailPayload {
    const statusLabels = {
      approved: { label: '✅ Approved', color: '#28a745' },
      rejected: { label: '❌ Rejected', color: '#dc3545' },
      pending_review: { label: '⏳ Under Review', color: '#ffc107' },
    };

    const { label, color } = statusLabels[data.status];

    return {
      to: email,
      subject: `${label} - Your ${data.country} ${data.visaType} Visa Application`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: ${color};">${label}</h2>
          <p>Hi ${userName},</p>
          <p>We have an update on your <strong>${data.country} ${data.visaType}</strong> visa application.</p>
          <p style="font-size: 18px; font-weight: bold; color: ${color};">Status: ${label}</p>
          <a href="${process.env.FRONTEND_URL || 'https://visabuddy.com'}/dashboard/application/${data.applicationId}" style="background: ${color}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Details
          </a>
          <br><br>
          <p style="color: #666; font-size: 12px;">For detailed information and next steps, please log in to your VisaBuddy account.</p>
        </div>
      `,
      text: `${label}\n\nYour ${data.country} ${data.visaType} visa application: ${label}`,
    };
  }

  static missingDocumentsReminderEmail(userName: string, email: string, data: {
    applicationId: string;
    country: string;
    missingDocuments: string[];
  }): EmailPayload {
    return {
      to: email,
      subject: `📋 Reminder: Missing Documents for Your ${data.country} Visa`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Missing Documents Reminder</h2>
          <p>Hi ${userName},</p>
          <p>To proceed with your <strong>${data.country}</strong> visa application, please upload the following documents:</p>
          <ul>
            ${data.missingDocuments.map((doc) => `<li>${doc}</li>`).join('')}
          </ul>
          <p>Uploading these documents will help us process your application faster.</p>
          <a href="${process.env.FRONTEND_URL || 'https://visabuddy.com'}/dashboard/application/${data.applicationId}/documents" style="background: #ff9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Upload Documents
          </a>
          <br><br>
          <p style="color: #666; font-size: 12px;">Questions? Contact our support team at support@visabuddy.com</p>
        </div>
      `,
      text: `Missing Documents Reminder\n\nPlease upload: ${data.missingDocuments.join(', ')}`,
    };
  }
}

export const emailService = new EmailService();