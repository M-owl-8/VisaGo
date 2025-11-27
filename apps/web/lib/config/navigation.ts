export type SupportedLanguage = {
  code: 'en' | 'ru' | 'uz';
  label: string;
  shortLabel: string;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'ru', label: 'Русский', shortLabel: 'RU' },
  { code: 'uz', label: 'O‘zbekcha', shortLabel: 'UZ' },
];

type RouteConfig = {
  href: string;
  labelKey: string;
  descriptionKey?: string;
  icon: 'applications' | 'questionnaire' | 'chat' | 'profile' | 'support';
};

export const PRIMARY_ROUTES: RouteConfig[] = [
  { href: '/applications', labelKey: 'applications.title', icon: 'applications' },
  {
    href: '/questionnaire',
    labelKey: 'applications.startNewApplication',
    descriptionKey: 'applications.quickStartDescription',
    icon: 'questionnaire',
  },
  { href: '/chat', labelKey: 'chat.aiAssistant', icon: 'chat' },
  { href: '/profile', labelKey: 'profile.profile', icon: 'profile' },
  { href: '/support', labelKey: 'helpSupport.title', icon: 'support' },
];

export const STATUS_META: Record<
  string,
  { labelKey: string; bg: string; text: string; border: string }
> = {
  draft: {
    labelKey: 'applications.statusDraft',
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    border: 'border-neutral-200',
  },
  'in progress': {
    labelKey: 'applications.statusInProgress',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  submitted: {
    labelKey: 'applications.statusSubmitted',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  approved: {
    labelKey: 'applications.statusApproved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  ready: {
    labelKey: 'applications.statusReady',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  archived: {
    labelKey: 'applications.statusArchived',
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    border: 'border-neutral-200',
  },
  rejected: {
    labelKey: 'applications.statusRejected',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const getStatusMeta = (status?: string) => {
  if (!status) return STATUS_META.draft;
  const normalized = status.toLowerCase().replace(/_/g, ' ').trim();
  return STATUS_META[normalized] ?? STATUS_META['in progress'];
};
