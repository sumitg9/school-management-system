import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TYPE_CONFIG = {
  fee: {
    icon: '💰',
    label: 'Fee Notice',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    border: 'border-l-emerald-500',
    ctaText: 'View Fees & Pay',
    defaultLink: '/fee-payment',
  },
  attendance: {
    icon: '📊',
    label: 'Attendance',
    pill: 'bg-blue-100 text-blue-800 border-blue-200',
    border: 'border-l-blue-500',
    ctaText: 'Check Attendance',
    defaultLink: '/attendance',
  },
  exam: {
    icon: '📝',
    label: 'Exams & Grades',
    pill: 'bg-purple-100 text-purple-800 border-purple-200',
    border: 'border-l-purple-500',
    ctaText: 'View Grades & Schedule',
    defaultLink: '/exams',
  },
  assignment: {
    icon: '📋',
    label: 'Assignment',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    border: 'border-l-indigo-500',
    ctaText: 'View Assignment',
    defaultLink: '/assignments',
  },
  communication: {
    icon: '💬',
    label: 'PTM & Message',
    pill: 'bg-sky-100 text-sky-800 border-sky-200',
    border: 'border-l-sky-500',
    ctaText: 'Open Messages & PTM',
    defaultLink: '/communication',
  },
  announcement: {
    icon: '📢',
    label: 'Announcement',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
    border: 'border-l-amber-500',
    ctaText: 'View Circular',
    defaultLink: '/gallery',
  },
  system: {
    icon: '⚙️',
    label: 'System Alert',
    pill: 'bg-gray-100 text-gray-800 border-gray-200',
    border: 'border-l-gray-400',
    ctaText: 'System Settings',
    defaultLink: '/settings',
  },
};

const PRIORITY_BADGES = {
  urgent: 'bg-red-100 text-red-700 border-red-200 animate-pulse font-bold',
  high: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
  normal: 'bg-blue-50 text-blue-700 border-blue-100 font-medium',
  low: 'bg-gray-100 text-gray-600 border-gray-200 font-medium',
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { user, activeRole, isAdmin, isTeacher } = useAuth();

  const currentRole = activeRole || user?.roles?.[0] || user?.role || 'admin';
  const currentEmail = user?.email || '';

  // Can broadcast if admin, super-admin, or teacher
  const canBroadcast = currentRole === 'admin' || currentRole === 'super-admin' || currentRole === 'teacher';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'unread' | 'read'
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Modals & Feedback
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'announcement',
    priority: 'normal',
    target_role: 'all',
    link: '/gallery',
    student_name: '',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll({
        role: currentRole,
        userEmail: currentEmail,
        category: selectedCategory,
        isRead: selectedStatus === 'all' ? undefined : selectedStatus,
        priority: selectedPriority,
        search,
        per_page: 'all',
      });

      if (res && res.success) {
        setNotifications(res.data || []);
      }

      // Unread count
      const countRes = await notificationAPI.getUnreadCount({
        role: currentRole,
        userEmail: currentEmail,
      });
      if (countRes && countRes.success) {
        setUnreadCount(countRes.count || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('sms:notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('sms:notifications-updated', handleUpdate);
    };
  }, [currentRole, currentEmail, selectedCategory, selectedStatus, selectedPriority, search]);

  // Actions
  const handleToggleRead = async (notif) => {
    try {
      if (notif.is_read) {
        await notificationAPI.markAsUnread(notif.id);
        showToast('Notification marked as unread.');
      } else {
        await notificationAPI.markAsRead(notif.id);
        showToast('Notification marked as read.');
      }
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead({
        role: currentRole,
        userEmail: currentEmail,
      });
      showToast('All notifications marked as read.');
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationAPI.delete(id);
      showToast('Notification removed.');
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all notifications to default demo alerts?')) {
      await notificationAPI.resetDefaults();
      showToast('Notifications reset to demo defaults.');
      loadNotifications();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear your notification history?')) {
      await notificationAPI.clearAll({
        role: currentRole,
        userEmail: currentEmail,
      });
      showToast('Notification history cleared.');
      loadNotifications();
    }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      alert('Please provide both a title and message body.');
      return;
    }

    try {
      await notificationAPI.create({
        title: broadcastForm.title,
        message: broadcastForm.message,
        type: broadcastForm.type,
        priority: broadcastForm.priority,
        target_role: broadcastForm.target_role,
        link: broadcastForm.link || '/notifications',
        student_name: broadcastForm.student_name.trim() || null,
        metadata: {
          broadcastBy: user?.name || 'Administrator',
          broadcastRole: currentRole,
        },
      });

      setShowBroadcastModal(false);
      setBroadcastForm({
        title: '',
        message: '',
        type: 'announcement',
        priority: 'normal',
        target_role: 'all',
        link: '/gallery',
        student_name: '',
      });

      showToast('Announcement broadcasted successfully to all target recipients.');
      loadNotifications();
    } catch (err) {
      console.error('Broadcast failed:', err);
      alert('Failed to publish broadcast.');
    }
  };

  // Metrics
  const totalCount = notifications.length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length;
  const academicFeeCount = notifications.filter(n => n.type === 'fee' || n.type === 'exam' || n.type === 'assignment').length;

  return (
    <div className="px-[15px] py-6 w-full space-y-6 pb-12">
      {/* Toast Notification Alert Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700"
        >
          <span>ℹ️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🔔</span>
            <h1 className="text-2xl font-black tracking-tight">Notification & Announcement Center</h1>
          </div>
          <p className="text-sm text-blue-200">
            Real-time institutional alerts, fee schedules, academic updates, and teacher communications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canBroadcast && (
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition flex items-center space-x-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
            >
              <span>📢</span>
              <span>+ Broadcast Announcement</span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-2 rounded-xl backdrop-blur-xs transition"
            >
              ✓ Mark All Read
            </button>
          )}

          <button
            onClick={handleResetDefaults}
            className="bg-white/10 hover:bg-white/20 text-blue-200 text-xs font-medium px-3 py-2 rounded-xl backdrop-blur-xs transition"
            title="Reset to demo notifications"
          >
            🔄 Reset Defaults
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center text-xl text-blue-700 flex-shrink-0">
            📬
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Alerts</p>
            <p className="text-xl font-black text-gray-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-red-100 rounded-lg flex items-center justify-center text-xl text-red-700 flex-shrink-0">
            🔔
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unread Alerts</p>
            <p className="text-xl font-black text-red-600">{unreadCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-amber-100 rounded-lg flex items-center justify-center text-xl text-amber-700 flex-shrink-0">
            ⚠️
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">High / Urgent</p>
            <p className="text-xl font-black text-amber-600">{urgentCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-emerald-100 rounded-lg flex items-center justify-center text-xl text-emerald-700 flex-shrink-0">
            🎓
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Academic & Fees</p>
            <p className="text-xl font-black text-emerald-700">{academicFeeCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications, child, or subject..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs and Priority Select */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="inline-flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium text-gray-600">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1.5 rounded-md transition ${
                  selectedStatus === 'all'
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedStatus('unread')}
                className={`px-3 py-1.5 rounded-md flex items-center space-x-1 transition ${
                  selectedStatus === 'unread'
                    ? 'bg-white text-red-600 font-bold shadow-xs'
                    : 'hover:text-gray-900'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSelectedStatus('read')}
                className={`px-3 py-1.5 rounded-md transition ${
                  selectedStatus === 'read'
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'hover:text-gray-900'
                }`}
              >
                Read
              </button>
            </div>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🚨 Urgent Priority</option>
              <option value="high">⚠️ High Priority</option>
              <option value="normal">Normal</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500 mr-1">Categories:</span>
          {[
            { id: 'all', label: 'All Categories', icon: '📋' },
            { id: 'fee', label: 'Fees & Due Dates', icon: '💰' },
            { id: 'attendance', label: 'Attendance', icon: '📊' },
            { id: 'exam', label: 'Exams & Grades', icon: '📝' },
            { id: 'assignment', label: 'Assignments', icon: '📋' },
            { id: 'communication', label: 'PTM & Messages', icon: '💬' },
            { id: 'announcement', label: 'Announcements', icon: '📢' },
            { id: 'system', label: 'System', icon: '⚙️' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-3 py-1 rounded-full border transition flex items-center space-x-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500 text-sm">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <span className="text-4xl block">📬</span>
            <h3 className="text-base font-bold text-gray-800">No Notifications Matching Filters</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              We couldn't find any notifications matching your active search or category filters. Try resetting the filters or switching views.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSelectedPriority('all');
                }}
                className="text-xs bg-blue-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          notifications.map((notif) => {
            const typeCfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.announcement;
            const priorityClass = PRIORITY_BADGES[notif.priority] || PRIORITY_BADGES.normal;

            return (
              <div
                key={notif.id}
                className={`bg-white rounded-xl border border-gray-200 p-4 transition shadow-xs hover:shadow-md border-l-4 ${
                  typeCfg.border
                } ${!notif.is_read ? 'bg-blue-50/30 ring-1 ring-blue-100' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Icon & Main Body */}
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${
                        typeCfg.pill
                      }`}
                    >
                      {typeCfg.icon}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${typeCfg.pill}`}
                        >
                          {typeCfg.label}
                        </span>

                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityClass}`}
                        >
                          {notif.priority || 'Normal'}
                        </span>

                        {notif.student_name && (
                          <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                            👨‍🎓 {notif.student_name}
                          </span>
                        )}

                        {!notif.is_read && (
                          <span className="inline-flex items-center text-[10px] bg-red-500 text-white px-2 py-0.2 rounded-full font-bold animate-pulse">
                            New
                          </span>
                        )}

                        <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
                          {formatTimeAgo(notif.created_at)} • {formatDateTime(notif.created_at)}
                        </span>
                      </div>

                      <h3
                        className={`text-sm ${
                          !notif.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                        }`}
                      >
                        {notif.title}
                      </h3>

                      <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>

                      {/* Metadata Chips if present */}
                      {notif.metadata && Object.keys(notif.metadata).length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-600">
                          {notif.metadata.amount && (
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100 font-semibold">
                              💰 Amount: {notif.metadata.amount}
                            </span>
                          )}
                          {notif.metadata.dueDate && (
                            <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-100">
                              📅 Due: {notif.metadata.dueDate}
                            </span>
                          )}
                          {notif.metadata.subject && (
                            <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded border border-purple-100">
                              📚 Subject: {notif.metadata.subject}
                            </span>
                          )}
                          {notif.metadata.score && (
                            <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-100 font-semibold">
                              🎯 Score: {notif.metadata.score} ({notif.metadata.grade})
                            </span>
                          )}
                          {notif.metadata.teacher && (
                            <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-100">
                              👨‍🏫 Teacher: {notif.metadata.teacher}
                            </span>
                          )}
                          {notif.metadata.venue && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                              📍 Venue: {notif.metadata.venue}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 flex-shrink-0">
                    <span className="text-[11px] text-gray-400 sm:hidden">
                      {formatTimeAgo(notif.created_at)}
                    </span>

                    <div className="flex items-center space-x-2">
                      {notif.link && (
                        <button
                          onClick={() => {
                            if (!notif.is_read) handleToggleRead(notif);
                            navigate(notif.link);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center space-x-1"
                        >
                          <span>{typeCfg.ctaText || 'Open'}</span>
                          <span>→</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleRead(notif)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
                          notif.is_read
                            ? 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 font-semibold'
                        }`}
                        title={notif.is_read ? 'Mark as unread' : 'Mark as read'}
                      >
                        {notif.is_read ? 'Mark Unread' : 'Mark Read'}
                      </button>

                      <button
                        onClick={() => setDetailModalItem(notif)}
                        className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
                        title="View Details"
                      >
                        🔍
                      </button>

                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                        title="Delete notification"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Utility Actions */}
      {notifications.length > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-400 pt-4 border-t border-gray-200">
          <span>Showing {notifications.length} notification items</span>
          <button
            onClick={handleClearAll}
            className="text-red-500 hover:text-red-700 font-semibold transition"
          >
            Clear All Notifications
          </button>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="broadcast-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowBroadcastModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📢</span>
                <h2 id="broadcast-title" className="text-base font-bold">
                  Send Alert / Broadcast Announcement
                </h2>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={broadcastForm.target_role}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, target_role: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="all">🌐 All Users (Parents, Teachers, Students)</option>
                    <option value="parent">👨‍👩‍👧 Parents Only</option>
                    <option value="teacher">👨‍🏫 Teachers Only</option>
                    <option value="student">👨‍🎓 Students Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={broadcastForm.type}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="announcement">📢 Institutional Announcement</option>
                    <option value="fee">💰 Fee Notice / Reminder</option>
                    <option value="exam">📝 Exam Schedule / Grade Alert</option>
                    <option value="assignment">📋 Homework & Assignment</option>
                    <option value="attendance">📊 Attendance Alert</option>
                    <option value="communication">💬 PTM & Communication</option>
                    <option value="system">⚙️ System Alert</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Priority Level</label>
                  <select
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">⚠️ High Priority</option>
                    <option value="urgent">🚨 Urgent / Action Required</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Student Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={broadcastForm.student_name}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, student_name: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="e.g. Annual Sports Day Assembly Details"
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  placeholder="Provide comprehensive details for students, parents, and faculty..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Target Deep Link (Optional)
                </label>
                <select
                  value={broadcastForm.link}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, link: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="/gallery">School Gallery (/gallery)</option>
                  <option value="/fee-payment">Fee Payment (/fee-payment)</option>
                  <option value="/exams">Exams & Grades (/exams)</option>
                  <option value="/assignments">Assignments (/assignments)</option>
                  <option value="/communication">Teacher-Parent Communication (/communication)</option>
                  <option value="/attendance">Attendance (/attendance)</option>
                  <option value="/notifications">Notifications Center (/notifications)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition flex items-center space-x-1"
                >
                  <span>🚀</span>
                  <span>Broadcast Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {detailModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDetailModalItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">
                  {TYPE_CONFIG[detailModalItem.type]?.icon || '🔔'}
                </span>
                <h2 id="detail-modal-title" className="text-sm font-bold text-gray-800">
                  Notification Details
                </h2>
              </div>
              <button
                onClick={() => setDetailModalItem(null)}
                className="text-gray-400 hover:text-gray-700 font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${
                      TYPE_CONFIG[detailModalItem.type]?.pill || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {TYPE_CONFIG[detailModalItem.type]?.label || 'Alert'}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      PRIORITY_BADGES[detailModalItem.priority] || PRIORITY_BADGES.normal
                    }`}
                  >
                    {detailModalItem.priority}
                  </span>
                  {detailModalItem.student_name && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                      👨‍🎓 {detailModalItem.student_name}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900 pt-1">
                  {detailModalItem.title}
                </h3>
                <p className="text-xs text-gray-400">
                  Received on {formatDateTime(detailModalItem.created_at)}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-700 leading-relaxed border border-gray-200">
                {detailModalItem.message}
              </div>

              {detailModalItem.metadata && Object.keys(detailModalItem.metadata).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Additional Context & Meta
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                    {Object.entries(detailModalItem.metadata).map(([key, val]) => (
                      <div key={key}>
                        <span className="text-gray-400 capitalize">{key}: </span>
                        <span className="font-semibold text-gray-800">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
                >
                  Close
                </button>
                {detailModalItem.link && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!detailModalItem.is_read) handleToggleRead(detailModalItem);
                      const target = detailModalItem.link;
                      setDetailModalItem(null);
                      navigate(target);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition"
                  >
                    Open Relevant Module →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

