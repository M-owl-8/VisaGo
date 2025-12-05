'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api/config';

interface CountryStats {
  country: string;
  countryCode: string;
  total: number;
  rulesMode: number;
  legacyMode: number;
  fallbackMode: number;
  averageItems: number;
  fallbackPercentage: number;
  rulesPercentage: number;
  legacyPercentage: number;
}

interface ChecklistStats {
  byCountry: CountryStats[];
  overall: {
    totalChecklists: number;
    totalRulesMode: number;
    totalLegacyMode: number;
    totalFallbackMode: number;
    overallFallbackPercentage: number;
    overallAverageItems: number;
  };
  period: {
    from: string;
    to: string;
    days: number;
  };
}

export default function ChecklistStatsPage() {
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/checklist-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load statistics');
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      } else {
        setError('Failed to load statistics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Checklist Generation Statistics</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Checklist Generation Statistics</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Checklist Generation Statistics</h1>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Checklist Generation Statistics</h1>
        <p className="text-gray-600">
          Statistics for the last {stats.period.days} days ({new Date(stats.period.from).toLocaleDateString()} - {new Date(stats.period.to).toLocaleDateString()})
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Overall Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Checklists</div>
            <div className="text-2xl font-bold">{stats.overall.totalChecklists}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Rules Mode</div>
            <div className="text-2xl font-bold text-blue-600">{stats.overall.totalRulesMode}</div>
            <div className="text-xs text-gray-500">
              {stats.overall.totalChecklists > 0
                ? Math.round((stats.overall.totalRulesMode / stats.overall.totalChecklists) * 100)
                : 0}
              %
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Legacy Mode</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.overall.totalLegacyMode}</div>
            <div className="text-xs text-gray-500">
              {stats.overall.totalChecklists > 0
                ? Math.round((stats.overall.totalLegacyMode / stats.overall.totalChecklists) * 100)
                : 0}
              %
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Fallback Mode</div>
            <div className="text-2xl font-bold text-red-600">{stats.overall.totalFallbackMode}</div>
            <div className="text-xs text-gray-500">
              {stats.overall.overallFallbackPercentage}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Avg Items/Checklist</div>
            <div className="text-2xl font-bold">{stats.overall.overallAverageItems}</div>
          </div>
        </div>
      </div>

      {/* By Country */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Statistics by Country</h2>
        {stats.byCountry.length === 0 ? (
          <p className="text-gray-600">No data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rules
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Legacy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fallback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Items
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.byCountry.map((country) => (
                  <tr key={country.countryCode}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{country.country}</div>
                      <div className="text-sm text-gray-500">{country.countryCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {country.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-600">{country.rulesMode}</div>
                      <div className="text-xs text-gray-500">{country.rulesPercentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-yellow-600">{country.legacyMode}</div>
                      <div className="text-xs text-gray-500">{country.legacyPercentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-red-600">{country.fallbackMode}</div>
                      <div className="text-xs text-gray-500">{country.fallbackPercentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {country.averageItems}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <button
          onClick={fetchStats}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

