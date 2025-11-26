import {useAuthStore} from '../store/auth';

/**
 * Hook to check if the current user is an admin or super admin
 * @returns true if user has 'admin' or 'super_admin' role, false otherwise
 */
export function useIsAdmin(): boolean {
  const user = useAuthStore(state => state.user);
  const role = user?.role;
  return role === 'admin' || role === 'super_admin';
}
