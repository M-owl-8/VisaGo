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

    // Group by generationMode
    const byModeGroups = await prisma.documentChecklist.groupBy({
      by: ['generationMode'],
      where,
      _count: { _all: true },
    });
    const byModeReady = await prisma.documentChecklist.groupBy({
      by: ['generationMode'],
      where: { ...where, status: 'ready' },
      _count: { _all: true },
      _avg: { createdAt: true, generatedAt: true }, // not useful directly; compute separately if needed
    });
    const byModeFailed = await prisma.documentChecklist.groupBy({
      by: ['generationMode'],
      where: { ...where, status: 'failed' },
      _count: { _all: true },
    });
    const byModeProcessing = await prisma.documentChecklist.groupBy({
      by: ['generationMode'],
      where: { ...where, status: 'processing' },
      _count: { _all: true },
    });

    const readyMap = new Map<string | null, number>(
      byModeReady.map((m) => [m.generationMode, m._count._all])
    );
    const failedMap = new Map<string | null, number>(
      byModeFailed.map((m) => [m.generationMode, m._count._all])
    );
    const processingMap = new Map<string | null, number>(
      byModeProcessing.map((m) => [m.generationMode, m._count._all])
    );

    // Approximate avg time per mode (using a small sample)
    const byModeTime: Map<string | null, number | null> = new Map();
    for (const modeEntry of byModeGroups) {
      const mode = modeEntry.generationMode;
      const rows = await prisma.documentChecklist.findMany({
        where: { ...where, generationMode: mode, status: 'ready', generatedAt: { not: null } },
        select: { createdAt: true, generatedAt: true },
        take: 200,
      });
      const avg =
        rows.length > 0
          ? Math.round(
              rows.reduce((acc, r) => {
                const start = new Date(r.createdAt).getTime();
                const end = r.generatedAt ? new Date(r.generatedAt).getTime() : start;
                return acc + Math.max(0, end - start);
              }, 0) / rows.length
            )
          : null;
      byModeTime.set(mode, avg);
    }

    const byMode = byModeGroups.map((g) => {
      const mode = g.generationMode;
      const count = g._count._all;
      const r = readyMap.get(mode) || 0;
      const f = failedMap.get(mode) || 0;
      const p = processingMap.get(mode) || 0;
      const sr = count > 0 ? Number(((r / count) * 100).toFixed(2)) : 0;
      return {
        generationMode: mode,
        count,
        ready: r,
        failed: f,
        processing: p,
        successRate: sr,
        avgTimeToReadyMs: byModeTime.get(mode) ?? null,
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

