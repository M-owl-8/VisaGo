'use client';

import { useEffect, useState } from 'react';
import { adminApi, DocumentVerificationQueue } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentVerificationQueue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [page]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getDocumentVerificationQueue({ skip: page * pageSize, take: pageSize });
      setDocuments(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (documentId: string, status: 'verified' | 'rejected') => {
    try {
      setUpdating(documentId);
      await adminApi.updateDocumentStatus(documentId, status);
      await loadDocuments();
    } catch (err: any) {
      alert(`Failed to update document: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Document Verification</h1>
        <p className="text-white/60 mt-1">Review and verify uploaded documents</p>
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
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Document</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Type</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Country</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Uploaded</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white/80">{doc.userEmail}</td>
                    <td className="p-4 text-white">{doc.documentName}</td>
                    <td className="p-4 text-white/80">{doc.documentType}</td>
                    <td className="p-4 text-white/80">{doc.applicationCountry}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300">
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/60 text-sm">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleVerify(doc.id, 'verified')}
                          disabled={updating === doc.id}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-300"
                        >
                          {updating === doc.id ? '...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleVerify(doc.id, 'rejected')}
                          disabled={updating === doc.id}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-300"
                        >
                          {updating === doc.id ? '...' : 'Reject'}
                        </Button>
                      </div>
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
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} documents
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

