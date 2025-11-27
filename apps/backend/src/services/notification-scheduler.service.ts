import Queue from 'bull';
import { db } from '../db';
import { emailService, EmailService } from './email.service';
import { fcmService, FCMService } from './fcm.service';

export class NotificationSchedulerService {
  private paymentConfirmationQueue: Queue.Queue;
  private documentVerificationQueue: Queue.Queue;
  private missingDocumentsReminderQueue: Queue.Queue;
  private visaStatusUpdateQueue: Queue.Queue;
  private deadlineReminderQueue: Queue.Queue;
  private newsUpdateQueue: Queue.Queue;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    this.paymentConfirmationQueue = new Queue('payment-confirmation', redisUrl);
    this.documentVerificationQueue = new Queue('document-verification', redisUrl);
    this.missingDocumentsReminderQueue = new Queue('missing-documents-reminder', redisUrl);
    this.visaStatusUpdateQueue = new Queue('visa-status-update', redisUrl);
    this.deadlineReminderQueue = new Queue('deadline-reminder', redisUrl);
    this.newsUpdateQueue = new Queue('news-update', redisUrl);

    this.setupProcessors();
    console.log('✅ Notification Scheduler Service initialized');
  }

  private setupProcessors(): void {
    // Payment Confirmation Processor
    this.paymentConfirmationQueue.process(async (job) => {
      const { userId, transactionId, amount, currency, country, visaType } = job.data;

      try {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Send email
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        const emailPayload = EmailService.paymentConfirmationEmail(userName, user.email, {
          amount,
          currency,
          transactionId,
          country,
          visaType,
        });
        await emailService.send(emailPayload);

        // Send push notification
        const deviceToken = await this.getUserDeviceToken(userId);
        if (deviceToken) {
          await fcmService.sendToDevice(
            deviceToken,
            FCMService.paymentConfirmationNotification(country, visaType)
          );
        }

        console.log(`✅ Payment confirmation notification sent to ${user.email}`);
      } catch (error) {
        console.error('❌ Payment confirmation notification failed:', error);
        throw error;
      }
    });

    // Document Verification Processor
    this.documentVerificationQueue.process(async (job) => {
      const { userId, documentId, documentType, country, status } = job.data;

      try {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Send email
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        const emailPayload = EmailService.documentVerifiedEmail(userName, user.email, {
          documentType,
          applicationId: job.data.applicationId,
          country,
          status,
        });
        await emailService.send(emailPayload);

        // Send push notification
        const deviceToken = await this.getUserDeviceToken(userId);
        if (deviceToken) {
          await fcmService.sendToDevice(
            deviceToken,
            FCMService.documentVerifiedNotification(documentType, status)
          );
        }

        console.log(`✅ Document verification notification sent to ${user.email}`);
      } catch (error) {
        console.error('❌ Document verification notification failed:', error);
        throw error;
      }
    });

    // Missing Documents Reminder Processor
    this.missingDocumentsReminderQueue.process(async (job) => {
      const { userId, applicationId, country, missingDocuments } = job.data;

      try {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Send email
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        const emailPayload = EmailService.missingDocumentsReminderEmail(userName, user.email, {
          applicationId,
          country,
          missingDocuments,
        });
        await emailService.send(emailPayload);

        // Send push notification
        const deviceToken = await this.getUserDeviceToken(userId);
        if (deviceToken) {
          await fcmService.sendToDevice(
            deviceToken,
            FCMService.missingDocumentsReminderNotification(country)
          );
        }

        console.log(`✅ Missing documents reminder sent to ${user.email}`);
      } catch (error) {
        console.error('❌ Missing documents reminder failed:', error);
        throw error;
      }
    });

    // Visa Status Update Processor
    this.visaStatusUpdateQueue.process(async (job) => {
      const { userId, applicationId, country, visaType, status } = job.data;

      try {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Send email
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        const emailPayload = EmailService.visaStatusUpdateEmail(userName, user.email, {
          country,
          visaType,
          status,
          applicationId,
        });
        await emailService.send(emailPayload);

        // Send push notification
        const deviceToken = await this.getUserDeviceToken(userId);
        if (deviceToken) {
          await fcmService.sendToDevice(
            deviceToken,
            FCMService.visaStatusUpdateNotification(country, status)
          );
        }

        console.log(`✅ Visa status update notification sent to ${user.email}`);
      } catch (error) {
        console.error('❌ Visa status update notification failed:', error);
        throw error;
      }
    });

    // Deadline Reminder Processor
    this.deadlineReminderQueue.process(async (job) => {
      const { userId, applicationId, country, daysLeft } = job.data;

      try {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Send push notification
        const deviceToken = await this.getUserDeviceToken(userId);
        if (deviceToken) {
          await fcmService.sendToDevice(
            deviceToken,
            FCMService.deadlineApproachingNotification(country, daysLeft)
          );
        }

        console.log(`✅ Deadline reminder sent to ${user.email}`);
      } catch (error) {
        console.error('❌ Deadline reminder failed:', error);
        throw error;
      }
    });

    // News Update Processor
    this.newsUpdateQueue.process(async (job) => {
      const { title, summary } = job.data;

      try {
        // Send to all users via FCM topic
        await fcmService.sendToTopic(
          'visa_news',
          FCMService.newsUpdateNotification(title, summary)
        );

        console.log(`✅ News update broadcast sent`);
      } catch (error) {
        console.error('❌ News update broadcast failed:', error);
        throw error;
      }
    });

    // Queue event handlers
    this.setupQueueEventHandlers();
  }

  private setupQueueEventHandlers(): void {
    const queues = [
      this.paymentConfirmationQueue,
      this.documentVerificationQueue,
      this.missingDocumentsReminderQueue,
      this.visaStatusUpdateQueue,
      this.deadlineReminderQueue,
      this.newsUpdateQueue,
    ];

    queues.forEach((queue) => {
      queue.on('failed', (job, error) => {
        console.error(`❌ Job failed (${job.name}): ${error.message}`);
      });

      queue.on('completed', (job) => {
        console.log(`✅ Job completed (${job.name})`);
      });
    });
  }

  // Queue methods

  async schedulePaymentConfirmation(data: {
    userId: string;
    transactionId: string;
    amount: number;
    currency: string;
    country: string;
    visaType: string;
  }): Promise<void> {
    await this.paymentConfirmationQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    });
  }

  async scheduleDocumentVerification(data: {
    userId: string;
    documentId: string;
    documentType: string;
    applicationId: string;
    country: string;
    status: 'verified' | 'rejected';
  }): Promise<void> {
    await this.documentVerificationQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    });
  }

  async scheduleMissingDocumentsReminder(data: {
    userId: string;
    applicationId: string;
    country: string;
    missingDocuments: string[];
  }): Promise<void> {
    await this.missingDocumentsReminderQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    });
  }

  async scheduleVisaStatusUpdate(data: {
    userId: string;
    applicationId: string;
    country: string;
    visaType: string;
    status: 'approved' | 'rejected' | 'pending_review';
  }): Promise<void> {
    await this.visaStatusUpdateQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    });
  }

  async scheduleDeadlineReminder(data: {
    userId: string;
    applicationId: string;
    country: string;
    daysLeft: number;
  }): Promise<void> {
    // Schedule for 9 AM every day
    await this.deadlineReminderQueue.add(data, {
      repeat: {
        cron: '0 9 * * *', // 9 AM every day
      },
    });
  }

  async broadcastNewsUpdate(data: { title: string; summary: string }): Promise<void> {
    await this.newsUpdateQueue.add(data, {
      removeOnComplete: true,
    });
  }

  // Recurring jobs

  async startDailyReminderJobs(): Promise<void> {
    console.log('🔄 Starting daily reminder jobs...');

    try {
      // Get all applications with missing documents
      const applicationsWithMissingDocs = await db.visaApplication.findMany({
        where: {
          status: 'pending',
        },
        include: {
          user: true,
          country: true,
          visaType: true,
        },
      });

      for (const app of applicationsWithMissingDocs) {
        const missingDocs = await this.getMissingDocuments(app.id);
        if (missingDocs.length > 0) {
          await this.scheduleMissingDocumentsReminder({
            userId: app.userId,
            applicationId: app.id,
            country: app.country.name,
            missingDocuments: missingDocs,
          });
        }
      }

      console.log('✅ Daily reminder jobs started');
    } catch (error) {
      console.error('❌ Failed to start daily reminder jobs:', error);
    }
  }

  // Helper methods

  private async getUserDeviceToken(userId: string): Promise<string | null> {
    try {
      // This should be fetched from a UserDeviceToken table
      // For now, returning null - you'll need to implement this
      return null;
    } catch (error) {
      console.error('Failed to get device token:', error);
      return null;
    }
  }

  private async getMissingDocuments(applicationId: string): Promise<string[]> {
    try {
      const app = await db.visaApplication.findUnique({
        where: { id: applicationId },
        include: {
          documents: true,
          visaType: {
            select: {
              documentTypes: true,
            },
          },
        },
      });

      if (!app) return [];

      let requiredDocs: string[] = [];
      try {
        requiredDocs = JSON.parse(app.visaType?.documentTypes || '[]');
      } catch {
        requiredDocs = [];
      }

      const uploadedDocs = app.documents.map((d: any) => d.documentType);
      const missing = requiredDocs.filter((doc) => !uploadedDocs.includes(doc));

      return missing;
    } catch (error) {
      console.error('Failed to get missing documents:', error);
      return [];
    }
  }

  async closeQueues(): Promise<void> {
    await Promise.all([
      this.paymentConfirmationQueue.close(),
      this.documentVerificationQueue.close(),
      this.missingDocumentsReminderQueue.close(),
      this.visaStatusUpdateQueue.close(),
      this.deadlineReminderQueue.close(),
      this.newsUpdateQueue.close(),
    ]);
    console.log('✅ Notification queues closed');
  }
}

export const notificationSchedulerService = new NotificationSchedulerService();
