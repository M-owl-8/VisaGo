'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/lib/stores/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function normalizeRole(role: string | undefined | null): 'user' | 'admin' | 'super_admin' {
  if (!role) return 'user';
  const lower = role.toLowerCase().trim();
  if (lower === 'super_admin' || lower === 'superadmin') return 'super_admin';
  if (lower === 'admin') return 'admin';
  return 'user';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout, isLoading, fetchUserProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop-only warning for small screens (must not be conditional; hooks must run every render)
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdminAccess = async () => {
      // Wait for auth store to initialize
      if (isLoading) {
        return;
      }

      // If no user, redirect to login
      if (!user) {
        if (isMounted) {
          router.push('/login');
        }
        return;
      }

      // Check role from current user first (fast path)
      const currentUser = useAuthStore.getState().user;
      const role = normalizeRole(currentUser?.role);

      // If already admin, allow access immediately
      if (role === 'admin' || role === 'super_admin') {
        if (isMounted) {
          setIsChecking(false);
        }
        return;
      }

      // If not admin, try fetching latest profile to ensure role is up to date
      // Use a timeout to prevent infinite waiting
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          // Timeout: check current role and proceed if admin, otherwise redirect
          const finalUser = useAuthStore.getState().user;
          const finalRole = normalizeRole(finalUser?.role);
          if (finalRole === 'admin' || finalRole === 'super_admin') {
            setIsChecking(false);
          } else {
            router.push('/applications');
          }
        }
      }, 5000); // 5 second timeout

      try {
        await fetchUserProfile();
        clearTimeout(timeoutId);
        
        if (!isMounted) return;

        // Re-check role after profile fetch
        const updatedUser = useAuthStore.getState().user;
        const updatedRole = normalizeRole(updatedUser?.role);

        if (updatedRole !== 'admin' && updatedRole !== 'super_admin') {
          // Still not an admin, redirect to dashboard
          router.push('/applications');
          return;
        }

        setIsChecking(false);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to fetch user profile:', error);
        
        if (!isMounted) return;

        // On error, check current role and proceed if admin
        const errorUser = useAuthStore.getState().user;
        const errorRole = normalizeRole(errorUser?.role);
        if (errorRole === 'admin' || errorRole === 'super_admin') {
          setIsChecking(false);
        } else {
          // Not admin and fetch failed, redirect
          router.push('/applications');
        }
      }
    };

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  // Track screen size for desktop-only admin panel
  useEffect(() => {
    // (Client component, but keep it safe)
    if (typeof window === 'undefined') return;
    const checkScreenSize = () => {
      setShowMobileWarning(window.innerWidth < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Show loading state while checking
  if (isChecking || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-white/70">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // If no user or not admin, don't render (redirect is happening)
  if (!user) {
    return null;
  }

  const role = normalizeRole(user.role);
  if (role !== 'admin' && role !== 'super_admin') {
    return null;
  }

  if (showMobileWarning) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-midnight px-4">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20">
              <svg className="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-white">
            {t('admin.desktopOnly', 'Desktop Only')}
          </h1>
          <p className="mb-6 text-white/60">
            {t('admin.desktopOnlyMessage', 'The admin panel is optimized for desktop screens. Please use a device with a larger screen or increase your browser window size.')}
          </p>
          <button
            onClick={() => router.push('/applications')}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90"
          >
            {t('admin.goToApplications', 'Go to Applications')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-midnight overflow-x-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {/* Mobile Drawer */}
          <div
            className="fixed left-0 top-0 h-full w-72 bg-midnight shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="text-lg font-semibold text-white">
                {t('admin.panelTitle', 'Admin Panel')}
              </h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <AdminSidebar onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {/* Mobile Header - Visible only on mobile */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-midnight/90 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-base font-semibold text-white">
              {t('admin.panelTitle', 'Admin Panel')}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </header>

        {/* Desktop Header - Hidden on mobile */}
        <header className="sticky top-0 z-30 hidden border-b border-white/10 bg-midnight/90 backdrop-blur-sm lg:block">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <div>
              <h1 className="text-lg font-semibold text-white">
                {t('admin.panelTitle', 'Admin Panel')}
              </h1>
              <p className="text-xs text-white/60">
                {user.firstName} {user.lastName} ({user.email})
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <LogOut size={16} className="mr-2" />
              {t('profile.logout', 'Logout')}
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

