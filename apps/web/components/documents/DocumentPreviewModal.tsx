'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Document {
  id: string;
  name: string;
  fileUrl: string;
  status?: string;
  aiNotesUz?: string;
  aiNotesEn?: string;
  aiNotesRu?: string;
  verificationNotes?: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  initialDocumentIndex: number;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  documents,
  initialDocumentIndex,
}: DocumentPreviewModalProps) {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialDocumentIndex);
  const [zoom, setZoom] = useState(100);

  const currentDoc = documents[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < documents.length - 1;

  useEffect(() => {
    setCurrentIndex(initialDocumentIndex);
    setZoom(100);
  }, [initialDocumentIndex, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        goToPrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, hasPrev, hasNext]);

  const goToPrevious = () => {
    if (hasPrev) {
      setCurrentIndex((prev) => prev - 1);
      setZoom(100);
    }
  };

  const goToNext = () => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
      setZoom(100);
    }
  };

  const handleDownload = () => {
    if (currentDoc?.fileUrl) {
      window.open(currentDoc.fileUrl, '_blank');
    }
  };

  const getAINotes = () => {
    if (i18n.language === 'uz') return currentDoc?.aiNotesUz;
    if (i18n.language === 'ru') return currentDoc?.aiNotesRu;
    return currentDoc?.aiNotesEn || currentDoc?.verificationNotes;
  };

  const isImage = currentDoc?.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPDF = currentDoc?.fileUrl?.match(/\.pdf$/i);

  if (!isOpen || !currentDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
        aria-label="Close"
      >
        <X size={24} />
      </button>

      {/* Navigation buttons */}
      {hasPrev && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20"
          aria-label="Previous document"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {hasNext && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20"
          aria-label="Next document"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Main content */}
      <div className="flex h-full w-full max-w-7xl flex-col gap-4 lg:flex-row">
        {/* Document viewer */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-white/5">
          {isImage ? (
            <img
              src={currentDoc.fileUrl}
              alt={currentDoc.name}
              className="max-h-full max-w-full object-contain transition-transform"
              style={{ transform: `scale(${zoom / 100})` }}
            />
          ) : isPDF ? (
            <iframe
              src={currentDoc.fileUrl}
              className="h-full w-full"
              title={currentDoc.name}
            />
          ) : (
            <div className="text-center text-white/60">
              <p className="mb-4">{t('documents.previewNotAvailable', 'Preview not available')}</p>
              <button
                onClick={handleDownload}
                className="rounded-lg bg-primary px-4 py-2 text-white transition hover:bg-primary/80"
              >
                <Download size={16} className="mr-2 inline" />
                {t('documents.downloadToView', 'Download to view')}
              </button>
            </div>
          )}

          {/* Zoom controls for images */}
          {isImage && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-lg bg-black/60 p-2 backdrop-blur-sm">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                className="rounded p-2 text-white transition hover:bg-white/20"
                aria-label="Zoom out"
              >
                <ZoomOut size={20} />
              </button>
              <span className="flex items-center px-2 text-sm text-white">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                className="rounded p-2 text-white transition hover:bg-white/20"
                aria-label="Zoom in"
              >
                <ZoomIn size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar with document info and AI notes */}
        <div className="w-full space-y-4 overflow-y-auto rounded-xl bg-white/5 p-6 lg:w-80">
          {/* Document info */}
          <div>
            <h3 className="text-lg font-semibold text-white">{currentDoc.name}</h3>
            <p className="mt-1 text-sm text-white/60">
              {t('documents.document', 'Document')} {currentIndex + 1} {t('documents.of', 'of')}{' '}
              {documents.length}
            </p>
          </div>

          {/* Status */}
          {currentDoc.status && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                {t('documents.status', 'Status')}
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  currentDoc.status === 'verified'
                    ? 'text-emerald-400'
                    : currentDoc.status === 'rejected'
                    ? 'text-red-400'
                    : currentDoc.status === 'pending'
                    ? 'text-amber-400'
                    : 'text-white/60'
                }`}
              >
                {currentDoc.status === 'verified'
                  ? t('documents.statusVerified', 'Verified')
                  : currentDoc.status === 'rejected'
                  ? t('documents.statusRejected', 'Rejected')
                  : currentDoc.status === 'pending'
                  ? t('documents.statusPending', 'Pending')
                  : t('documents.statusNotUploaded', 'Not uploaded')}
              </p>
            </div>
          )}

          {/* AI Notes */}
          {getAINotes() && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-blue-300">
                {t('documents.aiNotes', 'AI Notes')}
              </p>
              <p className="text-sm leading-relaxed text-white/80">{getAINotes()}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <Download size={16} />
              {t('documents.download', 'Download')}
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">
              {t('documents.keyboardShortcuts', 'Keyboard shortcuts')}
            </p>
            <div className="mt-2 space-y-1 text-xs text-white/60">
              <p>← {t('documents.previousDocument', 'Previous document')}</p>
              <p>→ {t('documents.nextDocument', 'Next document')}</p>
              <p>Esc {t('documents.close', 'Close')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

