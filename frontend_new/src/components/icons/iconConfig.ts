/**
 * Icon Configuration
 * Centralized icon name mappings for consistent minimalistic style
 */

import {IconLibrary} from './AppIcon';

export interface IconConfig {
  name: string;
  library: IconLibrary;
}

/**
 * Bottom Tab Icons (22-24px, thin-line)
 */
export const TabIcons = {
  applications: {
    active: {name: 'document-text-outline', library: 'ionicons' as IconLibrary},
    inactive: {
      name: 'document-text-outline',
      library: 'ionicons' as IconLibrary,
    },
  },
  chat: {
    active: {name: 'chatbubble-outline', library: 'ionicons' as IconLibrary},
    inactive: {name: 'chatbubble-outline', library: 'ionicons' as IconLibrary},
  },
  profile: {
    active: {name: 'person-outline', library: 'ionicons' as IconLibrary},
    inactive: {name: 'person-outline', library: 'ionicons' as IconLibrary},
  },
};

/**
 * Profile/Settings Icons (20-22px, thin-line)
 */
export const ProfileIcons = {
  personalInfo: {name: 'person-outline', library: 'ionicons' as IconLibrary},
  language: {name: 'language-outline', library: 'ionicons' as IconLibrary},
  notifications: {
    name: 'notifications-outline',
    library: 'ionicons' as IconLibrary,
  },
  security: {name: 'shield-outline', library: 'ionicons' as IconLibrary},
  help: {name: 'help-circle-outline', library: 'ionicons' as IconLibrary},
  logout: {name: 'log-out-outline', library: 'ionicons' as IconLibrary},
  avatar: {name: 'person-outline', library: 'ionicons' as IconLibrary},
};

/**
 * Header Icons (20px, thin-line)
 */
export const HeaderIcons = {
  back: {name: 'arrow-back', library: 'ionicons' as IconLibrary},
  close: {name: 'close-outline', library: 'ionicons' as IconLibrary},
  menu: {name: 'menu-outline', library: 'ionicons' as IconLibrary},
  search: {name: 'search-outline', library: 'ionicons' as IconLibrary},
  more: {name: 'ellipsis-vertical-outline', library: 'ionicons' as IconLibrary},
};

/**
 * Chat Icons (thin-line)
 */
export const ChatIcons = {
  send: {name: 'send-outline', library: 'ionicons' as IconLibrary},
  ai: {name: 'sparkles-outline', library: 'ionicons' as IconLibrary},
  attachment: {name: 'attach-outline', library: 'ionicons' as IconLibrary},
  microphone: {name: 'mic-outline', library: 'ionicons' as IconLibrary},
  empty: {name: 'chatbubbles-outline', library: 'ionicons' as IconLibrary},
};

/**
 * Document Icons (22px, slightly stronger)
 */
export const DocumentIcons = {
  document: {name: 'document-text-outline', library: 'ionicons' as IconLibrary},
  upload: {name: 'cloud-upload-outline', library: 'ionicons' as IconLibrary},
  download: {name: 'download-outline', library: 'ionicons' as IconLibrary},
  check: {name: 'checkmark-circle-outline', library: 'ionicons' as IconLibrary},
  add: {name: 'add-outline', library: 'ionicons' as IconLibrary},
  folder: {name: 'folder-outline', library: 'ionicons' as IconLibrary},
};

/**
 * Application Icons
 */
export const ApplicationIcons = {
  add: {name: 'add-outline', library: 'ionicons' as IconLibrary},
  chevron: {
    name: 'chevron-forward-outline',
    library: 'ionicons' as IconLibrary,
  },
  calendar: {name: 'calendar-outline', library: 'ionicons' as IconLibrary},
  time: {name: 'time-outline', library: 'ionicons' as IconLibrary},
  info: {
    name: 'information-circle-outline',
    library: 'ionicons' as IconLibrary,
  },
  alert: {name: 'alert-circle-outline', library: 'ionicons' as IconLibrary},
};

/**
 * Admin Panel Icons
 */
export const AdminIcons = {
  admin: {
    active: {name: 'settings-outline', library: 'ionicons' as IconLibrary},
    inactive: {name: 'settings-outline', library: 'ionicons' as IconLibrary},
  },
};

/**
 * Status Icons
 */
export const StatusIcons = {
  success: {
    name: 'checkmark-circle-outline',
    library: 'ionicons' as IconLibrary,
  },
  error: {name: 'close-circle-outline', library: 'ionicons' as IconLibrary},
  warning: {name: 'warning-outline', library: 'ionicons' as IconLibrary},
  info: {
    name: 'information-circle-outline',
    library: 'ionicons' as IconLibrary,
  },
};

/**
 * Quick Action Icons (for chat quick actions)
 */
export const QuickActionIcons = {
  documents: {
    name: 'document-text-outline',
    library: 'ionicons' as IconLibrary,
  },
  timeline: {name: 'time-outline', library: 'ionicons' as IconLibrary},
  requirements: {name: 'cash-outline', library: 'ionicons' as IconLibrary},
  mistakes: {name: 'warning-outline', library: 'ionicons' as IconLibrary},
};
