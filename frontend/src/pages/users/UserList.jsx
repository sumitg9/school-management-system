import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useSchool } from '../../context/SchoolContext';
import { userAPI } from '../../services/api';
import { SYSTEM_ROLES } from '../../utils/permissionRules';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

const UserList = () => {
  const { user: currentUser, activeRole, isSuperAdmin, hasPermission } = useAuth();
  const { activeSchoolId, currentSchool } = useSchool();
  const { formatDate } = useSettings();
  const confirm = useConfirm();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    superAdmin: 0,
    admin: 0,
    teacher: 0,
    student: 0,
    parent: 0,
    finance: 0,
    backOffice: 0,
    general: 0,
    active: 0,
    inactive: 0,
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'teacher',
    status: 'active',
    gender: 'male',
    address: '',
    city: '',
    password: '',
  });

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const canManageUsers = isSuperAdmin() || hasPermission('manage-users');

  // Load users from API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAll({
        search: searchQuery,
        role: selectedRoleFilter,
        status: selectedStatusFilter,
        per_page: 'all',
        school_id: activeSchoolId,
      });
      if (res && res.data) {
        setUsers(res.data);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, selectedRoleFilter, selectedStatusFilter, activeSchoolId]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'teacher',
      status: 'active',
      gender: 'male',
      address: '',
      city: '',
      password: 'password123',
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (targetUser) => {
    setEditingUser(targetUser);
    setFormData({
      name: targetUser.name || '',
      email: targetUser.email || '',
      phone: targetUser.phone || '',
      role: targetUser.role || targetUser.roles?.[0] || 'student',
      status: targetUser.status || 'active',
      gender: targetUser.gender || 'male',
      address: targetUser.address || '',
      city: targetUser.city || '',
      password: '',
    });
    setIsFormModalOpen(true);
  };

  // Open Reset Password Modal
  const handleOpenPasswordModal = (targetUser) => {
    setPasswordTargetUser(targetUser);
    setNewPassword('');
    setShowPassword(false);
    setIsPasswordModalOpen(true);
  };

  // Form Field Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Generate a random temporary password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // Handle Create or Update User Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.warning('Full Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      toast.warning('Email address is required.');
      return;
    }
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      toast.warning('Initial password must be at least 6 characters.');
      return;
    }

    // Role safety guard: only Super Admin can assign Super Admin
    if (formData.role === 'super-admin' && !isSuperAdmin()) {
      toast.error('Only a Super Admin can assign the Super Admin role.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUser) {
        await userAPI.update(editingUser.id, formData);
        toast.success(`User "${formData.name}" updated successfully!`);
      } else {
        await userAPI.create(formData);
        toast.success(`User "${formData.name}" created successfully!`);
      }
      setIsFormModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Password Reset Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await userAPI.resetPassword(passwordTargetUser.id, newPassword);
      toast.success(`Password for ${passwordTargetUser.name} has been updated.`);
      setIsPasswordModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (targetUser) => {
    if (String(targetUser.id) === String(currentUser?.id)) {
      toast.warning('You cannot delete your own active account.');
      return;
    }
    if (targetUser.email === 'superadmin@school.com') {
      toast.error('The primary root Super Admin account cannot be deleted.');
      return;
    }
    if (targetUser.role === 'super-admin' && !isSuperAdmin()) {
      toast.error('Only a Super Admin can delete another Super Admin.');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Delete User Account?',
      message: `Are you sure you want to permanently delete "${targetUser.name}" (${targetUser.email})? This action cannot be undone.`,
      confirmText: 'Yes, Delete User',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await userAPI.delete(targetUser.id, currentUser);
      toast.success(`User "${targetUser.name}" was successfully removed.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user.');
    }
  };

  // Filtered & Paginated Users
  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const from = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(from, from + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const getRoleDetails = (roleId) => {
    return SYSTEM_ROLES.find(r => r.id === roleId) || {
      id: roleId,
      name: roleId,
      badge: `👤 ${roleId}`,
      badgeVariant: 'default',
    };
  };

  return (
    <div className="px-[15px] py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-blue-50 rounded-2xl text-blue-600 shadow-xs">👥</span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
                {currentSchool && (
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    📍 {currentSchool.shortName || currentSchool.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage system users, assign access roles, and control administrative clearances
              </p>
            </div>
          </div>
        </div>

        {canManageUsers && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-sm hover:shadow transition gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New User</span>
          </button>
        )}
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <p className="text-xs font-medium text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          <span className="text-xs text-blue-600 font-medium">All registered</span>
        </div>
        <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100 shadow-xs">
          <p className="text-xs font-medium text-purple-700">Super Admins</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{stats.superAdmin}</p>
          <span className="text-xs text-purple-600 font-medium">👑 Root Access</span>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 shadow-xs">
          <p className="text-xs font-medium text-blue-700">Administrators</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.admin}</p>
          <span className="text-xs text-blue-600 font-medium">🛡️ Management</span>
        </div>
        <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 shadow-xs">
          <p className="text-xs font-medium text-indigo-700">Teachers</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.teacher}</p>
          <span className="text-xs text-indigo-600 font-medium">👨‍🏫 Faculty</span>
        </div>
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 shadow-xs">
          <p className="text-xs font-medium text-emerald-700">Students</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.student}</p>
          <span className="text-xs text-emerald-600 font-medium">👨‍🎓 Enrolled</span>
        </div>
        <div className="bg-green-50/60 p-4 rounded-xl border border-green-100 shadow-xs">
          <p className="text-xs font-medium text-green-700">Active Status</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
          <span className="text-xs text-green-600 font-medium">🟢 Enabled</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search name, email, phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Role:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              {SYSTEM_ROLES.map(r => (
                <option key={r.id} value={r.id}>{r.badge}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {(searchQuery || selectedRoleFilter !== 'all' || selectedStatusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRoleFilter('all');
                setSelectedStatusFilter('all');
                setCurrentPage(1);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-500">Loading user accounts...</p>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-12 text-center">
            <span className="text-4xl block mb-2">🔍</span>
            <h3 className="text-lg font-bold text-gray-800">No Users Found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              No user accounts match your current filters. Try searching with different terms or reset your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Contact Info</th>
                  <th className="px-6 py-4 font-semibold">Assigned Role</th>
                  <th className="px-6 py-4 font-semibold">Account Status</th>
                  <th className="px-6 py-4 font-semibold">Joined Date</th>
                  {canManageUsers && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.map((item) => {
                  const roleMeta = getRoleDetails(item.role);
                  const isCurrent = String(item.id) === String(currentUser?.id);
                  const isRootSuperAdmin = item.email === 'superadmin@school.com';

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* User Identity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                            {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{item.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">You</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 block">{item.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium block">{item.phone || '—'}</span>
                        <span className="text-xs text-gray-400">{item.city || 'Location N/A'}</span>
                      </td>

                      {/* Assigned Role */}
                      <td className="px-6 py-4">
                        <Badge variant={roleMeta.badgeVariant || 'primary'} size="sm">
                          {roleMeta.badge}
                        </Badge>
                        {item.role === 'parent' && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <span>👨‍👩‍👧</span>
                              {item.email === 'suresh.sharma@parent.school.com'
                                ? '2 Children (Aarav, Diya)'
                                : item.email === 'raj.agarwal@parent.school.com'
                                  ? '1 Child (Aarushi)'
                                  : 'Parent User'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                          {item.status ? (item.status.charAt(0).toUpperCase() + item.status.slice(1)) : 'Active'}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {item.created_at ? formatDate(item.created_at) : 'Oct 12, 2025'}
                      </td>

                      {/* Actions */}
                      {canManageUsers && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleOpenPasswordModal(item)}
                              title="Reset Password"
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            >
                              <span className="text-sm">🔑</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit User Details"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteUser(item)}
                              disabled={isCurrent || isRootSuperAdmin}
                              title={
                                isCurrent
                                  ? 'You cannot delete yourself'
                                  : isRootSuperAdmin
                                  ? 'Primary Super Admin cannot be deleted'
                                  : 'Delete User'
                              }
                              className={`p-1.5 rounded-lg transition ${
                                isCurrent || isRootSuperAdmin
                                  ? 'text-gray-200 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredUsers.length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-gray-800">
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
              </span>{' '}
              of <span className="font-semibold text-gray-800">{filteredUsers.length}</span> users
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                    currentPage === p
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !submitting && setIsFormModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.name}` : 'Create New User & Assign Role'}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g. Anand K. Verma"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={Boolean(editingUser)}
                placeholder="username@school.com"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {editingUser && (
                <span className="text-[11px] text-gray-400 mt-0.5 block">Email cannot be changed after creation</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Role Assignment */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Assigned Role <span className="text-rose-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                disabled={editingUser?.email === 'superadmin@school.com'}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100"
              >
                {SYSTEM_ROLES.map(r => {
                  const isRoleDisabled = r.id === 'super-admin' && !isSuperAdmin();
                  return (
                    <option key={r.id} value={r.id} disabled={isRoleDisabled}>
                      {r.badge} {isRoleDisabled ? '(Super Admin Only)' : ''}
                    </option>
                  );
                })}
              </select>
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                {SYSTEM_ROLES.find(r => r.id === formData.role)?.description || 'Standard role'}
              </span>
            </div>
          </div>

          {formData.role === 'parent' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>👨‍👩‍👧</span>
                <span>Multi-Child Verification Engine</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Parent users are automatically associated with all students whose records match this parent's Name (vs Father/Mother), Contact Phone Number, Email, or Address.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Account Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="active">Active (Access Enabled)</option>
                <option value="inactive">Inactive (Suspended)</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Initial Password (if creating new user) */}
          {!editingUser && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, password: generateRandomPassword() }))}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  🎲 Generate Random
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                The user can change this password after logging into their profile.
              </p>
            </div>
          )}

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Residential Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street name, colony, locality"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="e.g. New Delhi"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => !submitting && setIsPasswordModalOpen(false)}
        title={`Reset Password: ${passwordTargetUser?.name || 'User'}`}
        size="sm"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4 p-6">
          <p className="text-xs text-gray-500">
            Enter a new password for account <strong>{passwordTargetUser?.email}</strong>.
          </p>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase">
                New Password <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setNewPassword(generateRandomPassword())}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                🎲 Random
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow transition disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Set Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserList;

