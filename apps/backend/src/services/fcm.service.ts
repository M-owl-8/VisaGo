import * as admin from 'firebase-admin';

export interface PushNotificationPayload {
  userId?: string;
  deviceToken?: string; // Direct send to specific device
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export class FCMService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
      this.initialized = true;
      console.log('✅ Firebase Cloud Messaging service initialized');
    } catch (error) {
      console.warn('⚠️ FCM initialization failed:', error);
      console.warn('Push notifications will be disabled.');
    }
  }

  async sendToDevice(
    deviceToken: string,
    payload: Omit<PushNotificationPayload, 'userId' | 'deviceToken'>,
  ): Promise<boolean> {
    if (!this.initialized) {
      console.warn('⚠️ FCM not initialized, skipping push notification');
      return false;
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: payload.sound || 'default',
            channelId: 'default',
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: 'https://visabuddy.com/icon.png',
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
              badge: payload.badge || 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message as any);
      console.log(`📱 Push notification sent to device: ${deviceToken.slice(0, 20)}...`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send push notification to device:`, error);
      return false;
    }
  }

  async sendToTopic(
    topic: string,
    payload: Omit<PushNotificationPayload, 'userId' | 'deviceToken'>,
  ): Promise<boolean> {
    if (!this.initialized) {
      console.warn('⚠️ FCM not initialized, skipping push notification');
      return false;
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        topic,
      };

      const response = await admin.messaging().send(message as any);
      console.log(`📱 Push notification sent to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send notification to topic ${topic}:`, error);
      return false;
    }
  }

  async subscribeToTopic(deviceToken: string, topic: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      await admin.messaging().subscribeToTopic([deviceToken], topic);
      console.log(`📱 Device subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to subscribe device to topic:`, error);
      return false;
    }
  }

  async unsubscribeFromTopic(deviceToken: string, topic: string): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      await admin.messaging().unsubscribeFromTopic([deviceToken], topic);
      console.log(`📱 Device unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to unsubscribe device from topic:`, error);
      return false;
    }
  }

  // Pre-built notification templates

  static paymentConfirmationNotification(country: string, visaType: string): PushNotificationPayload {
    return {
      title: '💳 Payment Confirmed',
      body: `Your payment for ${country} ${visaType} visa has been processed`,
      data: {
        type: 'payment_confirmed',
        action: 'open_dashboard',
      },
      sound: 'default',
    };
  }

  static documentUploadedNotification(documentType: string): PushNotificationPayload {
    return {
      title: '📄 Document Uploaded',
      body: `Your ${documentType} has been uploaded successfully`,
      data: {
        type: 'document_uploaded',
        action: 'view_documents',
      },
      sound: 'default',
    };
  }

  static documentVerifiedNotification(
    documentType: string,
    status: 'verified' | 'rejected',
  ): PushNotificationPayload {
    const title = status === 'verified' ? '✅ Document Verified' : '❌ Document Rejected';
    const body =
      status === 'verified'
        ? `Your ${documentType} has been verified`
        : `Your ${documentType} needs to be resubmitted`;

    return {
      title,
      body,
      data: {
        type: 'document_status',
        status,
        action: 'view_documents',
      },
      sound: 'default',
    };
  }

  static visaStatusUpdateNotification(country: string, status: string): PushNotificationPayload {
    return {
      title: '📋 Visa Application Update',
      body: `Your ${country} visa application: ${status}`,
      data: {
        type: 'visa_status_update',
        status,
        action: 'view_application',
      },
      sound: 'default',
      badge: 1,
    };
  }

  static missingDocumentsReminderNotification(country: string): PushNotificationPayload {
    return {
      title: '📋 Upload Documents',
      body: `Complete your ${country} visa application by uploading missing documents`,
      data: {
        type: 'missing_documents',
        action: 'upload_documents',
      },
      sound: 'default',
    };
  }

  static deadlineApproachingNotification(country: string, daysLeft: number): PushNotificationPayload {
    return {
      title: '⏰ Deadline Approaching',
      body: `${daysLeft} days left to submit your ${country} visa application`,
      data: {
        type: 'deadline_approaching',
        daysLeft: daysLeft.toString(),
        action: 'view_application',
      },
      sound: 'default',
      badge: 1,
    };
  }

  static newsUpdateNotification(title: string, summary: string): PushNotificationPayload {
    return {
      title: `📰 ${title}`,
      body: summary,
      data: {
        type: 'news_update',
        action: 'read_news',
      },
      sound: 'default',
    };
  }
}

export const fcmService = new FCMService();