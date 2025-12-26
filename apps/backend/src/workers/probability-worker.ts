import { ProbabilityQueueService } from '../services/probability-queue.service';
import { logInfo } from '../middleware/logger';

logInfo('[ProbabilityWorker] Starting probability worker', {
  redis: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

ProbabilityQueueService.initialize();

