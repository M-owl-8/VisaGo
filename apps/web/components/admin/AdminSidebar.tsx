'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  FileText, 
  CreditCard, 
  FileCheck, 
  BarChart3, 
  Activity,
  Brain,
  Settings,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  labelKey: string;
  labelDefault: string;
  icon: LucideIcon;
}

interface AdminSidebarProps {
  onNavigate?: () => void;
}

const navItems: NavItem[] = [
  { href: '/admin/users', labelKey: 'admin.users', labelDefault: 'Users', icon: Users },
  { href: '/admin/applications', labelKey: 'admin.applications', labelDefault: 'Applications', icon: FileText },
  { href: '/admin/payments', labelKey: 'admin.payments', labelDefault: 'Payments', icon: CreditCard },
  { href: '/admin/documents', labelKey: 'admin.documents', labelDefault: 'Documents', icon: FileCheck },
  { href: '/admin/analytics', labelKey: 'admin.analytics', labelDefault: 'Analytics', icon: BarChart3 },
  { href: '/admin/activity-logs', labelKey: 'admin.activityLogs', labelDefault: 'Activity Logs', icon: Activity },
  { href: '/admin/ai-interactions', labelKey: 'admin.aiInteractions', labelDefault: 'AI Interactions', icon: Brain },
  { href: '/admin/visa-rules', labelKey: 'admin.visaRules', labelDefault: 'Visa Rules', icon: Settings },
];

export default function AdminSidebar({ onNavigate }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-midnight/90 backdrop-blur-sm lg:w-64">
      <div className="flex h-full flex-col">
        {/* Desktop Header - Hidden on mobile (mobile has its own header in layout) */}
        <div className="hidden border-b border-white/10 p-6 lg:block">
          <h2 className="text-lg font-semibold text-white">
            {t('admin.panelTitle', 'Admin Panel')}
          </h2>
          <p className="mt-1 text-xs text-white/60">
            {t('admin.systemManagement', 'System Management')}
          </p>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className="flex-1">{t(item.labelKey, item.labelDefault)}</span>
                {isActive && <ChevronRight size={16} className="shrink-0" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

