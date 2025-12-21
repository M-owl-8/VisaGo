'use client';

import { useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Upload, FileText, AlertCircle, Info } from 'lucide-react';

// Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/errorMessages';
import { useApplication } from '@/lib/hooks/useApplication';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/Button';
import ErrorBanner from '@/components/ErrorBanner';
import SuccessBanner from '@/components/SuccessBanner';

function DocumentsPageContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuthStore();
  const applicationId = params.id as string;
  
  // Fetch application context
  const { application } = useApplication(applicationId, {
    autoFetch: isSignedIn,
  });
  
  // Read documentType from query - support both 'documentType' and 'document_type' for compatibility
  const documentTypeFromQuery = searchParams.get('documentType') ?? searchParams.get('document_type') ?? 'document';
  const documentNameFromQuery = searchParams.get('name') ?? 'Document';
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getFlagEmoji = (countryCode?: string): string => {
    if (!countryCode) return '🌍';
    const flagMap: Record<string, string> = {
      us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', au: '🇦🇺', de: '🇩🇪',
      fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', jp: '🇯🇵', ae: '🇦🇪', uz: '🇺🇿',
    };
    return flagMap[countryCode.toLowerCase()] || '🌍';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError(t('documents.fileTooLarge'));
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    // Ensure we use the query param, not hardcoded 'document'
    const effectiveDocumentType = documentTypeFromQuery || 'document';
    
    // Debug logging to verify documentType is being sent correctly
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('[UPLOAD_UI_DEBUG] Uploading with documentType:', effectiveDocumentType, {
        fromQuery: searchParams.get('documentType'),
        fileName: file.name,
        fileSize: file.size,
      });
    }

    try {
      const response = await apiClient.uploadDocument(params.id as string, effectiveDocumentType, file);

      if (response.success) {
        setSuccess(
          t(
            'documents.uploadSuccess',
            "Upload successful! We're reviewing your document now. Most reviews finish within a few minutes. You'll be notified when it's done."
          )
        );
        setTimeout(() => {
          router.push(`/applications/${params.id}`);
          router.refresh(); // Refetch checklist data
        }, 3000);
      } else {
        const errorMsg = getErrorMessage(response.error || {}, t, i18n.language);
        setError(
          errorMsg ||
            t(
              'documents.uploadFailed',
              "Something didn't go as expected. Please try again, or chat with our AI assistant if you need help."
            )
        );
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err, t, i18n.language);
      setError(
        errorMsg ||
          t(
            'documents.uploadFailed',
            "We couldn't complete the upload. Check your connection and try again. Your previous uploads are safe."
          )
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 lg:px-8">
      {/* Application Context Header */}
      {application && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-2xl">
              {getFlagEmoji(application.country?.code)}
            </div>
            <div className="flex-1">
              <p className="text-xs text-white/50 uppercase tracking-wider">
                {t('documents.uploadingFor', 'Uploading for')}
              </p>
              <p className="font-semibold text-white">
                {application.country?.name} – {application.visaType?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/50">{t('applications.progress', 'Progress')}</p>
              <p className="text-lg font-semibold text-white">{application.progressPercentage || 0}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Back to Checklist Button */}
      <Link
        href={`/applications/${applicationId}#checklist`}
        className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        {t('documents.backToChecklist', 'Back to checklist')}
      </Link>

      <h1 className="mb-6 text-2xl font-bold">
        {t('documents.uploadDocumentTitle', `Upload ${documentNameFromQuery}`, { name: documentNameFromQuery })}
      </h1>

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}
      {success && <SuccessBanner message={success} />}

      {/* Upload Card */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_55px_rgba(1,7,17,0.65)] mb-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <FileText size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">{documentNameFromQuery}</h3>
            <p className="text-sm text-white/60">
              {t('documents.acceptedFormats', 'Accepted formats: PDF, JPG, PNG (max 20MB)')}
            </p>
          </div>
        </div>
        
        <label className="block text-sm font-medium text-white/80 mb-2">
          {t('documents.selectDocument', 'Select Document')}
        </label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={uploading}
          className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 file:mr-4 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-primary file:to-primary-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
        />
        {uploading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{t('documents.uploading', 'Uploading and verifying with AI...')}</span>
          </div>
        )}
      </div>

      {/* Helper Info Card */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-200 mb-2">
              {t('documents.tips', 'Tips for best results')}
            </p>
            <ul className="space-y-1 text-blue-200/80 list-disc list-inside">
              <li>{t('documents.tip1', 'Ensure document is clear and readable')}</li>
              <li>{t('documents.tip2', 'All required information should be visible')}</li>
              <li>{t('documents.tip3', 'Avoid blurry or cut-off images')}</li>
            </ul>
            <p className="mt-3 text-xs text-blue-200/60">
              {t('documents.confidence', 'Our AI reviews documents against official embassy requirements. Most reviews complete within 5 minutes.')}
            </p>
          </div>
        </div>
      </div>

      {/* Reassurance Card - For re-uploads or first uploads */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-white/40 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-white/60">
            <p>
              {t(
                'documents.normalProcess',
                "Many applicants upload a document more than once to meet embassy standards — this is a common part of the process. Take your time and upload when you're ready."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/applications/${applicationId}#checklist`} className="flex-1">
          <Button
            variant="secondary"
            className="w-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            <span className="ml-2">{t('documents.backToChecklist', 'Back to checklist')}</span>
          </Button>
        </Link>
        <Link href={`/chat?applicationId=${applicationId}`} className="flex-1">
          <Button
            variant="ghost"
            className="w-full border border-white/10 text-white hover:bg-white/10"
          >
            <MessageCircle size={16} />
            <span className="ml-2">{t('documents.askAI', 'Ask AI about this document')}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-3xl px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="text-white/60">Loading...</div>
      </div>
    }>
      <DocumentsPageContent />
    </Suspense>
  );
}
