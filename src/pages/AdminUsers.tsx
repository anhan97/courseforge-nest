import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../components/AppLayout';
import { CreateUserModal } from '../components/CreateUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { AssignCoursesModal } from '../components/AssignCoursesModal';
import { UserEnrollmentsModal } from '../components/UserEnrollmentsModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../hooks/use-toast';
import { apiClient, User } from '../lib/api';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  BookOpen,
  UserCheck,
  UserX,
  Filter,
  MoreVertical,
  Calendar,
  Mail,
  Shield,
  GraduationCap
} from 'lucide-react';

interface UserFilters {
  search: string;
  role: string;
  status: string;
  page: number;
  limit: number;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    page: 1,
    limit: 10
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [enrollmentsModalOpen, setEnrollmentsModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'primary';
    loading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, [filters]);

  // Debounced search effect for AdminUsers
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getAdminUsers({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? filters.status : undefined
      });

      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setPagination(response.data.pagination || { total: 0, page: 1, limit: 10, pages: 0 });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.id));
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, loading: true }));
        try {
          const response = await apiClient.deleteUser(user.id);
          if (response.success) {
            toast({
              title: 'Success',
              description: 'User deleted successfully'
            });
            loadUsers();
            setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
          } else {
            toast({
              title: 'Error',
              description: response.error || 'Failed to delete user',
              variant: 'destructive'
            });
            setConfirmDialog(prev => ({ ...prev, loading: false }));
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to delete user',
            variant: 'destructive'
          });
          setConfirmDialog(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const response = await apiClient.updateUserStatus(user.id, !user.isActive);
      if (response.success) {
        toast({
          title: 'Success',
          description: `User ${!user.isActive ? 'activated' : 'deactivated'} successfully`
        });
        loadUsers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update user status',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive'
      });
    }
  };

  const handleAssignCourses = () => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one user',
        variant: 'destructive'
      });
      return;
    }
    setAssignModalOpen(true);
  };

  const handleViewEnrollments = (user: User) => {
    setViewingUser(user);
    setEnrollmentsModalOpen(true);
  };

  const getSelectedUsersData = () => {
    return users.filter(user => selectedUsers.includes(user.id));
  };

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <GraduationCap className="w-3 h-3 mr-1" />
        Student
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <UserCheck className="w-3 h-3 mr-1" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <UserX className="w-3 h-3 mr-1" />
        Inactive
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AppLayout sidebarType="admin">
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white shadow-sm border-b mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="mt-2 text-gray-600">Manage users, roles, and course assignments</p>
              </div>
              <div className="flex space-x-3">
                {selectedUsers.length > 0 && (
                  <button
                    onClick={handleAssignCourses}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Assign Courses ({selectedUsers.length})
                  </button>
                )}
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per Page</label>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value), page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading users...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Enrollments
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getRoleBadge(user.role)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-1">
                              {getStatusBadge(user.isActive)}
                              {user.isVerified ? (
                                <span className="text-xs text-green-600">Verified</span>
                              ) : (
                                <span className="text-xs text-yellow-600">Unverified</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {user._count?.enrollments || 0} courses
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewEnrollments(user)}
                                className="text-green-600 hover:text-green-800"
                                title="View Course Access"
                              >
                                <BookOpen className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit User"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                className={`${user.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                                title={user.isActive ? 'Deactivate User' : 'Activate User'}
                              >
                                {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} results
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                          disabled={filters.page <= 1}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-2 text-sm text-gray-700">
                          Page {pagination.page} of {pagination.pages}
                        </span>
                        <button
                          onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                          disabled={filters.page >= pagination.pages}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {users.length === 0 && !loading && (
                  <div className="p-8 text-center text-gray-500">
                    No users found matching your criteria.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onUserCreated={() => {
          loadUsers();
          setCreateModalOpen(false);
        }}
      />

      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingUser(null);
        }}
        onUserUpdated={() => {
          loadUsers();
          setEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
      />

      <AssignCoursesModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssignmentComplete={() => {
          loadUsers();
          setAssignModalOpen(false);
          setSelectedUsers([]);
        }}
        selectedUsers={getSelectedUsersData()}
      />

      <UserEnrollmentsModal
        isOpen={enrollmentsModalOpen}
        onClose={() => {
          setEnrollmentsModalOpen(false);
          setViewingUser(null);
        }}
        user={viewingUser}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Delete"
        confirmVariant={confirmDialog.variant}
        loading={confirmDialog.loading}
      />
    </AppLayout>
  );
}