import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { SYSTEM_ROLES } from '../../utils/permissionRules';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    logout,
    hasPermission,
    activeRole,
    switchActiveRole,
    resetActiveRole,
    isAdmin,
    isStudent,
    isParent,
    parentChildren,
    activeChild,
    setActiveChild,
    parentLoading,
  } = useAuth();
  const { settings } = useSettings();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const schoolName = settings?.school_name && settings.school_name !== 'null' ? settings.school_name : 'SMS';
  const schoolTagline = settings?.school_tagline && settings.school_tagline !== 'null' ? settings.school_tagline : 'School Management';
  const schoolLogo = settings?.school_logo && settings.school_logo !== 'null' ? settings.school_logo : '';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allMenuItems = [
    { path: '/', icon: '🏠', label: 'Dashboard', permission: 'view-dashboard' },
    { path: '/students', icon: isParent() ? '👨‍👩‍👧' : '👨‍🎓', label: isParent() ? 'My Children' : 'Students', permission: 'view-students' },
    { path: '/teachers', icon: '👨‍🏫', label: 'Teachers', permission: 'view-teachers' },
    { path: '/classes', icon: '📚', label: 'Classes', permission: 'view-classes' },
    { path: '/attendance', icon: '📊', label: isParent() ? "Child's Attendance" : (isStudent() ? 'My Attendance' : 'Attendance'), permission: 'view-attendance' },
    { path: '/exams', icon: '📝', label: isParent() ? "Child's Exams" : (isStudent() ? 'My Exams' : 'Exams'), permission: 'view-exams' },
    { path: '/fees', icon: '💵', label: isParent() ? "Child's Fees" : (isStudent() ? 'My Fees' : 'Fees'), permission: 'view-fees' },
    { path: '/fees/payment', icon: '💳', label: 'Fee Payment', permission: 'collect-fees' },
    { path: '/assignments', icon: '📋', label: isParent() ? "Child's Assignments" : (isStudent() ? 'My Assignments' : 'Assignments'), permission: 'view-assignments' },
    { path: '/reports', icon: '📈', label: 'Reports', permission: 'view-reports' },
    { path: '/tools/bulk', icon: '🔧', label: 'Bulk Operations', permission: 'manage-tools' },
    { path: '/users', icon: '👥', label: 'Users', permission: 'manage-users' },
    { path: '/settings', icon: '⚙️', label: 'Settings', permission: 'manage-settings' },
  ];

  // Dynamic permission-based menu filtering
  const menuItems = allMenuItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    if (path === '/fees') {
      return (
        location.pathname === '/fees' ||
        (location.pathname.startsWith('/fees/') &&
          !location.pathname.startsWith('/fees/payment') &&
          !location.pathname.startsWith('/fees/collect'))
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-blue-800 to-indigo-900 text-white transition-all duration-300 flex-shrink-0`}>
        <div className="p-6">
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {typeof schoolLogo === 'string' && schoolLogo ? (
                schoolLogo.startsWith('preset:') ? (
                  <span className="text-2xl">{schoolLogo.replace('preset:', '')}</span>
                ) : (
                  <img
                    src={schoolLogo}
                    alt={schoolName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = '<span class="text-2xl">🎓</span>';
                    }}
                  />
                )
              ) : (
                <span className="text-2xl">🎓</span>
              )}
            </div>
            {sidebarOpen && (
              <div className="ml-3 min-w-0 flex-1">
                <h1 className="text-base font-bold leading-tight truncate text-white" title={schoolName}>
                  {schoolName}
                </h1>
                <p className="text-xs text-blue-200 truncate" title={schoolTagline}>
                  {schoolTagline}
                </p>
              </div>
            )}
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition ${isActive(item.path)
                    ? 'bg-blue-700'
                    : 'hover:bg-blue-700'
                  }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* Toggle Button */}
        <div className="absolute bottom-6 left-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-blue-700 rounded-lg hover:bg-blue-600 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {[...menuItems].sort((a, b) => b.path.length - a.path.length).find(item => isActive(item.path))?.label || 'Dashboard'}
                </h2>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Multi-Child Selector for Parents */}
              {isParent() && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-3 py-1.5 shadow-xs">
                  <span className="text-base">👦👧</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Active Child</span>
                    {parentLoading ? (
                      <span className="text-xs text-amber-600 animate-pulse font-medium">Loading...</span>
                    ) : parentChildren && parentChildren.length > 0 ? (
                      <select
                        value={activeChild?.id || ''}
                        onChange={(e) => {
                          const selected = parentChildren.find(c => String(c.id) === String(e.target.value));
                          if (selected) setActiveChild(selected);
                        }}
                        className="bg-transparent font-bold text-gray-900 border-none outline-hidden cursor-pointer text-xs p-0 -mt-0.5 focus:ring-0"
                        title="Switch between your enrolled children"
                      >
                        {parentChildren.map(child => {
                          const cName = `${child.first_name} ${child.last_name}`;
                          const cClass = child.class?.name || child.classes?.name || (child.class_id ? `Class ${child.class_id}` : '');
                          const cSec = child.section?.name || child.sections?.name ? `-${child.section?.name || child.sections?.name}` : '';
                          return (
                            <option key={child.id} value={child.id} className="text-gray-900 bg-white font-medium">
                              {cName} ({cClass}{cSec})
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-500 italic">No child linked</span>
                    )}
                  </div>
                </div>
              )}

              {/* Role Preview Switcher for Admins */}
              {user && (user?.roles?.includes('admin') || user?.roles?.includes('super-admin')) && (
                <div className="hidden sm:flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 rounded-xl px-2.5 py-1 text-xs">
                  <span className="text-gray-500 font-medium">Role View:</span>
                  <select
                    value={activeRole || 'admin'}
                    onChange={(e) => switchActiveRole(e.target.value)}
                    className="bg-transparent font-bold text-blue-900 border-none outline-hidden cursor-pointer text-xs"
                    title="Simulate SMS permissions as another user role"
                  >
                    {SYSTEM_ROLES.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.badge}
                      </option>
                    ))}
                  </select>
                  {activeRole && activeRole !== user?.roles?.[0] && (
                    <button
                      type="button"
                      onClick={resetActiveRole}
                      className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded hover:bg-blue-700 transition"
                      title="Reset to your real role"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}

              <button className="relative text-gray-600 hover:text-gray-800">
                <span className="text-2xl">🔔</span>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center cursor-pointer group relative">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">
                    {SYSTEM_ROLES.find(r => r.id === activeRole)?.name || user?.roles?.[0]?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'User'}
                  </p>
                </div>

                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block z-50">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    👤 Profile
                  </Link>
                  {hasPermission('manage-settings') && (
                    <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      ⚙️ Settings & Permissions
                    </Link>
                  )}
                  <hr className="my-2" />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

