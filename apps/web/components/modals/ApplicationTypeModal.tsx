'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { FileText, GraduationCap, Briefcase, ChevronRight, Info } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ApplicationTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationTypeModal({ isOpen, onClose }: ApplicationTypeModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSelectVisa = () => {
    onClose();
    router.push('/questionnaire');
  };

  const handleSelectUniversities = () => {
    setShowComingSoon(true);
  };

  const handleSelectJobContract = () => {
    setShowComingSoon(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('applications.selectApplicationType', 'Select Application Type')} size="md">
      <div className="space-y-3">
        {/* Visa Application Option */}
        <button
          onClick={handleSelectVisa}
          className="w-full flex items-center gap-4 rounded-2xl border border-white/20 bg-white/5 p-4 text-left transition hover:bg-white/10 hover:border-primary/50 active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
            <FileText size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">
              {t('applications.startVisaApplication', 'Start Visa Application')}
            </h3>
            <p className="text-sm text-white/60 line-clamp-2">
              {t('applications.visaApplicationDescription', 'Create a new visa application and get personalized document checklist')}
            </p>
          </div>
          <ChevronRight size={20} className="text-white/40 shrink-0" />
        </button>

        {/* Universities Option */}
        <button
          onClick={handleSelectUniversities}
          className="w-full flex items-center gap-4 rounded-2xl border border-white/20 bg-white/5 p-4 text-left transition hover:bg-white/10 hover:border-primary/50 active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
            <GraduationCap size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">
              {t('applications.applyToUniversities', 'Apply to Universities')}
            </h3>
            <p className="text-sm text-white/60 line-clamp-2">
              {t('applications.universitiesDescription', 'Apply to universities and manage your applications')}
            </p>
          </div>
          <ChevronRight size={20} className="text-white/40 shrink-0" />
        </button>

        {/* Job Contract Option */}
        <button
          onClick={handleSelectJobContract}
          className="w-full flex items-center gap-4 rounded-2xl border border-white/20 bg-white/5 p-4 text-left transition hover:bg-white/10 hover:border-primary/50 active:scale-[0.98]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
            <Briefcase size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">
              {t('applications.jobContract', 'Job Contract')}
            </h3>
            <p className="text-sm text-white/60 line-clamp-2">
              {t('applications.jobContractDescription', 'Find and apply for job contracts')}
            </p>
          </div>
          <ChevronRight size={20} className="text-white/40 shrink-0" />
        </button>
      </div>

      {/* Coming Soon Modal */}
      <Modal
        isOpen={showComingSoon}
        onClose={() => setShowComingSoon(false)}
        title={t('applications.comingSoon', 'Coming Soon')}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Info size={24} className="text-primary shrink-0 mt-0.5" />
            <p className="text-white/80">
              {t('applications.comingSoonDescription', 'This feature is currently under development. Check back soon!')}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowComingSoon(false)}>
              {t('common.ok', 'OK')}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}





