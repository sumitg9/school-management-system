import React, { useState, useEffect, useRef, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  SYSTEM_ROLES,
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  mergeRolePermissions,
  isRestrictedForStudent,
  hasRolePermission
} from '../../utils/permissionRules';

const UserPermissionsTable = () => {
  const { settings, updateSettings } = useSettings();
  const { activeRole, switchActiveRole, isSuperAdmin } = useAuth();
  const confirm = useConfirm();

  // Local state for role permissions matrix
  const [rolePermissions, setRolePermissions] = useState(() => {
    try {
      const direct = localStorage.getItem('sms_role_permissions');
      if (direct) {
        const parsed = JSON.parse(direct);
        if (parsed && typeof parsed === 'object') {
          return mergeRolePermissions(parsed);
        }
      }
    } catch (_) {}
    return mergeRolePermissions(settings?.user_role_permissions);
  });

  const [selectedRole, setSelectedRole] = useState('admin');
  const [viewMode, setViewMode] = useState('inspector'); // 'inspector' | 'matrix'
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const lastSavedPermsRef = useRef(null);

  // Sync with settings whenever settings change (without overriding unsaved user edits or just-saved edits)
  useEffect(() => {
    if (!settings?.user_role_permissions) return;
    if (hasChanges) return;

    // Check if the current settings match what we just saved locally
    if (lastSavedPermsRef.current) {
      try {
        const direct = localStorage.getItem('sms_role_permissions');
        if (direct && direct === lastSavedPermsRef.current) {
          return;
        }
      } catch (_) {}
      if (JSON.stringify(settings.user_role_permissions) === lastSavedPermsRef.current) {
        return;
      }
    }

    try {
      const direct = localStorage.getItem('sms_role_permissions');
      if (direct) {
        const parsed = JSON.parse(direct);
        if (parsed && typeof parsed === 'object') {
          setRolePermissions(mergeRolePermissions(parsed));
          return;
        }
      }
    } catch (_) {}
    setRolePermissions(mergeRolePermissions(settings.user_role_permissions));
  }, [settings?.user_role_permissions]);

  // Toggle a single permission for a role
  const handleTogglePermission = (roleId, permissionId) => {
    if (!isSuperAdmin()) {
      toast.error('Access Denied: Only a Super Admin can modify system role permissions.');
      return;
    }

    if (roleId === 'super-admin') {
      toast.info('Super Admin role retains full root permissions by default.');
      return;
    }

    if ((permissionId === 'manage-users' || permissionId === 'view-users') && !isSuperAdmin()) {
      toast.warning('Only Super Admin can grant or revoke User Management permissions.');
      return;
    }

    if (roleId === 'student' && isRestrictedForStudent(permissionId)) {
      toast.warning('Edit, delete, and management capabilities are strictly restricted for student users.');
      return;
    }

    setRolePermissions(prev => {
      const currentPerms = prev[roleId] || [];
      const isCurrentlyEnabled = currentPerms.includes(permissionId);

      let updatedList;
      if (isCurrentlyEnabled) {
        updatedList = currentPerms.filter(p => p !== permissionId);
      } else {
        updatedList = [...currentPerms, permissionId];
      }

      setHasChanges(true);
      return {
        ...prev,
        [roleId]: updatedList,
      };
    });
  };

  // Toggle all permissions in a module for a role
  const handleToggleModulePermissions = (roleId, moduleObj) => {
    if (!isSuperAdmin()) {
      toast.error('Access Denied: Only a Super Admin can modify system role permissions.');
      return;
    }

    if (roleId === 'super-admin') return;

    if (moduleObj.id === 'users' && !isSuperAdmin()) {
      toast.warning('Only Super Admin can grant or revoke User Management permissions.');
      return;
    }

    let modulePermIds = moduleObj.permissions.map(p => p.id);
    if (roleId === 'student') {
      modulePermIds = modulePermIds.filter(id => !isRestrictedForStudent(id));
      if (modulePermIds.length === 0) {
        toast.info('All capabilities in this module are restricted for students.');
        return;
      }
    }

    setRolePermissions(prev => {
      const currentPerms = prev[roleId] || [];
      const allEnabled = modulePermIds.every(id => currentPerms.includes(id));

      let updatedList;
      if (allEnabled) {
        // Remove all in this module
        updatedList = currentPerms.filter(id => !modulePermIds.includes(id));
      } else {
        // Add all in this module
        const set = new Set([...currentPerms, ...modulePermIds]);
        updatedList = Array.from(set);
      }

      setHasChanges(true);
      return {
        ...prev,
        [roleId]: updatedList,
      };
    });
  };

  // Enable all permissions for a role
  const handleEnableAllForRole = (roleId) => {
    if (!isSuperAdmin()) {
      toast.error('Access Denied: Only a Super Admin can modify system role permissions.');
      return;
    }
    if (roleId === 'super-admin') return;
    let allIds = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id));
    if (roleId === 'student') {
      allIds = allIds.filter(id => !isRestrictedForStudent(id));
    }
    setRolePermissions(prev => ({
      ...prev,
      [roleId]: allIds,
    }));
    setHasChanges(true);
    toast.info(`Enabled all permitted capabilities for ${SYSTEM_ROLES.find(r => r.id === roleId)?.name}`);
  };

  // Disable all permissions for a role
  const handleDisableAllForRole = (roleId) => {
    if (!isSuperAdmin()) {
      toast.error('Access Denied: Only a Super Admin can modify system role permissions.');
      return;
    }
    if (roleId === 'super-admin') return;
    setRolePermissions(prev => ({
      ...prev,
      [roleId]: [],
    }));
    setHasChanges(true);
    toast.warn(`Cleared all permissions for ${SYSTEM_ROLES.find(r => r.id === roleId)?.name}`);
  };

  // Reset a specific role to default
  const handleResetRoleToDefault = (roleId) => {
    if (!isSuperAdmin()) {
      toast.error('Access Denied: Only a Super Admin can modify system role permissions.');
      return;
    }
    const defaultList = DEFAULT_ROLE_PERMISSIONS[roleId] || [];
    setRolePermissions(prev => ({
      ...prev,
      [roleId]: [...defaultList],
    }));
    setHasChanges(true);
    toast.info(`Reset ${SYSTEM_ROLES.find(r => r.id === roleId)?.name} to default permissions`);
  };

  // Reset all roles to system defaults
  const handleResetAllToDefault = async () => {
    if (!isSuperAdmin()) {
      toast.error('Access Denied: Only a Super Admin can modify system role permissions.');
      return;
    }
    const isConfirmed = await confirm({
      title: 'Reset All Role Permissions?',
      message: 'Are you sure you want to restore all user roles to default recommended system permissions? This will overwrite your custom changes.',
      confirmText: 'Reset to Defaults',
      type: 'warning',
    });

    if (isConfirmed) {
      const defaults = { ...DEFAULT_ROLE_PERMISSIONS };
      setRolePermissions(defaults);
      try {
        localStorage.setItem('sms_role_permissions', JSON.stringify(defaults));
        window.dispatchEvent(new CustomEvent('sms:permissions-updated', { detail: defaults }));
      } catch (_) {}
      setHasChanges(true);
      toast.info('All user roles reset to default permissions. Click Save to persist.');
    }
  };

  // Save changes
  const handleSavePermissions = async () => {
    if (!isSuperAdmin()) {
      toast.error('Access Denied: Only a Super Admin can modify system role permissions.');
      return;
    }
    setSaving(true);
    try {
      const permsJson = JSON.stringify(rolePermissions);
      lastSavedPermsRef.current = permsJson;

      // 1. Immediately write to dedicated localStorage to guarantee persistence across refresh
      try {
        localStorage.setItem('sms_role_permissions', permsJson);
        window.dispatchEvent(new CustomEvent('sms:permissions-updated', { detail: rolePermissions }));
      } catch (_) {}

      // 2. Persist to SettingsContext & API
      const res = await updateSettings({
        user_role_permissions: rolePermissions,
      });

      if (res?.success) {
        toast.success('User roles and permissions updated successfully!');
        setHasChanges(false);
      } else {
        toast.error('Failed to update permissions.');
      }
    } catch (err) {
      console.error('Error saving role permissions:', err);
      toast.error('Error saving permissions: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const totalPermissionsCount = PERMISSION_MODULES.flatMap(m => m.permissions).length;
  const currentRoleObj = SYSTEM_ROLES.find(r => r.id === selectedRole) || SYSTEM_ROLES[0];
  const rawRolePerms = rolePermissions[selectedRole] || [];
  const activeRolePerms = selectedRole === 'student'
    ? rawRolePerms.filter(p => !isRestrictedForStudent(p))
    : rawRolePerms;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🛡️</span>
              <h2 className="text-xl font-bold text-gray-900">User Role Permissions Management</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Configure granular module and action permissions for each user role. Menus and feature access across the school system dynamically adapt to these rules.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('inspector')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'inspector'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>🔍 Role Inspector</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'matrix'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>📊 Full Matrix Table</span>
              </button>
            </div>

            {(isSuperAdmin() || hasRolePermission(rolePermissions, activeRole, 'manage-users')) && (
              <Link
                to="/users"
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1.5"
                title="Go to User Management table"
              >
                <span>👥 User Accounts</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleResetAllToDefault}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition cursor-pointer"
              title="Reset all roles to system defaults"
            >
              🔄 Reset Defaults
            </button>

            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={saving || !hasChanges}
              className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>{hasChanges ? 'Save Changes' : 'Saved'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Unsaved changes banner */}
        {hasChanges && (
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-semibold">
                You have unsaved permission changes. Click <b>"Save Changes"</b> to apply them to all active sessions.
              </span>
            </div>
            <button
              type="button"
              onClick={handleSavePermissions}
              className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition"
            >
              Save Now
            </button>
          </div>
        )}

        {/* Roles Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {SYSTEM_ROLES.map(role => {
            const isSelected = selectedRole === role.id;
            const count = role.id === 'student'
              ? (rolePermissions[role.id] || []).filter(p => !isRestrictedForStudent(p)).length
              : (rolePermissions[role.id] || []).length;
            const isSuper = role.id === 'super-admin';
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>{role.badge}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-normal ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isSuper ? 'All' : `${count}/${totalPermissionsCount}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Teacher Scoped Class Access Policy Notice */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <span className="text-2xl mt-0.5">👨‍🏫</span>
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-indigo-950 flex items-center gap-2">
            <span>Teacher Assigned Classes Scoping</span>
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Automated Policy
            </span>
          </h4>
          <p className="text-indigo-900 leading-relaxed">
            Faculty members assigned the <b>Teacher</b> role only have access to their <b>specifically assigned classes and sections</b> (e.g. for Attendance marking, Homework assignments, Exam mark entry, and Class records). System administrators, Finance, and Back Office retain school-wide authority.
          </p>
        </div>
      </div>

      {/* Student Security Policy Notice */}
      {selectedRole === 'student' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
          <span className="text-2xl mt-0.5">🔒</span>
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-emerald-950 flex items-center gap-2">
              <span>Student Role Protection Policy</span>
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                Strict Constraint
              </span>
            </h4>
            <p className="text-emerald-900 leading-relaxed">
              To preserve data integrity, enrolled <b>Students</b> are strictly restricted to read-only viewing of their own records and assignment submission. All create, edit, delete, mark, and administrative capabilities are permanently locked.
            </p>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: SINGLE ROLE INSPECTOR */}
      {viewMode === 'inspector' && (
        <div className="space-y-6">
          {/* Selected Role Meta & Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-bold text-gray-900">{currentRoleObj.badge}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                  {currentRoleObj.id === 'super-admin'
                    ? 'Root Permissions'
                    : `${activeRolePerms.length} of ${totalPermissionsCount} Allowed`}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{currentRoleObj.description}</p>
            </div>

            {currentRoleObj.id !== 'super-admin' && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleEnableAllForRole(currentRoleObj.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                >
                  ✓ Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleDisableAllForRole(currentRoleObj.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition cursor-pointer"
                >
                  ✕ Disable All
                </button>
                <button
                  type="button"
                  onClick={() => handleResetRoleToDefault(currentRoleObj.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition cursor-pointer"
                >
                  🔄 Reset Role
                </button>
                <button
                  type="button"
                  onClick={() => switchActiveRole(currentRoleObj.id)}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                  title="Simulate SMS navigation with this role"
                >
                  👁️ Preview as {currentRoleObj.name}
                </button>
              </div>
            )}
          </div>

          {/* Module-by-Module Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {PERMISSION_MODULES.map(module => {
              const modulePermIds = module.permissions.map(p => p.id);
              const enabledCount = modulePermIds.filter(id => activeRolePerms.includes(id)).length;
              const isAllModuleEnabled = enabledCount === modulePermIds.length;
              const isSuper = currentRoleObj.id === 'super-admin';

              return (
                <div
                  key={module.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  {/* Module Header */}
                  <div className="bg-gray-50/80 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{module.icon}</span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{module.name}</h3>
                        <p className="text-[11px] text-gray-500">{module.description}</p>
                      </div>
                    </div>

                    {!isSuper && (
                      <button
                        type="button"
                        onClick={() => handleToggleModulePermissions(currentRoleObj.id, module)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          isAllModuleEnabled
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {isAllModuleEnabled ? 'All Enabled' : `${enabledCount}/${modulePermIds.length} On`}
                      </button>
                    )}
                  </div>

                  {/* Module Permissions List */}
                  <div className="p-4 divide-y divide-gray-100 flex-1">
                    {module.permissions.map(perm => {
                      const isRestricted = currentRoleObj.id === 'student' && isRestrictedForStudent(perm.id);
                      const isEnabled = !isRestricted && (isSuper || activeRolePerms.includes(perm.id));

                      return (
                        <div
                          key={perm.id}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                        >
                          <div className="pr-2">
                            <label
                              htmlFor={`${currentRoleObj.id}-${perm.id}`}
                              className="text-xs font-semibold text-gray-900 cursor-pointer block"
                            >
                              {perm.label}
                            </label>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                              {perm.description}
                            </p>
                          </div>

                          <div className="flex-shrink-0">
                            {isSuper ? (
                              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                Root Always
                              </span>
                            ) : isRestricted ? (
                              <span
                                className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1 select-none"
                                title="Edit, delete, and management capabilities cannot be granted to student accounts"
                              >
                                <span>🔒</span>
                                <span>Restricted</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                id={`${currentRoleObj.id}-${perm.id}`}
                                onClick={() => handleTogglePermission(currentRoleObj.id, perm.id)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                  isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                                role="switch"
                                aria-checked={isEnabled}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
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

      {/* VIEW MODE 2: FULL COMPARISON MATRIX TABLE */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Side-by-Side Permissions Matrix</h3>
              <p className="text-xs text-gray-500">
                Compare and configure permissions across all 8 user roles in one view.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter permissions..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-semibold sticky top-0 z-10">
                <tr>
                  <th className="p-3.5 min-w-[220px]">Module & Capability</th>
                  {SYSTEM_ROLES.map(role => (
                    <th key={role.id} className="p-3.5 text-center min-w-[105px]">
                      <span className="block font-bold">{role.name}</span>
                      <span className="text-[10px] text-gray-300 font-mono font-normal">
                        {role.id === 'student'
                          ? (rolePermissions[role.id] || []).filter(p => !isRestrictedForStudent(p)).length
                          : (rolePermissions[role.id] || []).length} allowed
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {PERMISSION_MODULES.map(module => {
                  const filteredPerms = module.permissions.filter(p =>
                    !searchFilter ||
                    p.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    module.name.toLowerCase().includes(searchFilter.toLowerCase())
                  );

                  if (filteredPerms.length === 0) return null;

                  return (
                    <React.Fragment key={module.id}>
                      {/* Module Section Header Row */}
                      <tr className="bg-blue-50/70 border-t-2 border-blue-100 font-bold text-blue-950">
                        <td colSpan={SYSTEM_ROLES.length + 1} className="p-2.5 px-3.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span>{module.icon}</span>
                            <span>{module.name}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Permissions Rows */}
                      {filteredPerms.map(perm => (
                        <tr key={perm.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3 pl-6 border-r border-gray-100">
                            <span className="font-semibold text-gray-900 block">{perm.label}</span>
                            <span className="text-[10px] text-gray-500 block leading-tight">{perm.description}</span>
                          </td>

                          {SYSTEM_ROLES.map(role => {
                            const isSuper = role.id === 'super-admin';
                            const isRestricted = role.id === 'student' && isRestrictedForStudent(perm.id);
                            const isEnabled = !isRestricted && (isSuper || (rolePermissions[role.id] || []).includes(perm.id));

                            return (
                              <td key={role.id} className="p-3 text-center border-r border-gray-100 last:border-r-0">
                                {isSuper ? (
                                  <span className="text-purple-600 font-bold text-sm" title="Always Allowed">
                                    ✓
                                  </span>
                                ) : isRestricted ? (
                                  <span
                                    className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-400 text-xs border border-gray-200 cursor-not-allowed mx-auto select-none"
                                    title="Restricted: Students cannot perform edit, delete, create, or management actions"
                                  >
                                    🔒
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePermission(role.id, perm.id)}
                                    className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition cursor-pointer text-xs font-bold ${
                                      isEnabled
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                        : 'bg-white text-transparent border-gray-300 hover:border-gray-400'
                                    }`}
                                    title={`Toggle ${perm.label} for ${role.name}`}
                                  >
                                    ✓
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPermissionsTable;
