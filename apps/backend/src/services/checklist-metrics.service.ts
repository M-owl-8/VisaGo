import { db as prisma } from '../db';

export interface ChecklistMetricsInput {
  windowHours?: number; // default 24h
}

export interface ChecklistMetrics {
  windowHours: number;
  from: string;
  to: string;
  totals: {
    checklists: number;
    ready: number;
    failed: number;
    processing: number;
    successRate: number;
    avgTimeToReadyMs: number | null;
  };
  byMode: Array<{
    generationMode: string | null;
    count: number;
    ready: number;
    failed: number;
    processing: number;
    successRate: number;
    avgTimeToReadyMs: number | null;
  }>;
}

export class ChecklistMetricsService {
  static async getSummary(input: ChecklistMetricsInput = {}): Promise<ChecklistMetrics> {
    const windowHours = input.windowHours && input.windowHours > 0 ? input.windowHours : 24;
    const to = new Date();
    const from = new Date(to.getTime() - windowHours * 60 * 60 * 1000);
    const where = {
      createdAt: {
        gte: from,
        lte: to,
      },
    };

    const [all, ready, failed, processing, readyRows] = await Promise.all([
      prisma.documentChecklist.count({ where }),
      prisma.documentChecklist.count({ where: { ...where, status: 'ready' } }),
      prisma.documentChecklist.count({ where: { ...where, status: 'failed' } }),
      prisma.documentChecklist.count({ where: { ...where, status: 'processing' } }),
      prisma.documentChecklist.findMany({
        where: { ...where, status: 'ready', generatedAt: { not: null } },
        select: { createdAt: true, generatedAt: true },
        take: 500, // cap for perf
      }),
    ]);

    const successRate = all > 0 ? Number(((ready / all) * 100).toFixed(2)) : 0;
    const avgTimeToReadyMs =
      readyRows.length > 0
        ? Math.round(
            readyRows.reduce((acc, r) => {
              const start = new Date(r.createdAt).getTime();
              const end = r.generatedAt ? new Date(r.generatedAt).getTime() : start;
              return acc + Math.max(0, end - start);
            }, 0) / readyRows.length
          )
        : null;

    // Group by generationMode - fetch all checklists and parse JSON to extract generationMode
    const allChecklists = await prisma.documentChecklist.findMany({
      where,
      select: {
        id: true,
        status: true,
        checklistData: true,
        createdAt: true,
        generatedAt: true,
      },
    });

    // Parse generationMode from checklistData JSON
    const modeMap = new Map<
      string | null,
      { count: number; ready: number; failed: number; processing: number; times: number[] }
    >();
    for (const checklist of allChecklists) {
      let generationMode: string | null = null;
      try {
        if (checklist.checklistData) {
          const data = JSON.parse(checklist.checklistData);
          generationMode = data.generationMode || null;
        }
      } catch {
        // Ignore parse errors
      }

      const key = generationMode || 'unknown';
      if (!modeMap.has(key)) {
        modeMap.set(key, { count: 0, ready: 0, failed: 0, processing: 0, times: [] });
      }
      const stats = modeMap.get(key)!;
      stats.count++;
      if (checklist.status === 'ready') stats.ready++;
      else if (checklist.status === 'failed') stats.failed++;
      else if (checklist.status === 'processing') stats.processing++;

      // Track time for ready checklists
      if (checklist.status === 'ready' && checklist.generatedAt) {
        const start = new Date(checklist.createdAt).getTime();
        const end = new Date(checklist.generatedAt).getTime();
        stats.times.push(Math.max(0, end - start));
      }
    }

    const byMode = Array.from(modeMap.entries()).map(([mode, stats]) => {
      const avgTime =
        stats.times.length > 0
          ? Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length)
          : null;
      return {
        generationMode: mode === 'unknown' ? null : mode,
        count: stats.count,
        ready: stats.ready,
        failed: stats.failed,
        processing: stats.processing,
        successRate: stats.count > 0 ? Number(((stats.ready / stats.count) * 100).toFixed(2)) : 0,
        avgTimeToReadyMs: avgTime,
      };
    });

    return {
      windowHours,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        checklists: all,
        ready,
        failed,
        processing,
        successRate,
        avgTimeToReadyMs,
      },
      byMode,
    };
  }
}
