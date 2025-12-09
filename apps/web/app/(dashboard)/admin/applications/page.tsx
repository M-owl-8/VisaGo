'use client';

import { useEffect, useState } from 'react';
import { adminApi, ApplicationData } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);

  useEffect(() => {
    loadApplications();
  }, [page]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getApplications({ skip: page * pageSize, take: pageSize });
      setApplications(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Applications</h1>
        <p className="text-white/60 mt-1">View and manage visa applications</p>
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
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Applicant</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Country</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Visa Type</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Progress</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Documents</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Created</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white">{app.userName}</td>
                    <td className="p-4 text-white/80">{app.countryName}</td>
                    <td className="p-4 text-white/80">{app.visaTypeName}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          app.status === 'approved'
                            ? 'bg-green-500/20 text-green-300'
                            : app.status === 'rejected'
                            ? 'bg-red-500/20 text-red-300'
                            : app.status === 'submitted'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/80">{app.progressPercentage}%</td>
                    <td className="p-4 text-white/80">
                      {app.verifiedDocuments}/{app.documentCount}
                    </td>
                    <td className="p-4 text-white/60 text-sm">
                      {new Date(app.createdAt).toLocaleDateString()}
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
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} applications
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

