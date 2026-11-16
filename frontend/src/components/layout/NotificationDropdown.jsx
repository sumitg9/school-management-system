import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { notificationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TYPE_CONFIG = {
  fee: {
    icon: '💰',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    label: 'Fee Notice',
  },
  attendance: {
    icon: '📊',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'Attendance',
  },
  exam: {
    icon: '📝',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    label: 'Exam & Grades',
  },
  assignment: {
    icon: '📋',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    label: 'Assignment',
  },
  communication: {
    icon: '💬',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
    label: 'PTM & Message',
  },
  announcement: {
    icon: '📢',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'Announcement',
  },
  system: {
    icon: '⚙️',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: 'System Alert',
  },
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

export default function NotificationDropdown() {
  const { user, activeRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);

  // Compute effective role: prefer activeRole from switcher, then user's assigned role
  const currentRole = activeRole || user?.roles?.[0] || user?.role || 'admin';
  const currentEmail = user?.email || '';

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll({
        role: currentRole,
        userEmail: currentEmail,
        isRead: activeTab === 'unread' ? 'unread' : 'all',
        per_page: 8,
      });

      if (res && res.success) {
        setNotifications(res.data || []);
      }

      // Count unread
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
    fetchNotifications();

    // Listen for custom real-time events triggered from broadcasts or actions
    const handleUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener('sms:notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('sms:notifications-updated', handleUpdate);
    };
  }, [currentRole, currentEmail, activeTab]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationAPI.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead({
        role: currentRole,
        userEmail: currentEmail,
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await notificationAPI.markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Topbar Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition focus:outline-hidden focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-xl block leading-none">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white font-bold text-[10px] rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🔔</span>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Notifications</h3>
                <p className="text-[11px] text-blue-200">
                  {unreadCount === 0 ? 'All caught up!' : `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs bg-white/15 hover:bg-white/25 text-white font-medium px-2.5 py-1 rounded transition"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex border-b border-gray-100 bg-gray-50/70 text-xs font-medium text-gray-600 px-3 pt-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-2 px-3 border-b-2 transition ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`pb-2 px-3 border-b-2 flex items-center space-x-1.5 transition ${
                activeTab === 'unread'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-semibold text-gray-700">No notifications here</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeTab === 'unread' ? 'You have read all your alerts.' : 'No notification history found.'}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const typeCfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.announcement;
                const isUrgent = notif.priority === 'urgent';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start space-x-3 cursor-pointer hover:bg-gray-50 transition relative group ${
                      !notif.is_read ? 'bg-blue-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Unread Accent Left Bar */}
                    {!notif.is_read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
                    )}

                    {/* Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 border ${
                        typeCfg.color
                      } ${isUrgent ? 'ring-2 ring-red-400' : ''}`}
                    >
                      {typeCfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <h4
                          className={`text-xs truncate ${
                            !notif.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5 leading-snug">
                        {notif.message}
                      </p>

                      {/* Meta chips */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {notif.student_name && (
                          <span className="inline-flex items-center text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium border border-indigo-100">
                            👨‍🎓 {notif.student_name}
                          </span>
                        )}
                        {notif.priority === 'urgent' && (
                          <span className="inline-flex items-center text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                        {notif.priority === 'high' && (
                          <span className="inline-flex items-center text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                            High Priority
                          </span>
                        )}
                        {notif.metadata?.amount && (
                          <span className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-100">
                            {notif.metadata.amount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-col items-center space-y-1 flex-shrink-0 self-center">
                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkAsRead(e, notif.id)}
                          title="Mark as read"
                          className="w-2.5 h-2.5 bg-blue-600 rounded-full hover:scale-125 transition"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-blue-700 hover:text-blue-900 font-bold flex items-center space-x-1 group"
            >
              <span>Open Notification Center</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
            <span className="text-[11px] text-gray-400">
              {notifications.length} shown
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

