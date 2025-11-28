'use client';

import { Card } from '@/components/ui/Card';
import { DocumentChecklistItem } from '@/components/applications/DocumentChecklistItem';
import { useTranslation } from 'react-i18next';

export interface ChecklistItem {
  document: string;
  name: string;
  nameUz?: string;
  nameRu?: string;
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority: 'high' | 'medium' | 'low';
  description?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
  commonMistakes?: string;
  commonMistakesUz?: string;
  commonMistakesRu?: string;
  status?: 'pending' | 'verified' | 'rejected' | 'not_uploaded';
  fileUrl?: string;
  documentId?: string;
}

interface DocumentChecklistProps {
  items: ChecklistItem[];
  applicationId: string;
  language?: string;
  className?: string;
}

export function DocumentChecklist({
  items,
  applicationId,
  language = 'en',
  className,
}: DocumentChecklistProps) {
  const { t } = useTranslation();

  // Group items by category
  const requiredItems = items.filter((item) => item.category === 'required');
  const highlyRecommendedItems = items.filter((item) => item.category === 'highly_recommended');
  const optionalItems = items.filter((item) => item.category === 'optional');

  if (items.length === 0) {
    return (
      <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
        <h2 className="mb-6 text-xl font-semibold text-white">
          {t('applications.documentChecklist', 'Document Checklist')}
        </h2>
        <div className="py-12 text-center">
          <p className="text-white/60">
            {t('applications.noChecklistAvailable', 'Checklist is being generated...')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`glass-panel border border-white/10 bg-white/[0.03] p-6 ${className || ''}`}>
      <h2 className="mb-6 text-xl font-semibold text-white">
        {t('applications.documentChecklist', 'Document Checklist')}
      </h2>

      <div className="space-y-8">
        {/* Required Documents */}
        {requiredItems.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                {t('documents.categoryRequired', 'Required Documents')}
              </h3>
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300">
                {requiredItems.length}
              </span>
            </div>
            <div className="space-y-3">
              {requiredItems.map((item, index) => (
                <DocumentChecklistItem
                  key={item.document || index}
                  item={item}
                  applicationId={applicationId}
                  language={language}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Highly Recommended Documents */}
        {highlyRecommendedItems.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                {t('documents.categoryHighlyRecommended', 'Highly Recommended')}
              </h3>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                {highlyRecommendedItems.length}
              </span>
            </div>
            <div className="space-y-3">
              {highlyRecommendedItems.map((item, index) => (
                <DocumentChecklistItem
                  key={item.document || index}
                  item={item}
                  applicationId={applicationId}
                  language={language}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}

        {/* Optional Documents */}
        {optionalItems.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">
                {t('documents.categoryOptional', 'Optional Documents')}
              </h3>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white/70">
                {optionalItems.length}
              </span>
            </div>
            <div className="space-y-3">
              {optionalItems.map((item, index) => (
                <DocumentChecklistItem
                  key={item.document || index}
                  item={item}
                  applicationId={applicationId}
                  language={language}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

