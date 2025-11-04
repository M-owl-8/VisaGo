import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

/**
 * FCM (Firebase Cloud Messaging) Notification Service
 * Handles push notifications to mobile devices
 */

interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  deviceId: string;
  platform: 'ios' | 'android';
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

interface NotificationPayload {
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
  sound?: string;
  badge?: string;
  channelId?: string;
}

interface NotificationLog {
  id: string;
  userId: string;
  deviceToken?: string;
  title: string;
  body: string;
  type: string;
  status: 'sent' | 'failed';
  failureReason?: string;
  createdAt: Date;
}

type NotificationType =
  | 'payment_success'
  | 'payment_failed'
  | 'visa_status_update'
  | 'chat_message'
  | 'application_reminder'
  | 'document_reminder';

export class FCMNotificationService {
  private prisma: PrismaClient;
  private messaging: admin.messaging.Messaging;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.messaging = admin.messaging();
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    deviceId: string,
    platform: 'ios' | 'android'
  ): Promise<DeviceToken> {
    try {
      // Check if token already exists
      const existing = await this.prisma.deviceToken.findFirst({
        where: { token, userId },
      });

      if (existing) {
        // Update existing token
        const updated = await this.prisma.deviceToken.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            lastUsedAt: new Date(),
          },
        });

        return this.mapDeviceToken(updated);
      }

      // Create new token
      const newToken = await this.prisma.deviceToken.create({
        data: {
          userId,
          token,
          deviceId,
          platform,
          isActive: true,
        },
      });

      console.log(`Device token registered: ${deviceId} (${platform})`);
      return this.mapDeviceToken(newToken);
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string, userId: string): Promise<boolean> {
    try {
      const deleted = await this.prisma.deviceToken.deleteMany({
        where: { token, userId },
      });

      console.log(`Device token unregistered: ${deleted.count} tokens`);
      return deleted.count > 0;
    } catch (error) {
      console.error('Error unregistering device token:', error);
      throw error;
    }
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccessNotification(
    userId: string,
    paymentDetails: {
      amount: number;
      currency: string;
      applicationCountry: string;
      transactionId: string;
    }
  ): Promise<NotificationLog[]> {
    const payload: NotificationPayload = {
      title: '✅ Payment Successful',
      body: `Your ${paymentDetails.currency} ${paymentDetails.amount} payment for ${paymentDetails.applicationCountry} visa has been processed.`,
      type: 'payment_success',
      data: {
        transactionId: paymentDetails.transactionId,
        country: paymentDetails.applicationCountry,
      },
      sound: 'default',
      badge: '1',
    };

    return this.sendNotificationToUser(userId, payload, 'payment_success');
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedNotification(
    userId: string,
    paymentDetails: {
      amount: number;
      currency: string;
      reason: string;
      applicationCountry: string;
      transactionId?: string;
    }
  ): Promise<NotificationLog[]> {
    const payload: NotificationPayload = {
      title: '❌ Payment Failed',
      body: `Payment for ${paymentDetails.applicationCountry} visa failed. ${paymentDetails.reason}`,
      type: 'payment_failed',
      data: {
        transactionId: paymentDetails.transactionId || 'unknown',
        country: paymentDetails.applicationCountry,
      },
      sound: 'default',
      badge: '1',
    };

    return this.sendNotificationToUser(userId, payload, 'payment_failed');
  }

  /**
   * Send visa status update notification
   */
  async sendVisaStatusUpdateNotification(
    userId: string,
    statusDetails: {
      country: string;
      visaType: string;
      newStatus: string;
      applicationId: string;
    }
  ): Promise<NotificationLog[]> {
    const statusEmoji = this.getStatusEmoji(statusDetails.newStatus);
    const payload: NotificationPayload = {
      title: `${statusEmoji} Visa Status Update`,
      body: `Your ${statusDetails.country} ${statusDetails.visaType} visa is now ${statusDetails.newStatus}.`,
      type: 'visa_status_update',
      data: {
        applicationId: statusDetails.applicationId,
        country: statusDetails.country,
        status: statusDetails.newStatus,
      },
      sound: 'default',
      badge: '1',
    };

    return this.sendNotificationToUser(userId, payload, 'visa_status_update');
  }

  /**
   * Send chat message notification
   */
  async sendChatMessageNotification(userId: string, message: string): Promise<NotificationLog[]> {
    const payload: NotificationPayload = {
      title: '💬 New Chat Message',
      body: message.substring(0, 100),
      type: 'chat_message',
      data: {
        type: 'chat_message',
      },
      sound: 'default',
      badge: '1',
      channelId: 'messages',
    };

    return this.sendNotificationToUser(userId, payload, 'chat_message');
  }

  /**
   * Send application reminder notification
   */
  async sendApplicationReminderNotification(
    userId: string,
    reminderDetails: {
      country: string;
      visaType: string;
      applicationId: string;
      daysUntilDeadline: number;
    }
  ): Promise<NotificationLog[]> {
    const payload: NotificationPayload = {
      title: '⏰ Application Reminder',
      body: `${reminderDetails.country} ${reminderDetails.visaType} visa deadline in ${reminderDetails.daysUntilDeadline} days.`,
      type: 'application_reminder',
      data: {
        applicationId: reminderDetails.applicationId,
        country: reminderDetails.country,
      },
      sound: 'default',
      badge: '1',
      channelId: 'reminders',
    };

    return this.sendNotificationToUser(userId, payload, 'application_reminder');
  }

  /**
   * Send document reminder notification
   */
  async sendDocumentReminderNotification(
    userId: string,
    reminderDetails: {
      country: string;
      documentType: string;
      applicationId: string;
    }
  ): Promise<NotificationLog[]> {
    const payload: NotificationPayload = {
      title: '📄 Document Required',
      body: `Please upload ${reminderDetails.documentType} for your ${reminderDetails.country} visa application.`,
      type: 'document_reminder',
      data: {
        applicationId: reminderDetails.applicationId,
        country: reminderDetails.country,
        documentType: reminderDetails.documentType,
      },
      sound: 'default',
      badge: '1',
      channelId: 'reminders',
    };

    return this.sendNotificationToUser(userId, payload, 'document_reminder');
  }

  /**
   * Get device tokens for user
   */
  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    try {
      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId, isActive: true },
      });

      return tokens.map((token: any): any => this.mapDeviceToken(token));
    } catch (error) {
      console.error('Error retrieving device tokens:', error);
      return [];
    }
  }

  /**
   * Get notification logs for user
   */
  async getNotificationLogs(userId: string, limit: number = 50): Promise<NotificationLog[]> {
    try {
      const logs = await this.prisma.notificationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs.map((log: any): any => ({
        id: log.id,
        userId: log.userId,
        deviceToken: log.deviceTokenId || undefined,
        title: log.title,
        body: log.body,
        type: log.type,
        status: log.status as 'sent' | 'failed',
        failureReason: log.failureReason || undefined,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      console.error('Error retrieving notification logs:', error);
      return [];
    }
  }

  /**
   * Clean up inactive device tokens
   */
  async cleanupInactiveTokens(daysSinceLastUse: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastUse);

      const deleted = await this.prisma.deviceToken.deleteMany({
        where: {
          isActive: false,
          lastUsedAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`Cleaned up ${deleted.count} inactive device tokens`);
      return deleted.count;
    } catch (error) {
      console.error('Error cleaning up device tokens:', error);
      throw error;
    }
  }

  /**
   * Private helper: Send notification to user's devices
   */
  private async sendNotificationToUser(
    userId: string,
    payload: NotificationPayload,
    notificationType: NotificationType
  ): Promise<NotificationLog[]> {
    try {
      const deviceTokens = await this.getUserDeviceTokens(userId);

      if (deviceTokens.length === 0) {
        console.log(`No active device tokens for user ${userId}`);
        return [];
      }

      const logs: NotificationLog[] = [];

      for (const device of deviceTokens) {
        try {
          const message: admin.messaging.Message = {
            notification: {
              title: payload.title,
              body: payload.body,
              imageUrl: 'https://example.com/icon.png', // Update with actual icon URL
            },
            data: payload.data || {},
            android: {
              priority: 'high',
              notification: {
                sound: payload.sound || 'default',
                channelId: payload.channelId || 'default',
                imageUrl: 'https://example.com/icon.png',
              },
            },
            apns: {
              payload: {
                aps: {
                  alert: {
                    title: payload.title,
                    body: payload.body,
                  },
                  sound: payload.sound || 'default',
                  badge: parseInt(payload.badge || '1'),
                  'mutable-content': 1,
                },
              },
            },
            token: device.token,
          };

          const messageId = await this.messaging.send(message);

          // Log successful send
          const log = await this.prisma.notificationLog.create({
            data: {
              userId,
              deviceTokenId: device.id,
              title: payload.title,
              body: payload.body,
              type: notificationType,
              status: 'sent',
            },
          });

          logs.push(this.mapNotificationLog(log));
          console.log(`Notification sent to ${device.platform}: ${messageId}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error sending to device ${device.deviceId}:`, error);

          // Check if token is invalid (uninstalled app, etc.)
          if (
            errorMessage.includes('registration token is invalid') ||
            errorMessage.includes('not registered')
          ) {
            await this.prisma.deviceToken.update({
              where: { id: device.id },
              data: { isActive: false },
            });
          }

          // Log failed send
          const log = await this.prisma.notificationLog.create({
            data: {
              userId,
              deviceTokenId: device.id,
              title: payload.title,
              body: payload.body,
              type: notificationType,
              status: 'failed',
              failureReason: errorMessage,
            },
          });

          logs.push(this.mapNotificationLog(log));
        }
      }

      return logs;
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  /**
   * Private helper: Map device token
   */
  private mapDeviceToken(token: any): DeviceToken {
    return {
      id: token.id,
      userId: token.userId,
      token: token.token,
      deviceId: token.deviceId,
      platform: token.platform,
      isActive: token.isActive,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt,
    };
  }

  /**
   * Private helper: Map notification log
   */
  private mapNotificationLog(log: any): NotificationLog {
    return {
      id: log.id,
      userId: log.userId,
      deviceToken: log.deviceTokenId || undefined,
      title: log.title,
      body: log.body,
      type: log.type,
      status: log.status as 'sent' | 'failed',
      failureReason: log.failureReason || undefined,
      createdAt: log.createdAt,
    };
  }

  /**
   * Private helper: Get emoji for status
   */
  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      submitted: '📤',
      under_review: '🔍',
      approved: '✅',
      rejected: '❌',
      on_hold: '⏸️',
      processing: '⚙️',
    };

    return emojiMap[status.toLowerCase()] || '📋';
  }
}