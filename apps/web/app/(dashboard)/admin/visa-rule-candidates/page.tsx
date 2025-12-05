'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { API_BASE_URL } from '@/lib/api/config';

interface VisaRuleSetCandidate {
  id: string;
  countryCode: string;
  visaType: string;
  confidence: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  source: {
    id: string;
    name: string | null;
    url: string;
  } | null;
  pageContent: {
    id: string;
    url: string;
    title: string | null;
    fetchedAt: string;
  } | null;
}

export default function VisaRuleCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<VisaRuleSetCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');
  const [visaTypeFilter, setVisaTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCandidates();
  }, [countryFilter, visaTypeFilter, statusFilter]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (countryFilter) params.append('countryCode', countryFilter);
      if (visaTypeFilter) params.append('visaType', visaTypeFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`${API_BASE_URL}/api/admin/visa-rule-candidates?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }

      const result = await response.json();
      setCandidates(result.data.candidates);
    } catch (err) {
      console.error('Error fetching candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Visa Rule Candidates</h1>
        <p className="text-gray-600 mt-2">Review and approve GPT-extracted visa rules</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Country
            </label>
            <Input
              type="text"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value.toUpperCase())}
              placeholder="e.g., US, CA, GB"
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Visa Type
            </label>
            <Input
              type="text"
              value={visaTypeFilter}
              onChange={(e) => setVisaTypeFilter(e.target.value.toLowerCase())}
              placeholder="e.g., student, tourist"
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {candidates.map((candidate) => (
          <Card
            key={candidate.id}
            className="p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => router.push(`/admin/visa-rule-candidates/${candidate.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">
                    {candidate.countryCode} - {candidate.visaType}
                  </h3>
                  {getStatusBadge(candidate.status)}
                  {candidate.confidence !== null && (
                    <Badge className="bg-blue-100 text-blue-800">
                      {(candidate.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {candidate.source?.name || candidate.source?.url}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Created: {new Date(candidate.createdAt).toLocaleString()}
                  {candidate.reviewedAt && (
                    <> • Reviewed: {new Date(candidate.reviewedAt).toLocaleString()}</>
                  )}
                </div>
              </div>
              <Button variant="secondary" size="sm">
                Review
              </Button>
            </div>
          </Card>
        ))}

        {candidates.length === 0 && (
          <Card className="p-8 text-center text-gray-500">
            No candidates found
          </Card>
        )}
      </div>
    </div>
  );
}

