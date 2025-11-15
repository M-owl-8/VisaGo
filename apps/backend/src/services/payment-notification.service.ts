import { PrismaClient } from "@prisma/client";
import { emailService } from "./email.service";
import { fcmService } from "./fcm.service";

interface PaymentNotificationData {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  visaCountry: string;
  visaType: string;
  transactionId: string;
  timestamp: Date;
  paymentMethod?: string;
}

interface RefundNotificationData extends PaymentNotificationData {
  refundId: string;
  refundAmount: number;
  reason?: string;
}

/**
 * Payment Notification Service
 * Handles email and push notifications for payment events
 */
export class PaymentNotificationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Send payment success notification
   */
  async notifyPaymentSuccess(data: PaymentNotificationData): Promise<void> {
    try {
      // Send email
      await this.sendPaymentSuccessEmail(data);

      // Send push notification
      await this.sendPaymentSuccessPushNotification(data);

      // Log notification
      await this.logNotification(data.userId, "payment.success", data);
    } catch (error) {
      console.error("Error sending payment success notification:", error);
      // Don't throw - notifications shouldn't block payment flow
    }
  }

  /**
   * Send payment failure notification
   */
  async notifyPaymentFailure(
    data: PaymentNotificationData,
    error: string
  ): Promise<void> {
    try {
      // Send email
      await this.sendPaymentFailureEmail(data, error);

      // Send push notification
      await this.sendPaymentFailurePushNotification(data, error);

      // Log notification
      await this.logNotification(data.userId, "payment.failure", {
        ...data,
        error,
      });
    } catch (error) {
      console.error("Error sending payment failure notification:", error);
    }
  }

  /**
   * Send refund notification
   */
  async notifyRefundInitiated(data: RefundNotificationData): Promise<void> {
    try {
      // Send email
      await this.sendRefundInitiatedEmail(data);

      // Send push notification
      await this.sendRefundInitiatedPushNotification(data);

      // Log notification
      await this.logNotification(data.userId, "refund.initiated", data);
    } catch (error) {
      console.error("Error sending refund notification:", error);
    }
  }

  /**
   * Send refund completed notification
   */
  async notifyRefundCompleted(data: RefundNotificationData): Promise<void> {
    try {
      // Send email
      await this.sendRefundCompletedEmail(data);

      // Send push notification
      await this.sendRefundCompletedPushNotification(data);

      // Log notification
      await this.logNotification(data.userId, "refund.completed", data);
    } catch (error) {
      console.error("Error sending refund completed notification:", error);
    }
  }

  /**
   * Send receipt/invoice email
   */
  async sendReceipt(
    data: PaymentNotificationData,
    receiptUrl?: string
  ): Promise<void> {
    try {
      const emailContent = this.generateReceiptEmailHTML(
        data,
        receiptUrl
      );

      await emailService.send({
        to: data.userEmail,
        subject: `Payment Receipt - Visa Application (${data.transactionId})`,
        html: emailContent,
        text: `Payment Receipt\n\nTransaction ID: ${data.transactionId}\nAmount: ${data.currency} ${data.amount}\nVisa: ${data.visaType} for ${data.visaCountry}\nDate: ${data.timestamp.toISOString()}`,
      });
    } catch (error) {
      console.error("Error sending receipt:", error);
    }
  }

  // ============================================================================
  // PRIVATE EMAIL METHODS
  // ============================================================================

  private async sendPaymentSuccessEmail(data: PaymentNotificationData) {
    const html = `
      <h2>Payment Successful! ✅</h2>
      <p>Dear ${data.userName},</p>
      <p>Your payment has been processed successfully.</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Payment Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Amount:</strong> ${data.currency} ${data.amount.toFixed(2)}</li>
          <li><strong>Visa Type:</strong> ${data.visaType}</li>
          <li><strong>Country:</strong> ${data.visaCountry}</li>
          <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
          <li><strong>Date:</strong> ${data.timestamp.toLocaleString()}</li>
          ${data.paymentMethod ? `<li><strong>Payment Method:</strong> ${data.paymentMethod}</li>` : ''}
        </ul>
      </div>
      
      <p>Your visa application fee has been received. You can now proceed with your application.</p>
      <p>Next Steps:</p>
      <ol>
        <li>Complete your application form</li>
        <li>Upload required documents</li>
        <li>Submit your application</li>
      </ol>
      
      <p>If you have any questions, please contact our support team.</p>
      <p>Best regards,<br>VisaBuddy Team</p>
    `;

    await emailService.send({
      to: data.userEmail,
      subject: `Payment Successful - Visa Application Fee Received`,
      html,
      text: `Payment Successful\n\nYour payment of ${data.currency} ${data.amount} has been received.\nTransaction ID: ${data.transactionId}\nYou can now proceed with your visa application.`,
    });
  }

  private async sendPaymentFailureEmail(
    data: PaymentNotificationData,
    error: string
  ) {
    const html = `
      <h2>Payment Failed ❌</h2>
      <p>Dear ${data.userName},</p>
      <p>Unfortunately, your payment could not be processed.</p>
      
      <div style="background: #ffe6e6; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d32f2f;">
        <h3>Payment Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Amount:</strong> ${data.currency} ${data.amount.toFixed(2)}</li>
          <li><strong>Visa Type:</strong> ${data.visaType}</li>
          <li><strong>Country:</strong> ${data.visaCountry}</li>
          <li><strong>Error:</strong> ${error}</li>
          <li><strong>Date:</strong> ${data.timestamp.toLocaleString()}</li>
        </ul>
      </div>
      
      <p><strong>What you can do:</strong></p>
      <ul>
        <li>Check that your payment method has sufficient funds</li>
        <li>Try a different payment method</li>
        <li>Contact your bank to ensure there are no blocks on the transaction</li>
        <li>Try again in a few moments</li>
      </ul>
      
      <p><a href="${process.env.FRONTEND_URL || 'https://visabuddy.com'}/payment" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Retry Payment</a></p>
      
      <p>If the problem persists, please contact our support team.</p>
      <p>Best regards,<br>VisaBuddy Team</p>
    `;

    await emailService.send({
      to: data.userEmail,
      subject: `Payment Failed - Please Try Again`,
      html,
      text: `Payment Failed\n\nYour payment of ${data.currency} ${data.amount} could not be processed.\nError: ${error}\n\nPlease try again or contact support for assistance.`,
    });
  }

  private async sendRefundInitiatedEmail(data: RefundNotificationData) {
    const html = `
      <h2>Refund Initiated ⏳</h2>
      <p>Dear ${data.userName},</p>
      <p>Your refund request has been received and is being processed.</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Refund Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Refund Amount:</strong> ${data.currency} ${data.refundAmount.toFixed(2)}</li>
          <li><strong>Original Transaction ID:</strong> ${data.transactionId}</li>
          <li><strong>Refund ID:</strong> ${data.refundId}</li>
          ${data.reason ? `<li><strong>Reason:</strong> ${data.reason}</li>` : ''}
          <li><strong>Status:</strong> Processing</li>
        </ul>
      </div>
      
      <p>Refunds typically take 3-5 business days to appear in your account, depending on your bank.</p>
      
      <p>Best regards,<br>VisaBuddy Team</p>
    `;

    await emailService.send({
      to: data.userEmail,
      subject: `Refund Initiated - ${data.currency} ${data.refundAmount.toFixed(2)}`,
      html,
      text: `Refund Initiated\n\nYour refund of ${data.currency} ${data.refundAmount} is being processed.\nRefund ID: ${data.refundId}\nIt should appear in your account within 3-5 business days.`,
    });
  }

  private async sendRefundCompletedEmail(data: RefundNotificationData) {
    const html = `
      <h2>Refund Completed ✅</h2>
      <p>Dear ${data.userName},</p>
      <p>Your refund has been successfully processed and returned to your original payment method.</p>
      
      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
        <h3>Refund Details</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Refund Amount:</strong> ${data.currency} ${data.refundAmount.toFixed(2)}</li>
          <li><strong>Refund ID:</strong> ${data.refundId}</li>
          <li><strong>Completed Date:</strong> ${data.timestamp.toLocaleString()}</li>
        </ul>
      </div>
      
      <p>The refund should now be visible in your account.</p>
      
      <p>Best regards,<br>VisaBuddy Team</p>
    `;

    await emailService.send({
      to: data.userEmail,
      subject: `Refund Completed - ${data.currency} ${data.refundAmount.toFixed(2)}`,
      html,
      text: `Refund Completed\n\nYour refund of ${data.currency} ${data.refundAmount} has been successfully processed.\nRefund ID: ${data.refundId}\nThe funds should now be in your account.`,
    });
  }

  // ============================================================================
  // PRIVATE PUSH NOTIFICATION METHODS
  // ============================================================================

  private async sendPaymentSuccessPushNotification(data: PaymentNotificationData) {
    try {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId: data.userId },
      });

      for (const token of deviceTokens) {
        await fcmService.sendToDevice(token.token, {
          title: "Payment Successful ✅",
          body: `Your ${data.visaType} visa fee has been received.`,
          data: {
            type: "payment.success",
            transactionId: data.transactionId,
            amount: String(data.amount),
          },
          sound: "default",
        });
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  private async sendPaymentFailurePushNotification(
    data: PaymentNotificationData,
    error: string
  ) {
    try {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId: data.userId },
      });

      for (const token of deviceTokens) {
        await fcmService.sendToDevice(token.token, {
          title: "Payment Failed ❌",
          body: `Unable to process payment for ${data.visaType} visa.`,
          data: {
            type: "payment.failure",
            error,
            transactionId: data.transactionId,
          },
          sound: "default",
        });
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  private async sendRefundInitiatedPushNotification(data: RefundNotificationData) {
    try {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId: data.userId },
      });

      for (const token of deviceTokens) {
        await fcmService.sendToDevice(token.token, {
          title: "Refund Initiated ⏳",
          body: `Refund of ${data.currency} ${data.refundAmount.toFixed(2)} is being processed.`,
          data: {
            type: "refund.initiated",
            refundId: data.refundId,
            amount: String(data.refundAmount),
          },
          sound: "default",
        });
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  private async sendRefundCompletedPushNotification(data: RefundNotificationData) {
    try {
      const deviceTokens = await this.prisma.deviceToken.findMany({
        where: { userId: data.userId },
      });

      for (const token of deviceTokens) {
        await fcmService.sendToDevice(token.token, {
          title: "Refund Completed ✅",
          body: `${data.currency} ${data.refundAmount.toFixed(2)} has been refunded.`,
          data: {
            type: "refund.completed",
            refundId: data.refundId,
            amount: String(data.refundAmount),
          },
          sound: "default",
        });
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateReceiptEmailHTML(
    data: PaymentNotificationData,
    receiptUrl?: string
  ): string {
    return `
      <h2>Payment Receipt 📄</h2>
      <p>Dear ${data.userName},</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px;">
        <h3>Receipt Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;"><strong>Item</strong></td>
            <td style="padding: 10px; text-align: right;"><strong>Amount</strong></td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;">${data.visaType} - ${data.visaCountry}</td>
            <td style="padding: 10px; text-align: right;">${data.currency} ${data.amount.toFixed(2)}</td>
          </tr>
          <tr style="background: #e3f2fd;">
            <td style="padding: 10px;"><strong>Total</strong></td>
            <td style="padding: 10px; text-align: right;"><strong>${data.currency} ${data.amount.toFixed(2)}</strong></td>
          </tr>
        </table>
        
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
          <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
          <p><strong>Date:</strong> ${data.timestamp.toLocaleString()}</p>
          <p><strong>Payment Method:</strong> ${data.paymentMethod || 'Not specified'}</p>
        </div>
      </div>
      
      ${receiptUrl ? `<p><a href="${receiptUrl}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Download PDF Receipt</a></p>` : ''}
      
      <p style="color: #666; font-size: 12px;">This is an automated email. Please do not reply directly. For support, visit our website or contact our support team.</p>
    `;
  }

  private async logNotification(
    userId: string,
    type: string,
    data: any
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId,
          type,
          title: `Payment Notification - ${type}`,
          body: `Payment event: ${type}`,
          metadata: JSON.stringify(data),
          status: "sent",
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error logging notification:", error);
    }
  }
}