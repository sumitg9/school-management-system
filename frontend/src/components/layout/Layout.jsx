import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { SYSTEM_ROLES } from '../../utils/permissionRules';
import NotificationDropdown from './NotificationDropdown';
import SchoolSwitcher from './SchoolSwitcher';
import { useSchool } from '../../context/SchoolContext';

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
    isTeacher,
    isStudent,
    isParent,
    parentChildren,
    activeChild,
    setActiveChild,
    parentLoading,
  } = useAuth();
  const { settings } = useSettings();
  const { currentSchool, activeSchoolId } = useSchool();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const schoolName = currentSchool?.name || (settings?.school_name && settings.school_name !== 'null' ? settings.school_name : 'SMS');
  const schoolTagline = currentSchool?.city
    ? `${currentSchool.city} • ${currentSchool.curriculum || 'CBSE'}`
    : (settings?.school_tagline && settings.school_tagline !== 'null' ? settings.school_tagline : 'School Management');
  const schoolLogo = currentSchool?.logo || (settings?.school_logo && settings.school_logo !== 'null' ? settings.school_logo : '');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigationGroups = [
    {
      id: 'core',
      type: 'item',
      path: '/',
      icon: '🏠',
      label: 'Dashboard',
      permission: 'view-dashboard',
    },
    {
      id: 'academics',
      type: 'group',
      label: isParent() ? "Child's Academics" : 'Academics & Faculty',
      icon: '📚',
      items: [
        { path: '/students', icon: isParent() ? '👨‍👩‍👧' : '👨‍🎓', label: isParent() ? 'My Children' : 'Students', permission: 'view-students' },
        { path: '/teachers', icon: '👨‍🏫', label: 'Teachers Directory', permission: 'view-teachers' },
        { path: '/classes', icon: '🏛️', label: 'Classes & Sections', permission: 'view-classes' },
        { path: '/attendance', icon: '📊', label: isParent() ? "Child's Attendance" : (isStudent() ? 'My Attendance' : 'Attendance Register'), permission: 'view-attendance' },
        { path: '/timetable', icon: '🗓️', label: isParent() ? "Child's Timetable" : (isStudent() ? 'My Timetable' : 'Timetable & Schedule'), permission: 'view-timetable' },
        { path: '/exams', icon: '📝', label: isParent() ? "Child's Exams" : (isStudent() ? 'My Exams' : 'Exams & Grades'), permission: 'view-exams' },
        { path: '/assignments', icon: '📋', label: isParent() ? "Child's Assignments" : (isStudent() ? 'My Assignments' : 'Assignments'), permission: 'view-assignments' },
      ],
    },
    {
      id: 'finance',
      type: 'group',
      label: isParent() ? 'Fee Records' : 'Fee Management',
      icon: '💵',
      items: [
        { path: '/fees', icon: '💰', label: isParent() ? "Child's Fees" : 'Fee Structure', permission: 'view-fees' },
        { path: '/fees/payment', icon: '💳', label: 'Fee Collection', permission: 'collect-fees' },
      ],
    },
    {
      id: 'community',
      type: 'group',
      label: 'Campus & Connect',
      icon: '🌟',
      items: [
        { path: '/events', icon: '📅', label: 'Events & Calendar', permission: 'view-events' },
        { path: '/communication', icon: '💬', label: isParent() ? 'Contact Teachers' : (isTeacher() ? 'Parent Messages' : 'Communications'), permission: 'view-communication' },
        { path: '/gallery', icon: '🖼️', label: 'School Gallery', permission: 'view-gallery' },
        { path: '/notifications', icon: '🔔', label: 'Notifications Center' },
      ],
    },
    {
      id: 'admin',
      type: 'group',
      label: 'Administration',
      icon: '⚙️',
      items: [
        { path: '/schools', icon: '🏛️', label: 'Campuses & Branches', permission: 'view-schools' },
        { path: '/hrms', icon: '👔', label: 'HRMS & Staff', permission: 'view-hrms' },
        { path: '/reports', icon: '📈', label: 'Reports & Analytics', permission: 'view-reports' },
        { path: '/tools/bulk', icon: '🔧', label: 'Bulk Operations', permission: 'manage-tools' },
        { path: '/users', icon: '👥', label: 'Users Management', permission: 'manage-users' },
        { path: '/settings', icon: '🛠️', label: 'Admin Settings', permission: 'manage-settings' },
      ],
    },
  ];

  // Dynamic navigation groups with permission checking
  const filteredNavGroups = navigationGroups
    .map(grp => {
      if (grp.type === 'item') {
        if (grp.permission && !hasPermission(grp.permission)) return null;
        return grp;
      }
      const allowedItems = grp.items.filter(item => !item.permission || hasPermission(item.permission));
      if (allowedItems.length === 0) return null;
      return { ...grp, items: allowedItems };
    })
    .filter(Boolean);

  // Flattened menu items for active path check and header title
  const flatMenuItems = filteredNavGroups.flatMap(grp => {
    return grp.type === 'item' ? [grp] : grp.items;
  });

  const [openGroups, setOpenGroups] = useState({
    academics: true,
    finance: true,
    community: true,
    admin: false,
  });

  const toggleGroup = (groupId) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setOpenGroups(prev => ({ ...prev, [groupId]: true }));
      return;
    }
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

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

  // Auto-expand group if active route is inside it
  useEffect(() => {
    filteredNavGroups.forEach(grp => {
      if (grp.type === 'group' && grp.items.some(item => isActive(item.path))) {
        setOpenGroups(prev => ({ ...prev, [grp.id]: true }));
      }
    });
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar with flex column and vertical scroll */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-blue-800 to-indigo-900 text-white transition-all duration-300 flex-shrink-0 flex flex-col h-screen select-none shadow-xl`}
      >
        {/* Fixed Top School Brand / Logo */}
        <div className="p-4 border-b border-blue-700/40 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {typeof schoolLogo === 'string' && schoolLogo ? (
                schoolLogo.startsWith('preset:') ? (
                  <span className="text-xl">{schoolLogo.replace('preset:', '')}</span>
                ) : (
                  <img
                    src={schoolLogo}
                    alt={schoolName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = '<span class="text-xl">🎓</span>';
                    }}
                  />
                )
              ) : (
                <span className="text-xl">🎓</span>
              )}
            </div>
            {sidebarOpen && (
              <div className="ml-3 min-w-0 flex-1">
                <h1 className="text-sm font-bold leading-tight truncate text-white" title={schoolName}>
                  {schoolName}
                </h1>
                <p className="text-[11px] text-blue-200 truncate" title={schoolTagline}>
                  {schoolTagline}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 sidebar-scroll">
          {filteredNavGroups.map(grp => {
            if (grp.type === 'item') {
              const active = isActive(grp.path);
              return (
                <Link
                  key={grp.path}
                  to={grp.path}
                  title={!sidebarOpen ? grp.label : undefined}
                  className={`flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-100 hover:text-white hover:bg-blue-700/60'
                  } ${!sidebarOpen ? 'justify-center' : ''}`}
                >
                  <span className="text-base flex-shrink-0">{grp.icon}</span>
                  {sidebarOpen && <span className="ml-2.5 truncate">{grp.label}</span>}
                </Link>
              );
            }

            // Dropdown Group
            const isOpen = !!openGroups[grp.id];
            const hasActiveChild = grp.items.some(item => isActive(item.path));

            return (
              <div key={grp.id} className="pt-1">
                {/* Group Header Button */}
                <button
                  type="button"
                  onClick={() => toggleGroup(grp.id)}
                  title={!sidebarOpen ? grp.label : undefined}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    hasActiveChild && !isOpen
                      ? 'bg-blue-700/80 text-white'
                      : 'text-blue-200 hover:text-white hover:bg-blue-700/40'
                  } ${!sidebarOpen ? 'justify-center' : ''}`}
                >
                  <div className="flex items-center min-w-0">
                    <span className="text-base flex-shrink-0">{grp.icon}</span>
                    {sidebarOpen && (
                      <span className="ml-2.5 truncate text-[11px] font-bold uppercase tracking-wider text-blue-200/90">
                        {grp.label}
                      </span>
                    )}
                  </div>

                  {sidebarOpen && (
                    <svg
                      className={`w-3.5 h-3.5 text-blue-300 transform transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>

                {/* Dropdown Sub-menu Items */}
                {isOpen && sidebarOpen && (
                  <div className="mt-1 ml-3 pl-2.5 border-l border-blue-600/40 space-y-0.5">
                    {grp.items.map(item => {
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center px-2.5 py-1.5 rounded-md text-xs transition ${
                            active
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-blue-100 hover:text-white hover:bg-blue-700/50'
                          }`}
                        >
                          <span className="text-sm mr-2 flex-shrink-0">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Fixed Footer: Collapse Sidebar Toggle */}
        <div className="p-2.5 border-t border-blue-700/40 bg-blue-900/40 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-1.5 bg-blue-700/60 hover:bg-blue-600 rounded-lg text-white transition text-xs"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
            {sidebarOpen && <span className="ml-2 text-[11px] font-medium">Collapse Menu</span>}
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
                  {[...flatMenuItems].sort((a, b) => b.path.length - a.path.length).find(item => isActive(item.path))?.label || 'Dashboard'}
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

              {/* Multi-Campus / School Branch Switcher */}
              <SchoolSwitcher />

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

              {/* Notifications Dropdown */}
              <NotificationDropdown />

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
                  <Link to="/notifications" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    🔔 Notifications
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

        {/* Page Content - Keyed by activeSchoolId to guarantee immediate unmount/remount on campus switch */}
        <main key={activeSchoolId} className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

