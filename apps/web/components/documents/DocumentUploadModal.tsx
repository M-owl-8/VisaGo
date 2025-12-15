'use client';

import { useState, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, Check, X, Loader2, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useTranslation } from 'react-i18next';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  documentType: string;
  documentName: string;
  onUploadSuccess?: () => void;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  applicationId,
  documentType,
  documentName,
  onUploadSuccess,
}: DocumentUploadModalProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage(t('documents.fileTooLarge', 'File size must be less than 20MB'));
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(t('documents.invalidFileType', 'Only PDF, JPG, and PNG files are allowed'));
      return;
    }

    setSelectedFile(file);
    setErrorMessage('');
    setUploadStatus('idle');
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

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await apiClient.uploadDocument(applicationId, documentType, selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setUploadStatus('success');
        
        // Call success callback
        if (onUploadSuccess) {
          onUploadSuccess();
        }

        // Auto-close after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setUploadStatus('error');
        setErrorMessage(response.error?.message || t('documents.uploadFailed', 'Upload failed'));
      }
    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(error.message || t('documents.uploadFailed', 'Upload failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');
    setIsDragging(false);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('documents.uploadDocument', 'Upload Document')} size="md">
      <div className="space-y-4">
        {/* Document Name */}
        <div>
          <p className="text-sm text-white/60">{t('documents.documentType', 'Document Type')}</p>
          <p className="text-base font-medium text-white">{documentName}</p>
        </div>

        {/* File Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : uploadStatus === 'error'
              ? 'border-red-500/50 bg-red-500/5'
              : uploadStatus === 'success'
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-white/20 bg-white/5'
          }`}
        >
          {uploadStatus === 'idle' && !selectedFile && (
            <>
              <Upload size={48} className="mx-auto mb-4 text-white/40" />
              <p className="mb-2 text-sm font-medium text-white">
                {t('documents.dragDropFile', 'Drag and drop your file here')}
              </p>
              <p className="mb-4 text-xs text-white/60">
                {t('documents.orClickToSelect', 'or click to select from your computer')}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto"
              >
                {t('documents.selectFile', 'Select File')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <p className="mt-4 text-xs text-white/40">
                {t('documents.supportedFormats', 'PDF, JPG, PNG - Max 20MB')}
              </p>
            </>
          )}

          {selectedFile && uploadStatus === 'idle' && (
            <div className="space-y-4">
              <FileText size={48} className="mx-auto text-primary" />
              <div>
                <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                <p className="text-xs text-white/60">{formatFileSize(selectedFile.size)}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                  <X size={16} />
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleUpload}>
                  <Upload size={16} />
                  {t('documents.upload', 'Upload')}
                </Button>
              </div>
            </div>
          )}

          {uploadStatus === 'uploading' && (
            <div className="space-y-4">
              <Loader2 size={48} className="mx-auto animate-spin text-primary" />
              <div>
                <p className="mb-2 text-sm font-medium text-white">
                  {t('documents.uploading', 'Uploading...')}
                </p>
                <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/60">{uploadProgress}%</p>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Check size={32} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  {t('documents.uploadSuccess', 'Upload successful!')}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {t('documents.aiReviewing', 'AI is reviewing your document...')}
                </p>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <X size={32} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-400">
                  {t('documents.uploadFailed', 'Upload failed')}
                </p>
                {errorMessage && (
                  <p className="mt-1 text-xs text-white/60">{errorMessage}</p>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setUploadStatus('idle')}>
                {t('documents.tryAgain', 'Try Again')}
              </Button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && uploadStatus === 'idle' && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        {/* Info Message */}
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <p className="text-xs text-white/60">
            {t('documents.uploadInfo', 'Your document will be automatically verified by AI after upload. This usually takes 10-30 seconds.')}
          </p>
        </div>
      </div>
    </Modal>
  );
}

