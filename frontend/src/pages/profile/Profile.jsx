import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { SYSTEM_ROLES, PERMISSION_MODULES, hasRolePermission } from '../../utils/permissionRules';
import { authAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const Profile = () => {
  const navigate = useNavigate();
  const { user, activeRole, currentStudent, studentLoading, updateProfileData, hasPermission } = useAuth();
  const { formatDate, settings } = useSettings();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'permissions' | 'edit' | 'security'
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile Edit Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergency_contact: '',
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Sync profileForm with user or currentStudent
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || (currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : ''),
        email: user.email || '',
        phone: user.phone || currentStudent?.parent_phone || currentStudent?.emergency_contact || '',
        bio: user.bio || (currentStudent ? `Enrolled student in ${currentStudent.class?.name || 'Class 10'}` : 'Staff member at ' + (settings?.school_name || 'SMS')),
        address: user.address || currentStudent?.address || '123 Education Boulevard, Institutional Area',
        city: user.city || currentStudent?.city || 'New Delhi',
        state: user.state || currentStudent?.state || 'Delhi',
        pincode: user.pincode || currentStudent?.pincode || '110001',
        emergency_contact: user.emergency_contact || currentStudent?.emergency_contact || '+91 98765 43210',
      });
    }
  }, [user, currentStudent, settings?.school_name]);

  const roleMeta = SYSTEM_ROLES.find(r => r.id === activeRole) || {
    id: activeRole || 'student',
    name: 'User',
    badge: '👤 User',
    description: 'School Management User',
    color: 'blue',
  };

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit Profile Edits
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.warning('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      if (updateProfileData) {
        await updateProfileData({
          name: profileForm.name,
          phone: profileForm.phone,
          bio: profileForm.bio,
          address: profileForm.address,
          city: profileForm.city,
          state: profileForm.state,
          pincode: profileForm.pincode,
          emergency_contact: profileForm.emergency_contact,
        });
      }
      toast.success('Profile details updated successfully! 🎉');
      setActiveTab('overview');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingProfile(false);
    }
  };

  // Submit Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password.length < 6) {
      toast.warning('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword({ password: passwordForm.new_password });
      toast.success('Password updated successfully! Please use your new password next time.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setActiveTab('overview');
    } catch (err) {
      console.error('Password change error:', err);
      toast.error('Failed to update password: ' + (err.message || 'Please verify credentials'));
    } finally {
      setChangingPassword(false);
    }
  };

  const isStudentRole = activeRole === 'student';
  const isTeacherRole = activeRole === 'teacher';
  const isAdminRole = activeRole === 'admin' || activeRole === 'super-admin';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="hover:text-blue-600 transition cursor-pointer"
        >
          Home
        </button>
        <span>/</span>
        <span className="text-gray-900 font-semibold">User Profile</span>
      </div>

      {/* Hero Cover & Profile Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Cover Gradient Banner */}
        <div className="h-44 bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 relative p-6 flex items-start justify-between">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold">
            <span>🏫</span>
            <span>{settings?.school_name || 'Delhi Public School'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>✏️</span>
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔑</span>
              <span>Security</span>
            </button>
          </div>
        </div>

        {/* Profile Info Row with Floating Avatar */}
        <div className="px-6 md:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Large Avatar */}
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-4xl shadow-xl border-4 border-white">
                  {profileForm.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] shadow" title="Active Account">
                  ✓
                </div>
              </div>

              {/* Name & Role Meta */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    {profileForm.name || user?.name || 'Authorized User'}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {roleMeta.badge}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ● Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono flex items-center gap-3 flex-wrap">
                  <span>✉️ {profileForm.email || user?.email || 'user@schoolsms.edu'}</span>
                  {profileForm.phone && <span>📞 {profileForm.phone}</span>}
                  <span>🆔 User ID: #{user?.id || '101'}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Badges */}
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-3 py-1.5 rounded-xl border border-gray-200">
                Institutional Member
              </span>
            </div>
          </div>

          {/* Quick Stats Grid based on user role */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-4 border-t border-gray-100">
            {isStudentRole ? (
              <>
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Assigned Class</span>
                  <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">
                    {currentStudent?.class?.name || (currentStudent?.class_id ? `Class ${currentStudent.class_id}` : 'Class 10')}
                  </span>
                </div>
                <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Class Section</span>
                  <span className="text-base font-black text-purple-950 font-mono mt-0.5 block">
                    {currentStudent?.section?.name || (currentStudent?.section_id ? `Section ${currentStudent.section_id}` : 'Section A')}
                  </span>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Admission No</span>
                  <span className="text-base font-black text-emerald-950 font-mono mt-0.5 block">
                    {currentStudent?.admission_number || 'ADM-2024-001'}
                  </span>
                </div>
                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Roll Number</span>
                  <span className="text-base font-black text-amber-950 font-mono mt-0.5 block">
                    {currentStudent?.roll_number || '101'}
                  </span>
                </div>
              </>
            ) : isTeacherRole ? (
              <>
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Department</span>
                  <span className="text-base font-black text-indigo-950 mt-0.5 block">Faculty of Sciences</span>
                </div>
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Designation</span>
                  <span className="text-base font-black text-blue-950 mt-0.5 block">Senior Teacher</span>
                </div>
                <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Assigned Classes</span>
                  <span className="text-base font-black text-purple-950 font-mono mt-0.5 block">Scoped Classes</span>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Status</span>
                  <span className="text-base font-black text-emerald-950 mt-0.5 block">Active Faculty</span>
                </div>
              </>
            ) : isAdminRole ? (
              <>
                <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Authority Tier</span>
                  <span className="text-base font-black text-purple-950 mt-0.5 block">Root Administrator</span>
                </div>
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">System Modules</span>
                  <span className="text-base font-black text-blue-950 font-mono mt-0.5 block">11 Modules Unlocked</span>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Security Clearance</span>
                  <span className="text-base font-black text-emerald-950 mt-0.5 block">Full Root Access</span>
                </div>
                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Platform Mode</span>
                  <span className="text-base font-black text-amber-950 mt-0.5 block">Super Admin</span>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Staff Department</span>
                  <span className="text-base font-black text-gray-900 mt-0.5 block">Administration</span>
                </div>
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Role Type</span>
                  <span className="text-base font-black text-blue-950 mt-0.5 block">{roleMeta.name}</span>
                </div>
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Account Status</span>
                  <span className="text-base font-black text-emerald-950 mt-0.5 block">Verified</span>
                </div>
                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3.5">
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Clearance</span>
                  <span className="text-base font-black text-amber-950 mt-0.5 block">Standard</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>👤</span>
          <span>Overview & Bio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'permissions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>🛡️</span>
          <span>Role & Permissions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'edit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>✏️</span>
          <span>Edit Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span>🔑</span>
          <span>Security & Password</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW & PERSONAL INFORMATION                    */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Personal & Contact Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Details Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📋</span>
                  <span>Personal & Institutional Information</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  Edit Information →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">Full Legal Name</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                    {profileForm.name || 'Not Specified'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">Official Email</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block font-mono">
                    {profileForm.email || 'user@schoolsms.edu'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">Phone Number</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block font-mono">
                    {profileForm.phone || '+91 98765 43210'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">Emergency Contact</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block font-mono">
                    {profileForm.emergency_contact || '+91 98765 43210'}
                  </span>
                </div>

                {isStudentRole && (
                  <>
                    <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                      <span className="text-gray-500 block">Gender</span>
                      <span className="font-bold text-gray-900 text-sm mt-0.5 block capitalize">
                        {currentStudent?.gender || 'Male'}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                      <span className="text-gray-500 block">Date of Birth</span>
                      <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                        {currentStudent?.date_of_birth ? formatDate(currentStudent.date_of_birth) : '15 Aug 2010'}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                      <span className="text-gray-500 block">Blood Group</span>
                      <span className="font-bold text-red-700 text-sm mt-0.5 block">
                        {currentStudent?.blood_group || 'O+'}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                      <span className="text-gray-500 block">Parent / Guardian Name</span>
                      <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                        {currentStudent?.parent_name || currentStudent?.guardian_name || 'Mr. Rajesh Sharma'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Address & Residence Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>📍</span>
                  <span>Residential Address</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2 p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">Street Address</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">
                    {profileForm.address || '123 Education Boulevard, Institutional Area'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">City</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">
                    {profileForm.city || 'New Delhi'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">State / Province</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">
                    {profileForm.state || 'Delhi'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">Pin / Postal Code</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block font-mono">
                    {profileForm.pincode || '110001'}
                  </span>
                </div>

                <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block">Country</span>
                  <span className="font-semibold text-gray-900 mt-0.5 block">
                    India
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Bio & Institutional Role Card */}
          <div className="space-y-6">
            {/* Bio Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span>💬</span>
                <span>About / Biography</span>
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed italic bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                "{profileForm.bio || 'Dedicated member of the school community, actively engaged in academic excellence and school development.'}"
              </p>
            </div>

            {/* Institutional Membership Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎓</span>
                <div>
                  <h4 className="text-sm font-bold text-indigo-950">
                    {settings?.school_name || 'Delhi Public School'}
                  </h4>
                  <p className="text-[11px] text-indigo-700">Official Institutional Profile</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-indigo-900 pt-2 border-t border-indigo-200/60">
                <div className="flex justify-between">
                  <span className="text-indigo-700">Role Assigned:</span>
                  <span className="font-bold">{roleMeta.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700">Security Clearance:</span>
                  <span className="font-bold">{isAdminRole ? 'Root Level' : 'Role Scoped'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700">Account Created:</span>
                  <span className="font-mono">{user?.created_at ? formatDate(user.created_at) : 'Active Session'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700">Two-Factor Auth:</span>
                  <span className="text-emerald-700 font-bold">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ROLE & SYSTEM PERMISSIONS MATRIX                   */}
      {/* ========================================================= */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h3 className="text-base font-bold text-gray-900">
                Authorized Capabilities for {roleMeta.name}
              </h3>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Your access across school modules is governed by role-based access control (RBAC).
              Below are the modules and actions enabled for your profile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERMISSION_MODULES.map(module => {
              const modulePerms = module.permissions.map(p => p.id);
              const allowedPerms = modulePerms.filter(pid => hasPermission(pid));
              const hasAny = allowedPerms.length > 0;

              return (
                <div
                  key={module.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
                    hasAny
                      ? 'bg-white border-gray-200 shadow-2xs'
                      : 'bg-gray-50/60 border-gray-200 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{module.icon}</span>
                        <h4 className="text-xs font-bold text-gray-900">{module.name}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hasAny ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {hasAny ? `${allowedPerms.length}/${modulePerms.length} Active` : 'Restricted'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">{module.description}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100">
                    {module.permissions.map(p => {
                      const isAllowed = hasPermission(p.id);
                      return (
                        <div key={p.id} className="flex items-center justify-between text-[11px]">
                          <span className={isAllowed ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                            {p.label}
                          </span>
                          <span>
                            {isAllowed ? (
                              <span className="text-emerald-600 font-bold text-xs">✓ Allowed</span>
                            ) : (
                              <span className="text-gray-400 font-mono text-[10px]">✕ Locked</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EDIT PROFILE INFORMATION                           */}
      {/* ========================================================= */}
      {activeTab === 'edit' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-4xl">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>✏️</span>
              <span>Edit Profile Information</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Update your personal profile details, contact numbers, and residential information.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={profileForm.name}
                  onChange={handleProfileFormChange}
                  className="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address <span className="text-gray-400">(Read-Only)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileForm.email}
                  disabled
                  className="input-field text-xs bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={profileForm.phone}
                  onChange={handleProfileFormChange}
                  placeholder="+91 98765 43210"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={profileForm.emergency_contact}
                  onChange={handleProfileFormChange}
                  placeholder="+91 98765 43210"
                  className="input-field text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                About / Short Bio
              </label>
              <textarea
                name="bio"
                rows={3}
                value={profileForm.bio}
                onChange={handleProfileFormChange}
                placeholder="Write a brief description about yourself..."
                className="input-field text-xs"
              />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <h4 className="font-bold text-gray-900 text-xs mb-3">Residential Address</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={profileForm.address}
                    onChange={handleProfileFormChange}
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={profileForm.city}
                    onChange={handleProfileFormChange}
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={profileForm.state}
                    onChange={handleProfileFormChange}
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pin / Postal Code
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={profileForm.pincode}
                    onChange={handleProfileFormChange}
                    className="input-field text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SECURITY & PASSWORD SETTINGS                       */}
      {/* ========================================================= */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>🔒</span>
                <span>Change Account Password</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Ensure your account uses a strong password with letters, numbers, and symbols.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordForm.current_password}
                  onChange={handlePasswordFormChange}
                  placeholder="••••••••"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordForm.new_password}
                  onChange={handlePasswordFormChange}
                  placeholder="At least 6 characters"
                  className="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordFormChange}
                  placeholder="Repeat new password"
                  className="input-field text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <span>🔑</span>
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security & Session Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4 text-xs">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <span>🛡️</span>
                <span>Active Session Security</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800 block">Current Web Session</span>
                    <span className="text-[11px] text-gray-500 font-mono">Browser / Secure Token Active</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                    Current
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800 block">Authentication Mode</span>
                    <span className="text-[11px] text-gray-500">Supabase Auth / Local JWT</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md text-[10px]">
                    Verified
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                <span className="font-bold block">💡 Security Tip</span>
                <p>
                  Always sign out when using shared school lab computers or library workstations to protect your personal academic data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

