import { db as prisma } from '../db';
import { logWarn } from '../middleware/logger';

export interface AISummaryInput {
  windowHours?: number; // default 24h
}

export interface AISummary {
  windowHours: number;
  from: string;
  to: string;
  totals: {
    interactions: number;
    successes: number;
    failures: number;
    successRate: number;
    avgLatencyMs: number | null;
  };
  byModel: Array<{
    model: string;
    count: number;
    successes: number;
    failures: number;
    successRate: number;
    avgLatencyMs: number | null;
  }>;
  byTask: Array<{
    taskType: string;
    count: number;
    successes: number;
    failures: number;
    successRate: number;
    avgLatencyMs: number | null;
  }>;
}

export class AIAnalyticsService {
  static async getSummary(input: AISummaryInput = {}): Promise<AISummary> {
    const windowHours = input.windowHours && input.windowHours > 0 ? input.windowHours : 24;
    const to = new Date();
    const from = new Date(to.getTime() - windowHours * 60 * 60 * 1000);

    // Base filter
    const where = {
      createdAt: {
        gte: from,
        lte: to,
      },
    };

    // Totals
    const [countAll, countSuccess, avgLatency] = await Promise.all([
      prisma.aIInteraction.count({ where }),
      prisma.aIInteraction.count({ where: { ...where, success: true } }),
      prisma.aIInteraction.aggregate({
        where,
        _avg: { latencyMs: true },
      }),
    ]);

    const failures = Math.max(0, countAll - countSuccess);
    const successRate = countAll > 0 ? Number(((countSuccess / countAll) * 100).toFixed(2)) : 0;

    // Group by model
    let byModel: AISummary['byModel'] = [];
    try {
      const modelGroups = await prisma.aIInteraction.groupBy({
        by: ['model'],
        where,
        _count: { _all: true },
        _avg: { latencyMs: true },
      });
      const modelSuccesses = await prisma.aIInteraction.groupBy({
        by: ['model'],
        where: { ...where, success: true },
        _count: { _all: true },
      });
      const successMap = new Map<string, number>(
        modelSuccesses.map((m) => [m.model || 'unknown', m._count._all])
      );
      byModel = modelGroups.map((m) => {
        const model = m.model || 'unknown';
        const count = m._count._all;
        const successes = successMap.get(model) || 0;
        const failuresModel = Math.max(0, count - successes);
        const sr = count > 0 ? Number(((successes / count) * 100).toFixed(2)) : 0;
        return {
          model,
          count,
          successes,
          failures: failuresModel,
          successRate: sr,
          avgLatencyMs: m._avg.latencyMs,
        };
      });
    } catch (err) {
      logWarn('[AIAnalytics] Failed to group by model', { message: (err as Error)?.message });
    }

    // Group by taskType
    let byTask: AISummary['byTask'] = [];
    try {
      const taskGroups = await prisma.aIInteraction.groupBy({
        by: ['taskType'],
        where,
        _count: { _all: true },
        _avg: { latencyMs: true },
      });
      const taskSuccesses = await prisma.aIInteraction.groupBy({
        by: ['taskType'],
        where: { ...where, success: true },
        _count: { _all: true },
      });
      const successMap = new Map<string, number>(
        taskSuccesses.map((t) => [t.taskType || 'unknown', t._count._all])
      );
      byTask = taskGroups.map((t) => {
        const taskType = t.taskType || 'unknown';
        const count = t._count._all;
        const successes = successMap.get(taskType) || 0;
        const failuresTask = Math.max(0, count - successes);
        const sr = count > 0 ? Number(((successes / count) * 100).toFixed(2)) : 0;
        return {
          taskType,
          count,
          successes,
          failures: failuresTask,
          successRate: sr,
          avgLatencyMs: t._avg.latencyMs,
        };
      });
    } catch (err) {
      logWarn('[AIAnalytics] Failed to group by taskType', { message: (err as Error)?.message });
    }

    return {
      windowHours,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        interactions: countAll,
        successes: countSuccess,
        failures,
        successRate,
        avgLatencyMs: avgLatency._avg.latencyMs ?? null,
      },
      byModel,
      byTask,
    };
  }
}

