'use client';

import { useTranslation } from 'react-i18next';
import { Download, FileText, Briefcase, Home, Users, Plane } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Template {
  id: string;
  nameKey: string;
  nameDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  icon: any;
  downloadUrl: string;
  category: 'invitation' | 'employment' | 'financial' | 'accommodation';
}

const templates: Template[] = [
  {
    id: 'invitation-letter',
    nameKey: 'templates.invitationLetter',
    nameDefault: 'Invitation Letter',
    descriptionKey: 'templates.invitationLetterDesc',
    descriptionDefault: 'Template for personal or business invitation letters',
    icon: Users,
    downloadUrl: '/templates/invitation-letter-template.pdf',
    category: 'invitation',
  },
  {
    id: 'employment-letter',
    nameKey: 'templates.employmentLetter',
    nameDefault: 'Employment Letter',
    descriptionKey: 'templates.employmentLetterDesc',
    descriptionDefault: 'Template for employment verification letter from your employer',
    icon: Briefcase,
    downloadUrl: '/templates/employment-letter-template.pdf',
    category: 'employment',
  },
  {
    id: 'accommodation-proof',
    nameKey: 'templates.accommodationProof',
    nameDefault: 'Accommodation Proof',
    descriptionKey: 'templates.accommodationProofDesc',
    descriptionDefault: 'Template for hotel booking confirmation or host letter',
    icon: Home,
    downloadUrl: '/templates/accommodation-proof-template.pdf',
    category: 'accommodation',
  },
  {
    id: 'cover-letter',
    nameKey: 'templates.coverLetter',
    nameDefault: 'Cover Letter',
    descriptionKey: 'templates.coverLetterDesc',
    descriptionDefault: 'Template for visa application cover letter explaining your trip purpose',
    icon: FileText,
    downloadUrl: '/templates/cover-letter-template.pdf',
    category: 'invitation',
  },
  {
    id: 'travel-itinerary',
    nameKey: 'templates.travelItinerary',
    nameDefault: 'Travel Itinerary',
    descriptionKey: 'templates.travelItineraryDesc',
    descriptionDefault: 'Template for detailed travel itinerary with dates and locations',
    icon: Plane,
    downloadUrl: '/templates/travel-itinerary-template.pdf',
    category: 'accommodation',
  },
];

export default function TemplatesPage() {
  const { t } = useTranslation();

  const handleDownload = (template: Template) => {
    // In production, this would download from backend or CDN
    console.log('[Templates] Downloading template:', template.id);
    // For now, show alert that templates are coming soon
    alert(t('templates.comingSoon', 'Document templates are coming soon! Check back later.'));
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 text-white sm:px-4 sm:py-8 lg:px-8">
      {/* Back Button */}
      <Link
        href="/applications"
        className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        {t('applications.backToApplications', 'Back to Applications')}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          {t('templates.title', 'Document Templates')}
        </h1>
        <p className="mt-2 text-sm text-white/60 sm:text-base">
          {t('templates.subtitle', 'Download sample templates to help you prepare your visa documents')}
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="glass-panel group border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <Icon size={24} className="text-primary" />
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    template.category === 'invitation'
                      ? 'bg-blue-500/20 text-blue-300'
                      : template.category === 'employment'
                      ? 'bg-purple-500/20 text-purple-300'
                      : template.category === 'financial'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {template.category}
                </span>
              </div>

              <h3 className="mb-2 text-lg font-semibold text-white">
                {t(template.nameKey, template.nameDefault)}
              </h3>
              <p className="mb-4 text-sm text-white/60">
                {t(template.descriptionKey, template.descriptionDefault)}
              </p>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload(template)}
                className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Download size={16} />
                <span className="ml-2">{t('templates.download', 'Download Template')}</span>
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="glass-panel mt-8 border border-blue-500/20 bg-blue-500/5 p-6">
        <h3 className="mb-2 text-lg font-semibold text-white">
          {t('templates.howToUse', 'How to use templates')}
        </h3>
        <ul className="space-y-2 text-sm text-white/70">
          <li className="flex gap-2">
            <span className="shrink-0">1.</span>
            <span>{t('templates.step1', 'Download the template that matches your document type')}</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">2.</span>
            <span>{t('templates.step2', 'Fill in your personal information and details')}</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">3.</span>
            <span>{t('templates.step3', 'Save as PDF and upload to your application')}</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">4.</span>
            <span>{t('templates.step4', 'AI will verify your document and provide feedback')}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

