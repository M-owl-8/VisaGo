'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { LogOut } from 'lucide-react';
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
  const { user, logout, isLoading, fetchUserProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Wait for auth store to initialize
      if (isLoading) {
        return;
      }

      // If no user, redirect to login
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch latest user profile to ensure role is up to date
      try {
        await fetchUserProfile();
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }

      // Check role after profile fetch
      const currentUser = useAuthStore.getState().user;
      const role = normalizeRole(currentUser?.role);

      if (role !== 'admin' && role !== 'super_admin') {
        // Not an admin, redirect to dashboard
        router.push('/applications');
        return;
      }

      setIsChecking(false);
    };

    checkAdminAccess();
  }, [user, isLoading, router, fetchUserProfile]);

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
          <p className="text-white/70">Checking access...</p>
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

  return (
    <div className="flex min-h-screen bg-midnight">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-midnight/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
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
              Logout
            </Button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

