import React, { useState, useEffect, useId, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORY_CONFIG = {
  sports: {
    label: 'Sports & Athletics',
    icon: '🏆',
    pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
    border: 'border-l-emerald-500',
  },
  academic: {
    label: 'Academic & STEM',
    icon: '🎓',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    dot: 'bg-indigo-500',
    border: 'border-l-indigo-500',
  },
  exam: {
    label: 'Exams & Tests',
    icon: '📝',
    pill: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
    border: 'border-l-purple-500',
  },
  ptm: {
    label: 'Parent-Teacher Meeting',
    icon: '👨‍👩‍👧',
    pill: 'bg-sky-100 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
    border: 'border-l-sky-500',
  },
  cultural: {
    label: 'Cultural & Arts',
    icon: '🎭',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
  },
  holiday: {
    label: 'Campus Holiday',
    icon: '🏖️',
    pill: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
    border: 'border-l-rose-500',
  },
  workshop: {
    label: 'Workshops & Fairs',
    icon: '🌟',
    pill: 'bg-teal-100 text-teal-800 border-teal-200',
    dot: 'bg-teal-500',
    border: 'border-l-teal-500',
  },
  administrative: {
    label: 'Administrative',
    icon: '🏢',
    pill: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
    border: 'border-l-gray-400',
  },
};

const AUDIENCE_LABELS = {
  all: '🌐 School-wide (All)',
  parents: '👨‍👩‍👧 Parents Only',
  teachers: '👨‍🏫 Teachers Only',
  students: '👨‍🎓 Students Only',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EventManagement() {
  const navigate = useNavigate();
  const { user, activeRole, hasPermission } = useAuth();

  const currentRole = activeRole || user?.roles?.[0] || user?.role || 'admin';
  const canManage = hasPermission('manage-events') || currentRole === 'admin' || currentRole === 'super-admin' || currentRole === 'teacher';

  // Navigation State (Default to current system date)
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'agenda' | 'list'

  // Data State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAudience, setSelectedAudience] = useState('all');

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic',
    startDate: today.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    isAllDay: false,
    venue: '',
    targetAudience: 'all',
    targetGrade: 'All Classes',
    organizer: '',
    contactEmail: '',
    featured: false,
    priority: 'normal',
    color: 'blue',
    link: '',
    attendeesCount: '',
    broadcastNotification: false,
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch Events
  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await eventsAPI.getAll({
        category: selectedCategory,
        audience: selectedAudience,
        search,
      });
      if (res && res.success) {
        setEvents(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const handleEventsUpdated = () => loadEvents();
    window.addEventListener('sms:events-updated', handleEventsUpdated);
    return () => window.removeEventListener('sms:events-updated', handleEventsUpdated);
  }, [selectedCategory, selectedAudience, search]);

  // Calendar Math Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Build Month Matrix
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: false,
      isPrevMonth: true,
    });
  }

  // Active month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday =
      d === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    calendarDays.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: true,
      isToday,
    });
  }

  // Trailing padding days to fill 35 or 42 grid cells
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonth = month + 2 > 12 ? 1 : month + 2;
    const nextYear = month + 2 > 12 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dayNumber: d,
      dateStr,
      isCurrentMonth: false,
      isNextMonth: true,
    });
  }

  // Map events to day string
  const eventsByDate = {};
  events.forEach((evt) => {
    if (evt.startDate) {
      if (!eventsByDate[evt.startDate]) {
        eventsByDate[evt.startDate] = [];
      }
      eventsByDate[evt.startDate].push(evt);
    }
  });

  // Modal Actions
  const handleOpenCreateModal = (presetDate = null) => {
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      category: 'academic',
      startDate: presetDate || today.toISOString().split('T')[0],
      endDate: presetDate || today.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '12:00',
      isAllDay: false,
      venue: 'Main School Auditorium',
      targetAudience: 'all',
      targetGrade: 'All Classes',
      organizer: user?.name || 'School Administration',
      contactEmail: user?.email || 'admin@school.com',
      featured: false,
      priority: 'normal',
      color: 'blue',
      link: '',
      attendeesCount: '',
      broadcastNotification: false,
    });
    setShowEventModal(true);
  };

  const handleOpenEditModal = (evt) => {
    setEditingEvent(evt);
    setFormData({
      title: evt.title || '',
      description: evt.description || '',
      category: evt.category || 'academic',
      startDate: evt.startDate || '',
      endDate: evt.endDate || evt.startDate || '',
      startTime: evt.startTime || '09:00',
      endTime: evt.endTime || '12:00',
      isAllDay: !!evt.isAllDay,
      venue: evt.venue || '',
      targetAudience: evt.targetAudience || 'all',
      targetGrade: evt.targetGrade || 'All Classes',
      organizer: evt.organizer || '',
      contactEmail: evt.contactEmail || '',
      featured: !!evt.featured,
      priority: evt.priority || 'normal',
      color: evt.color || 'blue',
      link: evt.link || '',
      attendeesCount: evt.attendeesCount || '',
      broadcastNotification: false,
    });
    setDetailEvent(null);
    setShowEventModal(true);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.startDate) {
      alert('Please fill out the event title and start date.');
      return;
    }

    try {
      if (editingEvent) {
        await eventsAPI.update(editingEvent.id, formData);
        showToast('Event updated successfully.');
      } else {
        await eventsAPI.create(formData);
        showToast('New event scheduled and added to calendar.');
      }
      setShowEventModal(false);
      loadEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event.');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm('Are you sure you want to delete this event from the calendar?')) {
      try {
        await eventsAPI.delete(id);
        showToast('Event deleted from calendar.');
        setDetailEvent(null);
        loadEvents();
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  const handleDownloadICal = (evt) => {
    const icalContent = eventsAPI.generateICal(evt);
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(evt.title || 'event').replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Calendar invite (.ics) downloaded.');
  };

  const handleDownloadFullCalendarICal = () => {
    if (events.length === 0) return;
    const allICalParts = events.map(e => {
      const single = eventsAPI.generateICal(e);
      // Extract VEVENT part
      const vEventMatch = single.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
      return vEventMatch ? vEventMatch[0] : '';
    }).filter(Boolean);

    const fullCalendar = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//School Management System//Full Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...allICalParts,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([fullCalendar], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `School_Academic_Calendar_${year}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Full academic calendar exported (.ics).');
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset events to standard demo school events?')) {
      await eventsAPI.resetDefaults();
      showToast('Events restored to demo defaults.');
      loadEvents();
    }
  };

  // Metrics
  const totalEvents = events.length;
  const sportsCulturalCount = events.filter(e => e.category === 'sports' || e.category === 'cultural').length;
  const examsCount = events.filter(e => e.category === 'exam' || e.category === 'academic').length;
  const holidaysCount = events.filter(e => e.category === 'holiday').length;

  // Filtered upcoming events for agenda & list
  const upcomingEvents = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Spotlight featured event
  const spotlightEvent = events.find(e => e.featured) || events[0];

  return (
    <div className="px-[15px] py-6 w-full space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700"
        >
          <span>ℹ️</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">📅</span>
            <h1 className="text-2xl font-black tracking-tight">School Events & Academic Calendar</h1>
          </div>
          <p className="text-sm text-blue-200">
            Institutional schedule, sports championships, exam timetables, PTM conferences, and holidays.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManage && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition flex items-center space-x-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
            >
              <span>➕</span>
              <span>Schedule Event</span>
            </button>
          )}

          <button
            onClick={handleDownloadFullCalendarICal}
            className="bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-3 py-2 rounded-xl backdrop-blur-xs transition flex items-center space-x-1.5"
            title="Export all events into Google/Apple/Outlook Calendar"
          >
            <span>📥</span>
            <span>Export Calendar (.ics)</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="bg-white/10 hover:bg-white/20 text-blue-200 text-xs font-medium px-3 py-2 rounded-xl backdrop-blur-xs transition"
            title="Reset demo events"
          >
            🔄 Reset Defaults
          </button>
        </div>
      </div>

      {/* Spotlight Event Card if available */}
      {spotlightEvent && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
              {CATEGORY_CONFIG[spotlightEvent.category]?.icon || '🌟'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  Featured Event
                </span>
                <span className="text-xs font-semibold text-indigo-900">
                  {spotlightEvent.startDate} • {spotlightEvent.startTime} - {spotlightEvent.endTime}
                </span>
                <span className="text-xs text-gray-500">📍 {spotlightEvent.venue}</span>
              </div>
              <h2 className="text-base font-bold text-gray-900">{spotlightEvent.title}</h2>
              <p className="text-xs text-gray-600 line-clamp-1 max-w-2xl">{spotlightEvent.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setDetailEvent(spotlightEvent)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-1.5 rounded-lg shadow-xs transition"
            >
              Event Details
            </button>
            <button
              onClick={() => handleDownloadICal(spotlightEvent)}
              className="text-xs bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-200 font-semibold px-3 py-1.5 rounded-lg transition"
              title="Add to Google/Apple Calendar"
            >
              Add to Calendar
            </button>
          </div>
        </div>
      )}

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center text-xl text-blue-700 flex-shrink-0">
            🗓️
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Events</p>
            <p className="text-xl font-black text-gray-900">{totalEvents}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-emerald-100 rounded-lg flex items-center justify-center text-xl text-emerald-700 flex-shrink-0">
            🏆
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sports & Arts</p>
            <p className="text-xl font-black text-emerald-700">{sportsCulturalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center text-xl text-purple-700 flex-shrink-0">
            📝
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exams & Academic</p>
            <p className="text-xl font-black text-purple-700">{examsCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-rose-100 rounded-lg flex items-center justify-center text-xl text-rose-700 flex-shrink-0">
            🏖️
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Campus Holidays</p>
            <p className="text-xl font-black text-rose-700">{holidaysCount}</p>
          </div>
        </div>
      </div>

      {/* Calendar Navigation & Mode Switcher */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Month / Year Navigator */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-white transition"
                title="Previous Month"
              >
                ◀
              </button>
              <button
                onClick={handleGoToday}
                className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-white transition"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-white transition"
                title="Next Month"
              >
                ▶
              </button>
            </div>

            <div className="flex items-baseline space-x-2">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {MONTH_NAMES[month]} {year}
              </h2>
            </div>
          </div>

          {/* View Mode Selector Tabs */}
          <div className="inline-flex bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600 self-start sm:self-auto">
            {[
              { id: 'month', label: 'Month View', icon: '🗓️' },
              { id: 'week', label: 'Week View', icon: '📊' },
              { id: 'agenda', label: 'Agenda Schedule', icon: '🕒' },
              { id: 'list', label: 'Card List', icon: '📋' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                  viewMode === tab.id
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'hover:text-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="pt-2 border-t border-gray-100 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, venue, or organizers..."
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

            {/* Audience Filter Dropdown */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-gray-500 font-medium">Audience:</span>
              <select
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Audiences (School-wide)</option>
                <option value="parents">Parents Only</option>
                <option value="teachers">Teachers Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-gray-500 mr-1">Categories:</span>
            {[
              { id: 'all', label: 'All Events', icon: '🌐' },
              { id: 'sports', label: 'Sports', icon: '🏆' },
              { id: 'academic', label: 'Academics', icon: '🎓' },
              { id: 'exam', label: 'Exams', icon: '📝' },
              { id: 'ptm', label: 'PTM Conferences', icon: '👨‍👩‍👧' },
              { id: 'cultural', label: 'Cultural', icon: '🎭' },
              { id: 'holiday', label: 'Holidays', icon: '🏖️' },
              { id: 'workshop', label: 'Workshops', icon: '🌟' },
              { id: 'administrative', label: 'Admin', icon: '🏢' },
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
      </div>

      {/* VIEW MODE 1: Interactive Month Calendar Grid */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center py-2.5 text-xs font-bold text-gray-600">
            {DAY_NAMES.map((d, idx) => (
              <div key={d} className={idx === 0 || idx === 6 ? 'text-rose-500' : ''}>
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 auto-rows-fr">
            {calendarDays.map((dayItem, idx) => {
              const dayEvents = eventsByDate[dayItem.dateStr] || [];
              const isToday = dayItem.isToday;

              return (
                <div
                  key={`${dayItem.dateStr}-${idx}`}
                  className={`min-h-[110px] sm:min-h-[130px] p-1.5 flex flex-col justify-between transition group relative ${
                    !dayItem.isCurrentMonth
                      ? 'bg-gray-50/50 text-gray-400'
                      : 'bg-white hover:bg-blue-50/30'
                  } ${isToday ? 'bg-blue-50/40 ring-2 ring-blue-500 ring-inset' : ''}`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : dayItem.isCurrentMonth
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {dayItem.dayNumber}
                    </span>

                    {/* Quick Add Button on Hover for Admin/Teacher */}
                    {canManage && dayItem.isCurrentMonth && (
                      <button
                        onClick={() => handleOpenCreateModal(dayItem.dateStr)}
                        className="opacity-0 group-hover:opacity-100 text-[11px] text-blue-600 hover:text-blue-800 font-bold p-0.5 rounded transition"
                        title={`Add event on ${dayItem.dateStr}`}
                      >
                        ➕
                      </button>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.academic;
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setDetailEvent(evt)}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold truncate cursor-pointer transition border flex items-center space-x-1 ${cfg.pill} hover:opacity-85 shadow-2xs`}
                          title={`${evt.title} (${evt.startTime || 'All Day'} at ${evt.venue})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setViewMode('agenda');
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline block text-left px-1"
                      >
                        +{dayEvents.length - 3} more...
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center text-xs text-gray-500">
            <span>Displaying schedule across days of the active week</span>
            <span>Click any card to inspect or export .ics calendar invite</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            {calendarDays.slice(0, 7).map((colDay) => {
              const dayEvents = eventsByDate[colDay.dateStr] || [];
              const isToday = colDay.isToday;

              return (
                <div key={colDay.dateStr} className="p-3 min-h-[300px] flex flex-col space-y-2">
                  <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-gray-500 uppercase">
                        {DAY_NAMES[new Date(colDay.dateStr).getDay()]}
                      </p>
                      <p
                        className={`text-sm font-black ${
                          isToday ? 'text-blue-600' : 'text-gray-800'
                        }`}
                      >
                        {colDay.dayNumber} {MONTH_NAMES[month].substring(0, 3)}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleOpenCreateModal(colDay.dateStr)}
                        className="text-xs text-blue-600 hover:text-blue-800 p-1"
                        title="Add event"
                      >
                        ➕
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    {dayEvents.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic py-4 text-center">
                        No events
                      </p>
                    ) : (
                      dayEvents.map((evt) => {
                        const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.academic;
                        return (
                          <div
                            key={evt.id}
                            onClick={() => setDetailEvent(evt)}
                            className={`p-2.5 rounded-xl border border-l-4 ${cfg.border} bg-white shadow-xs hover:shadow-md cursor-pointer transition space-y-1`}
                          >
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${cfg.pill}`}
                            >
                              {cfg.label}
                            </span>
                            <h4 className="text-xs font-bold text-gray-900 leading-tight">
                              {evt.title}
                            </h4>
                            <p className="text-[10px] text-gray-500">
                              ⏰ {evt.isAllDay ? 'All Day' : `${evt.startTime} - ${evt.endTime}`}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              📍 {evt.venue}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: Agenda / Timeline Schedule View */}
      {viewMode === 'agenda' && (
        <div className="space-y-4">
          {upcomingEvents.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
              <span className="text-4xl block mb-2">📅</span>
              <p className="text-sm font-bold text-gray-700">No events found matching your criteria</p>
              <p className="text-xs text-gray-400 mt-1">Try resetting filters or adding a new event.</p>
            </div>
          ) : (
            upcomingEvents.map((evt) => {
              const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.academic;
              const dateObj = new Date(evt.startDate);

              return (
                <div
                  key={evt.id}
                  className={`bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start justify-between gap-4 border-l-4 ${cfg.border}`}
                >
                  {/* Left Date Lockup & Icon */}
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] uppercase font-bold text-blue-600">
                        {dateObj.toLocaleString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xl font-black text-gray-900 leading-none">
                        {dateObj.getDate()}
                      </span>
                      <span className="text-[9px] font-semibold text-gray-500">
                        {dateObj.toLocaleString('en-US', { weekday: 'short' })}
                      </span>
                    </div>

                    {/* Event Content */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${cfg.pill}`}
                        >
                          {cfg.icon} {cfg.label}
                        </span>

                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                          ⏰ {evt.isAllDay ? 'All Day' : `${evt.startTime} - ${evt.endTime}`}
                        </span>

                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                          📍 {evt.venue}
                        </span>

                        {evt.targetGrade && (
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                            🎓 {evt.targetGrade}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-gray-900">{evt.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                        {evt.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-gray-500">
                        <span>👤 Organizer: <strong className="text-gray-700">{evt.organizer}</strong></span>
                        <span>👥 Audience: <strong className="text-gray-700">{AUDIENCE_LABELS[evt.targetAudience] || 'School-wide'}</strong></span>
                        {evt.attendeesCount > 0 && (
                          <span>🎟️ Expected: <strong className="text-gray-700">{evt.attendeesCount} attendees</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <button
                      onClick={() => handleDownloadICal(evt)}
                      className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg font-semibold transition"
                      title="Download .ics file"
                    >
                      📅 .ics
                    </button>

                    {evt.link && (
                      <button
                        onClick={() => navigate(evt.link)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold transition"
                      >
                        Open Link →
                      </button>
                    )}

                    <button
                      onClick={() => setDetailEvent(evt)}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold shadow-xs transition"
                    >
                      View Details
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(evt)}
                          className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
                          title="Edit event"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Delete event"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 4: List / Card View */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((evt) => {
            const cfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.academic;
            return (
              <div
                key={evt.id}
                className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between border-t-4 ${cfg.border}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${cfg.pill}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      📅 {evt.startDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
                    {evt.title}
                  </h3>

                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="space-y-1 text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                    <p className="truncate">⏰ {evt.isAllDay ? 'All Day' : `${evt.startTime} - ${evt.endTime}`}</p>
                    <p className="truncate">📍 {evt.venue}</p>
                    <p className="truncate">👥 {AUDIENCE_LABELS[evt.targetAudience] || 'School-wide'}</p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-gray-100 mt-4">
                  <button
                    onClick={() => handleDownloadICal(evt)}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    + Add to Calendar
                  </button>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setDetailEvent(evt)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-2.5 py-1 rounded-lg transition"
                    >
                      Details
                    </button>
                    {canManage && (
                      <button
                        onClick={() => handleOpenEditModal(evt)}
                        className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-lg font-semibold transition"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {showEventModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📅</span>
                <h2 id="event-modal-title" className="text-base font-bold">
                  {editingEvent ? 'Edit Scheduled Event' : 'Schedule New School Event'}
                </h2>
              </div>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Annual Athletic Meet 2026 - Relay Finals"
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="sports">🏆 Sports & Athletics</option>
                    <option value="academic">🎓 Academic & STEM</option>
                    <option value="exam">📝 Exams & Tests</option>
                    <option value="ptm">👨‍👩‍👧 Parent-Teacher Meeting (PTM)</option>
                    <option value="cultural">🎭 Cultural & Arts</option>
                    <option value="holiday">🏖️ Campus Holiday</option>
                    <option value="workshop">🌟 Workshops & Seminars</option>
                    <option value="administrative">🏢 Administrative & Fee Deadlines</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="all">🌐 School-wide (Students, Parents, Faculty)</option>
                    <option value="parents">👨‍👩‍👧 Parents Only</option>
                    <option value="teachers">👨‍🏫 Faculty / Teachers Only</option>
                    <option value="students">👨‍🎓 Students Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={formData.isAllDay}
                  onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="allDayCheck" className="text-xs font-semibold text-gray-700">
                  All-day event (no specific time slot)
                </label>
              </div>

              {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Venue / Location</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="e.g. Main Auditorium, Sports Ground"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Classes/Grade</label>
                  <input
                    type="text"
                    value={formData.targetGrade}
                    onChange={(e) => setFormData({ ...formData, targetGrade: e.target.value })}
                    placeholder="e.g. All Classes, Class 10"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Agenda</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline activities, guidelines, required documents, or schedule breakdown..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Organizer / In-Charge</label>
                  <input
                    type="text"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                    placeholder="e.g. Sports Dept, Principal Office"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="featuredCheck"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="featuredCheck" className="text-xs font-semibold text-gray-700">
                    Feature on Spotlight Banner
                  </label>
                </div>

                {!editingEvent && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="notifBroadcastCheck"
                      checked={formData.broadcastNotification}
                      onChange={(e) => setFormData({ ...formData, broadcastNotification: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="notifBroadcastCheck" className="text-xs font-semibold text-gray-700">
                      📢 Send notification broadcast to target audience
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition"
                >
                  {editingEvent ? 'Save Changes' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {detailEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-event-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setDetailEvent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">
                  {CATEGORY_CONFIG[detailEvent.category]?.icon || '📅'}
                </span>
                <h2 id="detail-event-title" className="text-sm font-bold text-gray-800">
                  Event Details
                </h2>
              </div>
              <button
                onClick={() => setDetailEvent(null)}
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
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      CATEGORY_CONFIG[detailEvent.category]?.pill || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {CATEGORY_CONFIG[detailEvent.category]?.label || 'Event'}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                    {AUDIENCE_LABELS[detailEvent.targetAudience] || 'School-wide'}
                  </span>
                  {detailEvent.targetGrade && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                      {detailEvent.targetGrade}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-gray-900 pt-1 leading-snug">
                  {detailEvent.title}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400">📅 Date: </span>
                  <strong className="text-gray-800">{detailEvent.startDate}</strong>
                </div>
                <div>
                  <span className="text-gray-400">⏰ Time: </span>
                  <strong className="text-gray-800">
                    {detailEvent.isAllDay ? 'All Day' : `${detailEvent.startTime} - ${detailEvent.endTime}`}
                  </strong>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">📍 Venue: </span>
                  <strong className="text-gray-800">{detailEvent.venue}</strong>
                </div>
                <div>
                  <span className="text-gray-400">👤 Organizer: </span>
                  <strong className="text-gray-800">{detailEvent.organizer}</strong>
                </div>
                {detailEvent.attendeesCount > 0 && (
                  <div>
                    <span className="text-gray-400">🎟️ Capacity: </span>
                    <strong className="text-gray-800">{detailEvent.attendeesCount} attendees</strong>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Description & Details
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/60 p-3 rounded-lg border border-gray-100">
                  {detailEvent.description || 'No additional details provided.'}
                </p>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => handleDownloadICal(detailEvent)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition flex items-center space-x-1"
                >
                  <span>📅</span>
                  <span>Add to Calendar (.ics)</span>
                </button>

                <div className="flex items-center space-x-2">
                  {detailEvent.link && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = detailEvent.link;
                        setDetailEvent(null);
                        navigate(target);
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                    >
                      Open Linked Module →
                    </button>
                  )}

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(detailEvent)}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
