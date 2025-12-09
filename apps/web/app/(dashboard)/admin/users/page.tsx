'use client';

import { useEffect, useState } from 'react';
import { adminApi, UserData } from '@/lib/api/admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getUsers({ skip: page * pageSize, take: pageSize });
      setUsers(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
      console.error('Users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      setUpdating(true);
      await adminApi.updateUserRole(selectedUser.id, newRole);
      await loadUsers();
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole('');
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const openRoleModal = (user: UserData) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setShowRoleModal(true);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/60 mt-1">Manage user accounts and roles</p>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(0);
          }}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          <p>{error}</p>
        </div>
      )}

      <Card className="bg-white/5 border-white/10">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Role</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Applications</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Total Spent</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Created</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/80">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => roleFilter === 'all' || u.role === roleFilter)
                  .map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-white">
                        {user.firstName || user.lastName
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : 'N/A'}
                      </td>
                      <td className="p-4 text-white/80">{user.email}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'super_admin'
                              ? 'bg-purple-500/20 text-purple-300'
                              : user.role === 'admin'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4 text-white/80">{user.applicationCount}</td>
                      <td className="p-4 text-white/80">${user.totalSpent.toFixed(2)}</td>
                      <td className="p-4 text-white/60 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Button
                          size="sm"
                          onClick={() => openRoleModal(user)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Change Role
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <p className="text-sm text-white/60">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} users
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
          setNewRole('');
        }}
        title="Change User Role"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-white/60 mb-2">User: {selectedUser?.email}</p>
            <label className="block text-sm font-medium text-white mb-2">New Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
                setNewRole('');
              }}
              className="bg-white/10 hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updating || !newRole}
              className="bg-primary hover:bg-primary/90"
            >
              {updating ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

