'use client';

import { useEffect, useState } from 'react';
import { adminApi, DashboardMetrics } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getDashboard();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
        <p className="font-semibold">Error loading dashboard</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/60 mt-1">System overview and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <p className="text-sm text-white/60 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-white">{metrics.totalUsers.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <p className="text-sm text-white/60 mb-1">Total Applications</p>
            <p className="text-3xl font-bold text-white">{metrics.totalApplications.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <p className="text-sm text-white/60 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-white">${metrics.totalRevenue.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <p className="text-sm text-white/60 mb-1">Verified Documents</p>
            <p className="text-3xl font-bold text-white">{metrics.totalDocumentsVerified.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      {/* Application Status Breakdown */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Application Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-white/60">Draft</p>
              <p className="text-xl font-semibold text-white">{metrics.applicationsBreakdown.draft}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Submitted</p>
              <p className="text-xl font-semibold text-white">{metrics.applicationsBreakdown.submitted}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Approved</p>
              <p className="text-xl font-semibold text-green-400">{metrics.applicationsBreakdown.approved}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Rejected</p>
              <p className="text-xl font-semibold text-red-400">{metrics.applicationsBreakdown.rejected}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Expired</p>
              <p className="text-xl font-semibold text-yellow-400">{metrics.applicationsBreakdown.expired}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Status Breakdown */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Payment Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-white/60">Pending</p>
              <p className="text-xl font-semibold text-yellow-400">{metrics.paymentBreakdown.pending}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Completed</p>
              <p className="text-xl font-semibold text-green-400">{metrics.paymentBreakdown.completed}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Failed</p>
              <p className="text-xl font-semibold text-red-400">{metrics.paymentBreakdown.failed}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Refunded</p>
              <p className="text-xl font-semibold text-purple-400">{metrics.paymentBreakdown.refunded}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Document Statistics */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Document Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-white/60">Pending Verification</p>
              <p className="text-xl font-semibold text-yellow-400">{metrics.documentStats.pendingVerification}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Verification Rate</p>
              <p className="text-xl font-semibold text-white">{metrics.documentStats.verificationRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Avg Upload Time</p>
              <p className="text-xl font-semibold text-white">{metrics.documentStats.averageUploadTime.toFixed(1)}s</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Countries by Revenue */}
      {metrics.revenueByCountry.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Top Countries by Revenue</h2>
            <div className="space-y-2">
              {metrics.revenueByCountry.slice(0, 10).map((country, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <div>
                    <p className="text-white font-medium">{country.country}</p>
                    <p className="text-sm text-white/60">{country.applicationCount} applications</p>
                  </div>
                  <p className="text-white font-semibold">${country.revenue.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

