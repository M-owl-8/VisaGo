'use client';

import { useEffect, useState } from 'react';
import { adminApi, AIInteraction } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminAIInteractionsPage() {
  const [interactions, setInteractions] = useState<AIInteraction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({
    taskType: '',
    model: '',
    success: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    loadInteractions();
  }, [page, filters]);

  const loadInteractions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAIInteractions({
        page,
        pageSize,
        ...(filters.taskType && { taskType: filters.taskType }),
        ...(filters.model && { model: filters.model }),
        ...(filters.success && { success: filters.success === 'true' }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });
      setInteractions(response.items);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI interactions');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Interactions</h1>
        <p className="text-white/60 mt-1">View AI/GPT interaction logs</p>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Task Type"
            value={filters.taskType}
            onChange={(e) => setFilters({ ...filters, taskType: e.target.value })}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
          />
          <input
            type="text"
            placeholder="Model"
            value={filters.model}
            onChange={(e) => setFilters({ ...filters, model: e.target.value })}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
          />
          <select
            value={filters.success}
            onChange={(e) => setFilters({ ...filters, success: e.target.value })}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
          >
            <option value="">All</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
          <input
            type="date"
            placeholder="From Date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
          />
          <input
            type="date"
            placeholder="To Date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <p>{error}</p>
        </div>
      )}

      <Card className="bg-white/5 border-white/10">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Date</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Task</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Model</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Country</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">User</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Success</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Latency</th>
                </tr>
              </thead>
              <tbody>
                {interactions.map((interaction) => (
                  <tr key={interaction.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white/60 text-sm">
                      {new Date(interaction.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-white">{interaction.taskType}</td>
                    <td className="p-4 text-white/80">{interaction.model}</td>
                    <td className="p-4 text-white/80">{interaction.countryCode || 'N/A'}</td>
                    <td className="p-4 text-white/80 text-sm">{interaction.userId || 'N/A'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          interaction.success
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {interaction.success ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-white/80">
                      {interaction.latencyMs ? `${interaction.latencyMs}ms` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <p className="text-sm text-white/60">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

