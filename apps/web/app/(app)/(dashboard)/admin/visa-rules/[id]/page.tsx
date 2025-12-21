'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { API_BASE_URL } from '@/lib/api/config';

interface RequiredDocument {
  documentType: string;
  category: 'required' | 'highly_recommended' | 'optional';
  description?: string;
  validityRequirements?: string;
  formatRequirements?: string;
  condition?: string;
}

interface VisaRuleSetData {
  version?: number;
  requiredDocuments: RequiredDocument[];
  financialRequirements?: any;
  processingInfo?: any;
  fees?: any;
  additionalRequirements?: any;
  sourceInfo?: any;
}

interface VisaRuleSet {
  id: string;
  countryCode: string;
  visaType: string;
  version: number;
  isApproved: boolean;
  data: VisaRuleSetData;
}

export default function VisaRuleSetEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ruleSet, setRuleSet] = useState<VisaRuleSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchRuleSet = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/visa-rules/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rule set');
      }

      const result = await response.json();
      setRuleSet(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rule set');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRuleSet();
  }, [fetchRuleSet]);

  const handleConditionChange = (index: number, condition: string) => {
    if (!ruleSet) return;

    const updatedData = { ...ruleSet.data };
    updatedData.requiredDocuments = [...updatedData.requiredDocuments];
    updatedData.requiredDocuments[index] = {
      ...updatedData.requiredDocuments[index],
      condition: condition || undefined,
    };

    // Ensure version is at least 2 if any condition is set
    if (condition && (!updatedData.version || updatedData.version < 2)) {
      updatedData.version = 2;
    }

    setRuleSet({
      ...ruleSet,
      data: updatedData,
    });
  };

  const handleSave = async () => {
    if (!ruleSet) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/visa-rules/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: ruleSet.data,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to save');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!ruleSet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">Rule set not found</div>
      </div>
    );
  }

  const conditionTooltip = `Supported syntax:
- Equality: sponsorType === 'self'
- Inequality: sponsorType !== 'self'
- Booleans: previousVisaRejections === true
- AND: (sponsorType !== 'self') && (currentStatus === 'employed')
- OR: (isStudent === true) || (hasUniversityInvitation === true)

Available fields:
sponsorType, currentStatus, isStudent, isEmployed,
hasInternationalTravel, previousVisaRejections, previousOverstay,
hasPropertyInUzbekistan, hasFamilyInUzbekistan, hasChildren,
hasUniversityInvitation, hasOtherInvitation, visaType, riskScore.level`;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Button
          onClick={() => router.back()}
          variant="secondary"
          className="mb-4"
        >
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Visa Rule Set</h1>
        <div className="mt-2 text-sm text-gray-600">
          {ruleSet.countryCode} - {ruleSet.visaType} (v{ruleSet.version})
          {ruleSet.isApproved && (
            <Badge className="ml-2 bg-green-100 text-green-800">Approved</Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
          Changes saved successfully!
        </div>
      )}

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-4">Required Documents</h2>
          <div className="space-y-4">
            {ruleSet.data.requiredDocuments.map((doc, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded p-4 bg-gray-50"
              >
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-3">
                    <div className="text-sm font-medium text-gray-700">
                      Document Type
                    </div>
                    <div className="mt-1 text-sm">{doc.documentType}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-700">
                      Category
                    </div>
                    <Badge className="mt-1">
                      {doc.category}
                    </Badge>
                  </div>
                  <div className="col-span-7">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      Condition
                      <span
                        className="ml-2 text-gray-400 cursor-help"
                        title={conditionTooltip}
                      >
                        ⓘ
                      </span>
                    </div>
                    <Input
                      type="text"
                      value={doc.condition || ''}
                      onChange={(e) =>
                        handleConditionChange(index, e.target.value)
                      }
                      placeholder="e.g., sponsorType !== 'self'"
                      className="text-sm font-mono"
                    />
                    {doc.condition && (
                      <div className="mt-1 text-xs text-gray-500">
                        Document included only if condition is true
                      </div>
                    )}
                  </div>
                </div>
                {doc.description && (
                  <div className="mt-2 text-sm text-gray-600">
                    {doc.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Button
            onClick={() => router.back()}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

