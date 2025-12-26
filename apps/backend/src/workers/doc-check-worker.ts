import { DocCheckQueueService } from '../services/doc-check-queue.service';
import { logInfo } from '../middleware/logger';

logInfo('[DocCheckWorker] Starting doc-check worker', {
  redis: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

DocCheckQueueService.initialize();

