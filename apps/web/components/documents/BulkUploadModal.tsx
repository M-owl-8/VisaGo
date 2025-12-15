'use client';

import { useState, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, Check, X, Loader2, FileText, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from 'react-i18next';

interface FileWithMetadata {
  file: File;
  documentType: string;
  documentName: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  onUploadComplete?: () => void;
}

export function BulkUploadModal({
  isOpen,
  onClose,
  applicationId,
  onUploadComplete,
}: BulkUploadModalProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: FileWithMetadata[] = Array.from(selectedFiles).map((file) => ({
      file,
      documentType: guessDocumentType(file.name),
      documentName: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const guessDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('passport')) return 'passport';
    if (lower.includes('bank') || lower.includes('statement')) return 'bank_statement';
    if (lower.includes('employment') || lower.includes('work')) return 'employment_letter';
    if (lower.includes('invitation')) return 'invitation_letter';
    if (lower.includes('insurance')) return 'travel_insurance';
    if (lower.includes('ticket') || lower.includes('flight')) return 'flight_booking';
    if (lower.includes('hotel') || lower.includes('accommodation')) return 'accommodation_proof';
    return 'document';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const updateFileMetadata = (index: number, updates: Partial<FileWithMetadata>) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    setIsUploading(true);

    // Upload files sequentially (5 at a time for better control)
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (fileData, batchIndex) => {
          const fileIndex = i + batchIndex;
          if (fileData.status !== 'pending') return;

          updateFileMetadata(fileIndex, { status: 'uploading', progress: 0 });

          try {
            // Simulate progress
            const progressInterval = setInterval(() => {
              updateFileMetadata(fileIndex, {
                progress: Math.min(90, (files[fileIndex]?.progress || 0) + 10),
              });
            }, 200);

            const response = await apiClient.uploadDocument(
              applicationId,
              fileData.documentType,
              fileData.file
            );

            clearInterval(progressInterval);

            if (response.success) {
              updateFileMetadata(fileIndex, {
                status: 'success',
                progress: 100,
              });
            } else {
              updateFileMetadata(fileIndex, {
                status: 'error',
                error: response.error?.message || 'Upload failed',
              });
            }
          } catch (error: any) {
            updateFileMetadata(fileIndex, {
              status: 'error',
              error: error.message || 'Upload failed',
            });
          }
        })
      );
    }

    setIsUploading(false);

    // Check if all uploads succeeded
    const allSuccess = files.every((f) => f.status === 'success');
    if (allSuccess && onUploadComplete) {
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setIsDragging(false);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('documents.bulkUpload', 'Bulk Upload Documents')} size="xl">
      <div className="space-y-4">
        {/* Drop Zone */}
        {files.length === 0 && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-white/20 bg-white/5'
            }`}
          >
            <Upload size={48} className="mx-auto mb-4 text-white/40" />
            <p className="mb-2 text-sm font-medium text-white">
              {t('documents.dragDropMultiple', 'Drag and drop multiple files here')}
            </p>
            <p className="mb-4 text-xs text-white/60">
              {t('documents.orClickToSelectMultiple', 'or click to select from your computer')}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mx-auto"
            >
              {t('documents.selectFiles', 'Select Files')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
            <p className="mt-4 text-xs text-white/40">
              {t('documents.supportedFormats', 'PDF, JPG, PNG - Max 20MB each')}
            </p>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between rounded-lg bg-white/5 p-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/70">
                  {t('documents.totalFiles', 'Total')}: <span className="font-semibold text-white">{files.length}</span>
                </span>
                {uploadingCount > 0 && (
                  <span className="text-amber-400">
                    {t('documents.uploading', 'Uploading')}: {uploadingCount}
                  </span>
                )}
                {successCount > 0 && (
                  <span className="text-emerald-400">
                    {t('documents.success', 'Success')}: {successCount}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-400">
                    {t('documents.failed', 'Failed')}: {errorCount}
                  </span>
                )}
              </div>
              {!isUploading && pendingCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('documents.addMore', 'Add More')}
                </Button>
              )}
            </div>

            {/* Files */}
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {files.map((fileData, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  {/* Status Icon */}
                  <div className="shrink-0">
                    {fileData.status === 'pending' && <FileText size={20} className="text-white/40" />}
                    {fileData.status === 'uploading' && <Loader2 size={20} className="animate-spin text-amber-400" />}
                    {fileData.status === 'success' && <Check size={20} className="text-emerald-400" />}
                    {fileData.status === 'error' && <X size={20} className="text-red-400" />}
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">{fileData.file.name}</p>
                      <span className="shrink-0 text-xs text-white/60">{formatFileSize(fileData.file.size)}</span>
                    </div>
                    
                    {/* Document Type Selector */}
                    {fileData.status === 'pending' && (
                      <select
                        value={fileData.documentType}
                        onChange={(e) => updateFileMetadata(index, { documentType: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white"
                        disabled={isUploading}
                      >
                        <option value="passport">{t('documents.passport', 'Passport')}</option>
                        <option value="bank_statement">{t('documents.bankStatement', 'Bank Statement')}</option>
                        <option value="employment_letter">{t('documents.employmentLetter', 'Employment Letter')}</option>
                        <option value="invitation_letter">{t('documents.invitationLetter', 'Invitation Letter')}</option>
                        <option value="travel_insurance">{t('documents.travelInsurance', 'Travel Insurance')}</option>
                        <option value="flight_booking">{t('documents.flightBooking', 'Flight Booking')}</option>
                        <option value="accommodation_proof">{t('documents.accommodationProof', 'Accommodation Proof')}</option>
                        <option value="document">{t('documents.other', 'Other')}</option>
                      </select>
                    )}

                    {/* Progress Bar */}
                    {fileData.status === 'uploading' && (
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${fileData.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {fileData.status === 'error' && fileData.error && (
                      <p className="mt-1 text-xs text-red-400">{fileData.error}</p>
                    )}
                  </div>

                  {/* Remove Button */}
                  {!isUploading && fileData.status !== 'success' && (
                    <button
                      onClick={() => removeFile(index)}
                      className="shrink-0 rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isUploading}
              >
                {isUploading ? t('common.uploading', 'Uploading...') : t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleUploadAll}
                disabled={isUploading || pendingCount === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('documents.uploading', 'Uploading')} ({uploadingCount}/{files.length})
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {t('documents.uploadAll', 'Upload All')} ({pendingCount})
                  </>
                )}
              </Button>
            </div>

            {/* Hidden file input for adding more */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

