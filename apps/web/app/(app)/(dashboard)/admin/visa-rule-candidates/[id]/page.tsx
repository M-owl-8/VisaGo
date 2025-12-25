'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { API_BASE_URL } from '@/lib/api/config';

interface RuleSetDiff {
  addedDocuments?: Array<{ documentType: string; category: string }>;
  removedDocuments?: Array<{ documentType: string; category: string }>;
  modifiedDocuments?: Array<{
    documentType: string;
    changes: any;
  }>;
  financialChanges?: any;
  processingChanges?: any;
  feeChanges?: any;
}

interface CandidateDetail {
  id: string;
  countryCode: string;
  visaType: string;
  confidence: number | null;
  status: string;
  data: any;
  existingRuleSet: any;
  diff: RuleSetDiff | null;
  source: any;
  pageContent: any;
  extractionMetadata: any;
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const fetchCandidate = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/visa-rule-candidates/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch candidate');
      }

      const result = await response.json();
      setCandidate(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load candidate');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCandidate();
  }, [fetchCandidate]);

  const handleApproveClick = () => {
    setShowApproveConfirm(true);
  };

  const handleApprove = async () => {
    setShowApproveConfirm(false);

    try {
      setProcessing(true);
      setError(null);
      setSuccess(false);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/visa-rule-candidates/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to approve');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/visa-rule-candidates');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve candidate');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    const notes = prompt('Rejection reason (optional):');
    if (notes === null) return; // User cancelled

    try {
      setProcessing(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/visa-rule-candidates/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reject');
      }

      setTimeout(() => {
        router.push('/admin/visa-rule-candidates');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to reject candidate');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">Candidate not found</div>
      </div>
    );
  }

  const renderDiff = () => {
    if (!candidate.diff) {
      return <div className="text-gray-500">No existing rules to compare</div>;
    }

    return (
      <div className="space-y-4">
        {candidate.diff.addedDocuments && candidate.diff.addedDocuments.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-700 mb-2">Added Documents:</h4>
            <ul className="list-disc list-inside space-y-1">
              {candidate.diff.addedDocuments.map((doc, idx) => (
                <li key={idx} className="text-sm">
                  {doc.documentType} ({doc.category})
                </li>
              ))}
            </ul>
          </div>
        )}

        {candidate.diff.removedDocuments && candidate.diff.removedDocuments.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-700 mb-2">Removed Documents:</h4>
            <ul className="list-disc list-inside space-y-1">
              {candidate.diff.removedDocuments.map((doc, idx) => (
                <li key={idx} className="text-sm">
                  {doc.documentType} ({doc.category})
                </li>
              ))}
            </ul>
          </div>
        )}

        {candidate.diff.modifiedDocuments && candidate.diff.modifiedDocuments.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-700 mb-2">Modified Documents:</h4>
            <ul className="list-disc list-inside space-y-1">
              {candidate.diff.modifiedDocuments.map((doc, idx) => (
                <li key={idx} className="text-sm">
                  {doc.documentType}
                  {doc.changes.category && (
                    <>: category {doc.changes.category.old} → {doc.changes.category.new}</>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

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
        <h1 className="text-2xl font-bold">Review Candidate</h1>
        <div className="mt-2 text-sm text-gray-600">
          {candidate.countryCode} - {candidate.visaType}
          {candidate.confidence !== null && (
            <Badge className="ml-2 bg-blue-100 text-blue-800">
              {(candidate.confidence * 100).toFixed(0)}% confidence
            </Badge>
          )}
          <Badge className={`ml-2 ${
            candidate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            candidate.status === 'approved' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {candidate.status}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
          Candidate approved! Redirecting...
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">New Rules</h2>
          <div className="space-y-2">
            <div>
              <strong>Documents:</strong> {candidate.data?.requiredDocuments?.length || 0}
            </div>
            {candidate.data?.financialRequirements && (
              <div>
                <strong>Min Balance:</strong>{' '}
                {candidate.data.financialRequirements.minimumBalance}{' '}
                {candidate.data.financialRequirements.currency}
              </div>
            )}
            {candidate.data?.processingInfo && (
              <div>
                <strong>Processing Days:</strong>{' '}
                {candidate.data.processingInfo.processingDays}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Changes</h2>
          {renderDiff()}
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Required Documents</h2>
        <div className="space-y-2">
          {candidate.data?.requiredDocuments?.map((doc: any, idx: number) => (
            <div key={idx} className="border-b pb-2">
              <div className="flex items-center gap-2">
                <strong>{doc.documentType}</strong>
                <Badge>{doc.category}</Badge>
                {doc.condition && (
                  <Badge className="bg-purple-100 text-purple-800">
                    Conditional: {doc.condition}
                  </Badge>
                )}
              </div>
              {doc.description && (
                <div className="text-sm text-gray-600 mt-1">{doc.description}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {candidate.status === 'pending' && (
        <div className="mt-6 flex justify-end gap-4">
          <Button
            onClick={handleReject}
            variant="secondary"
            disabled={processing}
          >
            Reject
          </Button>
          <Button
            onClick={handleApproveClick}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Approve'}
          </Button>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <Modal
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        title="Approve Candidate"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-white/80">
            Are you sure you want to approve this candidate? This will create a new approved rule set.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setShowApproveConfirm(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Approve'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

