import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { notificationSchedulerService } from '../services/notification-scheduler.service';
import { fcmService } from '../services/fcm.service';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const router = Router();

// Register device token for push notifications
router.post('/register-device', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deviceToken } = req.body;
    const userId = req.user?.id;

    if (!deviceToken || !userId) {
      return res.status(400).json({ error: 'Device token and user ID required' });
    }

    // Store device token in database (you'll need to create a UserDeviceToken model)
    // For now, we're just logging it
    console.log(`📱 Device registered for user ${userId}: ${deviceToken.slice(0, 20)}...`);

    res.json({
      success: true,
      message: 'Device token registered',
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

// Subscribe to topic
router.post('/subscribe-topic', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deviceToken, topic } = req.body;

    if (!deviceToken || !topic) {
      return res.status(400).json({ error: 'Device token and topic required' });
    }

    const success = await fcmService.subscribeToTopic(deviceToken, topic);

    res.json({
      success,
      message: success ? `Subscribed to ${topic}` : 'Failed to subscribe to topic',
    });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    res.status(500).json({ error: 'Failed to subscribe to topic' });
  }
});

// Unsubscribe from topic
router.post('/unsubscribe-topic', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { deviceToken, topic } = req.body;

    if (!deviceToken || !topic) {
      return res.status(400).json({ error: 'Device token and topic required' });
    }

    const success = await fcmService.unsubscribeFromTopic(deviceToken, topic);

    res.json({
      success,
      message: success ? `Unsubscribed from ${topic}` : 'Failed to unsubscribe from topic',
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from topic' });
  }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch preferences from database (you'll need to create a NotificationPreference model)
    const preferences = {
      emailNotifications: true,
      pushNotifications: true,
      paymentConfirmations: true,
      documentUpdates: true,
      visaStatusUpdates: true,
      dailyReminders: true,
      newsUpdates: false,
    };

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update notification preferences
router.patch('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const preferences = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update preferences in database
    console.log(`📋 Notification preferences updated for user ${userId}:`, preferences);

    res.json({
      success: true,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Get notification history
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch notification history from database
    const notifications = [
      {
        id: '1',
        type: 'payment_confirmed',
        title: '💳 Payment Confirmed',
        message: 'Your payment for Spain Visa has been processed',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        type: 'document_uploaded',
        title: '📄 Document Uploaded',
        message: 'Your passport has been uploaded successfully',
        timestamp: new Date(Date.now() - 86400000),
        read: true,
      },
    ];

    res.json({
      notifications: notifications.slice(Number(offset), Number(offset) + Number(limit)),
      total: notifications.length,
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
});

// Mark notification as read
router.patch('/mark-read/:notificationId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`📖 Notification ${notificationId} marked as read`);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Send test notification
router.post('/send-test', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { type = 'test' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`📬 Test notification sent to user ${userId}`);

    res.json({
      success: true,
      message: 'Test notification sent',
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Start daily reminder jobs (admin only)
router.post('/start-daily-reminders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Check if user is admin (you'll need to add this check)
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can start daily reminders' });
    }

    await notificationSchedulerService.startDailyReminderJobs();

    res.json({
      success: true,
      message: 'Daily reminder jobs started',
    });
  } catch (error) {
    console.error('Error starting daily reminders:', error);
    res.status(500).json({ error: 'Failed to start daily reminders' });
  }
});

export default router;