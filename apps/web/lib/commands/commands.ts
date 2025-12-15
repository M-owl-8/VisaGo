import { Home, Plus, MessageCircle, User, FileText, Settings, HelpCircle } from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  keywords: string[];
  category: 'navigation' | 'actions' | 'settings';
  icon: any;
  action: () => void;
  shortcut?: string;
}

export function getCommands(router: any, t: any): Command[] {
  return [
    // Navigation
    {
      id: 'nav-applications',
      label: t('commands.goToApplications', 'Go to Applications'),
      keywords: ['applications', 'dashboard', 'home'],
      category: 'navigation',
      icon: Home,
      action: () => router.push('/applications'),
      shortcut: 'G then A',
    },
    {
      id: 'nav-chat',
      label: t('commands.goToChat', 'Go to AI Assistant'),
      keywords: ['chat', 'ai', 'assistant', 'help'],
      category: 'navigation',
      icon: MessageCircle,
      action: () => router.push('/chat'),
      shortcut: 'G then C',
    },
    {
      id: 'nav-profile',
      label: t('commands.goToProfile', 'Go to Profile'),
      keywords: ['profile', 'settings', 'account'],
      category: 'navigation',
      icon: User,
      action: () => router.push('/profile'),
      shortcut: 'G then P',
    },
    {
      id: 'nav-templates',
      label: t('commands.goToTemplates', 'Go to Templates'),
      keywords: ['templates', 'documents', 'samples'],
      category: 'navigation',
      icon: FileText,
      action: () => router.push('/templates'),
      shortcut: 'G then T',
    },

    // Actions
    {
      id: 'action-new-application',
      label: t('commands.startNewApplication', 'Start New Application'),
      keywords: ['new', 'create', 'application', 'start'],
      category: 'actions',
      icon: Plus,
      action: () => router.push('/questionnaire'),
      shortcut: 'Cmd+N',
    },

    // Settings
    {
      id: 'settings-help',
      label: t('commands.viewHelp', 'View Help & Support'),
      keywords: ['help', 'support', 'faq', 'guide'],
      category: 'settings',
      icon: HelpCircle,
      action: () => router.push('/support'),
      shortcut: 'Cmd+/',
    },
  ];
}

export function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) return commands;

  const lowerQuery = query.toLowerCase();
  
  return commands.filter((command) => {
    const labelMatch = command.label.toLowerCase().includes(lowerQuery);
    const keywordsMatch = command.keywords.some((keyword) =>
      keyword.toLowerCase().includes(lowerQuery)
    );
    return labelMatch || keywordsMatch;
  });
}

