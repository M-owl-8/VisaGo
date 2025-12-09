'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [acquisition, setAcquisition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsData, metricsData, funnelData, acqData] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getAnalyticsMetrics(30),
        adminApi.getConversionFunnel(),
        adminApi.getUserAcquisition(),
      ]);
      setAnalytics(analyticsData);
      setMetrics(metricsData);
      setFunnel(funnelData);
      setAcquisition(acqData);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-white/60 mt-1">System analytics and metrics</p>
      </div>

      {metrics && (
        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Metrics (Last 30 Days)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics).map(([key, value]: [string, any]) => (
                <div key={key}>
                  <p className="text-sm text-white/60 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p className="text-xl font-semibold text-white mt-1">
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {funnel && (
        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h2>
            <div className="space-y-2">
              {Object.entries(funnel).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-white font-semibold">{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {acquisition && (
        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">User Acquisition</h2>
            <div className="space-y-2">
              {Object.entries(acquisition).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <span className="text-white">{key || 'Unknown'}</span>
                  <span className="text-white font-semibold">{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

