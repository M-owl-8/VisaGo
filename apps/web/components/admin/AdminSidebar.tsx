'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/applications', label: 'Applications', icon: FileText },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/documents', label: 'Documents', icon: FileCheck },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/activity-logs', label: 'Activity Logs', icon: Activity },
  { href: '/admin/ai-interactions', label: 'AI Interactions', icon: Brain },
  { href: '/admin/visa-rules', label: 'Visa Rules', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-midnight/90 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
          <p className="mt-1 text-xs text-white/60">System Management</p>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={16} className="shrink-0" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

