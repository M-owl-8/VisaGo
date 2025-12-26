import { ChecklistQueueService } from '../services/checklist-queue.service';
import { logInfo } from '../middleware/logger';

logInfo('[ChecklistWorker] Starting checklist generation worker', {
  redis: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

ChecklistQueueService.initialize();

