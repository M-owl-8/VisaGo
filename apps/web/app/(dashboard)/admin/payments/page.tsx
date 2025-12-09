'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, PaymentData } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getPayments({ skip: page * pageSize, take: pageSize });
      setPayments(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-white/60 mt-1">View payment transactions</p>
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
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Amount</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Currency</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Method</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Country</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white/80">{payment.userEmail}</td>
                    <td className="p-4 text-white font-semibold">${payment.amount.toFixed(2)}</td>
                    <td className="p-4 text-white/80">{payment.currency}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          payment.status === 'completed'
                            ? 'bg-green-500/20 text-green-300'
                            : payment.status === 'failed'
                            ? 'bg-red-500/20 text-red-300'
                            : payment.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/80">{payment.paymentMethod}</td>
                    <td className="p-4 text-white/80">{payment.countryName}</td>
                    <td className="p-4 text-white/60 text-sm">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString()
                        : new Date(payment.createdAt).toLocaleDateString()}
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
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} payments
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

