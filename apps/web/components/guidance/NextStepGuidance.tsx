'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Upload, 
  AlertTriangle,
  Sparkles,
  Send,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getRejectionReassurance, getMilestoneMessage } from '@/lib/utils/processingTimes';
import type { Application } from '@/lib/hooks/useApplications';
import type { ApplicationDetail, DocumentChecklist } from '@/lib/hooks/useApplication';

interface NextStepGuidanceProps {
  applications?: Application[];
  application?: ApplicationDetail | null;
  checklist?: DocumentChecklist | null;
  isPollingChecklist?: boolean;
}

/**
 * NextStepGuidance Component
 * 
 * Provides contextual, actionable guidance based on application state.
 * 
 * Logic Mapping:
 * 1. No applications → Guide to start first application
 * 2. Checklist processing → Wait state (AI generating)
 * 3. Checklist ready, all docs pending → Upload required documents
 * 4. Some docs rejected → Fix and re-upload
 * 5. Docs uploaded, pending verification → Review in progress
 * 6. All required verified → Prepare for submission
 * 7. Submitted → Tracking status
 */
export function NextStepGuidance({ 
  applications, 
  application, 
  checklist,
  isPollingChecklist 
}: NextStepGuidanceProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Determine guidance state based on data
  const guidance = determineNextStep(applications, application, checklist, isPollingChecklist);

  if (!guidance) return null;

  const Icon = guidance.icon;
  const urgencyStyles = {
    high: 'border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5',
    medium: 'border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5',
    low: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
    info: 'border-white/10 bg-white/[0.03]',
  };

  return (
    <div className={`rounded-2xl border p-4 sm:p-6 ${urgencyStyles[guidance.urgency]}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              guidance.urgency === 'high' ? 'bg-primary/20 text-primary' :
              guidance.urgency === 'medium' ? 'bg-amber-500/20 text-amber-400' :
              guidance.urgency === 'low' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-white/10 text-white/70'
            }`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                {guidance.category}
              </p>
              <h3 className="text-lg font-semibold text-white sm:text-xl">
                {guidance.title}
              </h3>
            </div>
          </div>
          <p className="text-sm text-white/70 sm:text-base">
            {guidance.description}
          </p>
          {/* Optional reassurance text for sensitive situations */}
          {guidance.helpText && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2">
              <Info size={14} className="text-white/40 mt-0.5 shrink-0" />
              <p className="text-xs text-white/60">
                {guidance.helpText}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {guidance.secondaryAction && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(guidance.secondaryAction!.href)}
              className="border border-white/10 text-white hover:bg-white/10"
            >
              {guidance.secondaryAction.label}
            </Button>
          )}
          {guidance.primaryAction && (
            <Button
              size="sm"
              onClick={() => router.push(guidance.primaryAction!.href)}
              className="bg-primary text-white shadow-lg hover:bg-primary/90"
            >
              {guidance.primaryAction.label}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface GuidanceState {
  category: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low' | 'info';
  icon: any;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  helpText?: string; // Optional reassurance text for sensitive situations
}

function determineNextStep(
  applications?: Application[],
  application?: ApplicationDetail | null,
  checklist?: DocumentChecklist | null,
  isPollingChecklist?: boolean
): GuidanceState | null {
  
  // CASE 1: No applications exist - Guide to start first one
  if (applications !== undefined && applications.length === 0) {
    return {
      category: 'Getting Started',
      title: 'Start your first visa application',
      description: 'Answer a few questions about your travel plans, and we\'ll create a personalized checklist with AI-powered guidance.',
      urgency: 'high',
      icon: Sparkles,
      primaryAction: { label: 'Start Application', href: '/questionnaire' },
      secondaryAction: { label: 'Chat with AI', href: '/chat' },
    };
  }

  // CASE 2: Application detail view cases
  if (application) {
    const appId = application.id;
    const countryName = application.country?.name || 'your destination';
    const visaType = application.visaType?.name || 'visa';

    // CASE 2a: Checklist is being generated
    if (isPollingChecklist || checklist?.status === 'processing') {
      return {
        category: 'Almost Ready',
        title: 'Preparing your personalized checklist',
        description: `We're analyzing official requirements for ${countryName} ${visaType}. This usually takes 10–20 seconds. You don't need to do anything.`,
        urgency: 'info',
        icon: Clock,
      };
    }

    // CASE 2b: Checklist generation failed
    if (checklist?.status === 'failed') {
      return {
        category: 'Quick Fix Needed',
        title: 'Something didn\'t go as expected',
        description: 'We hit a small snag preparing your checklist. Try refreshing the page, or chat with our AI assistant for help.',
        urgency: 'medium',
        icon: AlertTriangle,
        primaryAction: { label: 'Chat with AI', href: `/chat?applicationId=${appId}` },
      };
    }

    // CASE 2c: Checklist ready - analyze document status
    if (checklist?.status === 'ready' && checklist.items) {
      const items = checklist.items;
      const requiredItems = items.filter(item => item.category === 'required');
      const verifiedCount = items.filter(item => item.status === 'verified').length;
      const rejectedCount = items.filter(item => item.status === 'rejected').length;
      const pendingCount = items.filter(item => item.status === 'pending' || !item.status).length;
      const requiredVerifiedCount = requiredItems.filter(item => item.status === 'verified').length;

      // CASE 2c-i: Has rejected documents - highest priority
      if (rejectedCount > 0) {
        return {
          category: 'Small Fix Needed',
          title: `${rejectedCount} document${rejectedCount > 1 ? 's need' : ' needs'} a quick update`,
          description: 'We reviewed your documents and noticed a few need small adjustments. Check the feedback below and upload corrected versions — it's usually an easy fix.',
          urgency: 'high',
          icon: AlertTriangle,
          helpText: getRejectionReassurance(),
          primaryAction: { label: 'See What to Fix', href: `/applications/${appId}#checklist` },
          secondaryAction: { label: 'Ask AI for Help', href: `/chat?applicationId=${appId}` },
        };
      }

      // CASE 2c-ii: All required documents verified
      if (requiredItems.length > 0 && requiredVerifiedCount === requiredItems.length) {
        return {
          category: 'Ready to Proceed',
          title: 'All required documents verified',
          description: `Great job! Your ${countryName} ${visaType} application documents are verified. You can now prepare for submission.`,
          urgency: 'low',
          icon: CheckCircle2,
          primaryAction: { label: 'View Checklist', href: `/applications/${appId}#checklist` },
          secondaryAction: { label: 'Chat with AI', href: `/chat?applicationId=${appId}` },
        };
      }

      // CASE 2c-iii: Some documents uploaded, awaiting verification
      if (verifiedCount > 0 && pendingCount > 0) {
        const milestone = getMilestoneMessage(application.progressPercentage || 0);
        return {
          category: 'Looking Good',
          title: milestone || 'Keep going — you're making progress',
          description: `${verifiedCount} documents approved, ${pendingCount} to go. Upload the remaining documents and we'll review them promptly.`,
          urgency: 'medium',
          icon: Upload,
          primaryAction: { label: 'Continue Uploading', href: `/applications/${appId}#checklist` },
          secondaryAction: { label: 'Ask AI', href: `/chat?applicationId=${appId}` },
        };
      }

      // CASE 2c-iv: Checklist ready, no uploads yet
      if (pendingCount > 0 && verifiedCount === 0) {
        return {
          category: 'Ready to Start',
          title: 'Your personalized checklist is ready',
          description: `We've prepared ${requiredItems.length} documents you'll need for ${countryName} ${visaType}. Upload them when convenient — we'll review each one carefully.`,
          urgency: 'high',
          icon: FileText,
          primaryAction: { label: 'Start Uploading', href: `/applications/${appId}#checklist` },
          secondaryAction: { label: 'Ask AI Questions', href: `/chat?applicationId=${appId}` },
        };
      }
    }

    // CASE 2d: Application submitted
    if (application.status === 'submitted') {
      return {
        category: 'All Set',
        title: 'Application submitted successfully',
        description: `Your ${countryName} ${visaType} application is with the authorities. You'll receive email updates as they review it. Nothing more to do right now.`,
        urgency: 'info',
        icon: Send,
        secondaryAction: { label: 'Chat with AI', href: `/chat?applicationId=${appId}` },
      };
    }

    // CASE 2e: Application approved
    if (application.status === 'approved') {
      return {
        category: 'Approved',
        title: 'Great news — your application was approved!',
        description: `Congratulations! Your ${countryName} ${visaType} has been approved. Check your email for next steps.`,
        urgency: 'low',
        icon: CheckCircle2,
      };
    }

    // CASE 2f: Default for application detail - show current progress
    const milestone = getMilestoneMessage(application.progressPercentage || 0);
    return {
      category: 'In Progress',
      title: milestone || `You're ${application.progressPercentage || 0}% of the way there`,
      description: `Your ${countryName} ${visaType} application is moving along. Keep uploading documents and we'll help you reach 100%.`,
      urgency: 'medium',
      icon: Clock,
      primaryAction: { label: 'Continue', href: `/applications/${appId}#checklist` },
    };
  }

  // CASE 3: Dashboard view - show aggregate guidance
  if (applications && applications.length > 0) {
    const draftApps = applications.filter(app => app.status === 'draft');
    const inProgressApps = applications.filter(app => app.status === 'in_progress');
    
    if (draftApps.length > 0) {
      const app = draftApps[0];
      return {
        category: 'Pick Up Where You Left Off',
        title: 'Your application is waiting for you',
        description: `You have ${draftApps.length} application${draftApps.length > 1 ? 's' : ''} ready to continue. Your progress is saved — jump back in anytime.`,
        urgency: 'medium',
        icon: FileText,
        primaryAction: { label: 'Continue', href: `/applications/${app.id}` },
      };
    }

    if (inProgressApps.length > 0) {
      const app = inProgressApps[0];
      return {
        category: 'You're On Your Way',
        title: 'Keep building momentum',
        description: `You have ${inProgressApps.length} active application${inProgressApps.length > 1 ? 's' : ''}. Upload a few more documents and you'll be closer to done.`,
        urgency: 'medium',
        icon: Upload,
        primaryAction: { label: 'Continue', href: `/applications/${app.id}` },
      };
    }
  }

  return null;
}

