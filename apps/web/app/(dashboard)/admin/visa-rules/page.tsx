'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { API_BASE_URL } from '@/lib/api/config';

interface VisaRuleSet {
  id: string;
  countryCode: string;
  visaType: string;
  version: number;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  summary: {
    requiredDocumentsCount: number;
  };
}

export default function VisaRulesListPage() {
  const router = useRouter();
  const [ruleSets, setRuleSets] = useState<VisaRuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState('');
  const [visaTypeFilter, setVisaTypeFilter] = useState('');

  useEffect(() => {
    fetchRuleSets();
  }, [countryFilter, visaTypeFilter]);

  const fetchRuleSets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (countryFilter) params.append('countryCode', countryFilter);
      if (visaTypeFilter) params.append('visaType', visaTypeFilter);

      const response = await fetch(`${API_BASE_URL}/api/admin/visa-rules?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rule sets');
      }

      const result = await response.json();
      setRuleSets(result.data.ruleSets);
    } catch (err) {
      console.error('Error fetching rule sets:', err);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold">Visa Rule Sets</h1>
        <p className="text-gray-600 mt-2">Manage visa document rules and conditions</p>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </Card>

      <div className="space-y-4">
        {ruleSets.map((ruleSet) => (
          <Card
            key={ruleSet.id}
            className="p-4 cursor-pointer hover:bg-gray-50"
            onClick={() => router.push(`/admin/visa-rules/${ruleSet.id}`)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {ruleSet.countryCode} - {ruleSet.visaType}
                  </h3>
                  <Badge>v{ruleSet.version}</Badge>
                  {ruleSet.isApproved && (
                    <Badge className="bg-green-100 text-green-800">Approved</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {ruleSet.summary.requiredDocumentsCount} documents
                </div>
              </div>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </div>
          </Card>
        ))}

        {ruleSets.length === 0 && (
          <Card className="p-8 text-center text-gray-500">
            No rule sets found
          </Card>
        )}
      </div>
    </div>
  );
}

