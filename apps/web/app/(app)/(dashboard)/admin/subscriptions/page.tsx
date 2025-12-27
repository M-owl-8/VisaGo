'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

type AdminSubscription = {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  user?: { email: string; firstName?: string | null; lastName?: string | null; subscriptionStatus?: string | null };
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await adminApi.getSubscriptions({ skip: page * pageSize, take: pageSize });
      setSubs(resp.data);
      setTotal(resp.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (userId: string) => {
    setError(null);
    try {
      await adminApi.cancelSubscription(userId);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    }
  };

  const handleGrandfather = async (userId: string) => {
    setError(null);
    try {
      await adminApi.grandfatherSubscription(userId);
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to grandfather user');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-white/60 mt-1">Manage user subscription status</p>
      </div>

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
                  <th className="text-left p-4 text-sm font-semibold text-white/80">User</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Period End</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Stripe Sub ID</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white/80">
                      {sub.user?.email || sub.userId}
                      <div className="text-xs text-white/40">{sub.user?.subscriptionStatus}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          sub.status === 'active'
                            ? 'bg-green-500/20 text-green-300'
                            : sub.status === 'canceled'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                      {sub.cancelAtPeriodEnd && (
                        <div className="text-xs text-white/50">Canceling at period end</div>
                      )}
                    </td>
                    <td className="p-4 text-white/80">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="p-4 text-white/60 text-xs">{sub.stripeSubscriptionId}</td>
                    <td className="p-4 flex gap-2">
                      <Button
                        size="sm"
                        className="bg-red-500/20 text-red-200 hover:bg-red-500/30"
                        onClick={() => handleCancel(sub.userId)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-white/10 text-white hover:bg-white/20"
                        onClick={() => handleGrandfather(sub.userId)}
                      >
                        Grandfather
                      </Button>
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
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} subscriptions
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
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

