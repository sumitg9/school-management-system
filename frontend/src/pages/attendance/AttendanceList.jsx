import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { attendanceAPI, classAPI, sectionAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';

const AttendanceList = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { formatDate } = useSettings();
  const {
    isStudent,
    isTeacher,
    currentStudent,
    studentLoading,
    filterTeacherClasses,
    filterTeacherSections,
    getTeacherAssignedClassIds,
    getTeacherAssignedSectionIds,
    hasPermission,
    isAdmin,
  } = useAuth();

  const [attendances, setAttendances] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Student specific stats
  const [studentStats, setStudentStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0,
  });

  // Date range preset for students ('this_month', 'last_30_days', 'all', 'custom', 'single')
  const [datePreset, setDatePreset] = useState('this_month');

  // Filters state
  const [filters, setFilters] = useState(() => {
    // For students, start with current month range; for staff, start with today's date
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    return {
      page: 1,
      per_page: 20,
      class_id: '',
      section_id: '',
      date: '',
      start_date: firstDayOfMonth,
      end_date: todayStr,
      status: '',
    };
  });

  // Fetch classes and all sections only for staff
  useEffect(() => {
    if (!isStudent()) {
      fetchClasses();
      fetchAllSections();
    }
  }, [isStudent()]);

  const fetchAllSections = async () => {
    try {
      const response = await sectionAPI.getAll({ per_page: 200 });
      if (response.success) {
        setAllSections(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching all sections:', error);
    }
  };

  // Fetch sections when class changes (staff only)
  useEffect(() => {
    if (!isStudent()) {
      if (filters.class_id) {
        fetchSections(filters.class_id);
      } else {
        setSections([]);
        setFilters(prev => ({ ...prev, section_id: '' }));
      }
    }
  }, [filters.class_id, isStudent()]);

  // Fetch student stats when in student mode
  const fetchStudentStats = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const res = await attendanceAPI.getStudentStats(studentId);
      if (res.success && res.data) {
        setStudentStats(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch student attendance stats:', err);
    }
  }, []);

  // Fetch attendances whenever filters change or student profile resolves
  useEffect(() => {
    if (isStudent()) {
      if (currentStudent?.id) {
        fetchAttendances();
        fetchStudentStats(currentStudent.id);
      } else if (!studentLoading) {
        setLoading(false);
      }
    } else {
      fetchAttendances();
    }
  }, [filters, isStudent(), currentStudent?.id, studentLoading]);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll({ per_page: 100 });
      if (response.success) {
        setClasses(filterTeacherClasses(response.data));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await sectionAPI.getAll({ class_id: classId, per_page: 100 });
      if (response.success) {
        setSections(isTeacher() ? filterTeacherSections(response.data || [], classes) : (response.data || []));
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const queryParams = { ...filters };

      // Strictly lock to current student when in student view
      if (isStudent()) {
        if (!currentStudent?.id) {
          setLoading(false);
          return;
        }
        queryParams.student_id = currentStudent.id;
        // Never allow filtering by other class or section
        delete queryParams.class_id;
        delete queryParams.section_id;
      }

      // Teacher scoping: lock to teacher's assigned classes/sections
      if (isTeacher()) {
        const assignedClassIds = Array.from(getTeacherAssignedClassIds(classes) || []);
        if (assignedClassIds.length > 0) {
          if (!queryParams.class_id) {
            queryParams.class_ids = assignedClassIds;
          }
        }
      }

      const response = await attendanceAPI.getAll(queryParams);
      if (response.success) {
        let records = response.data || [];
        if (isTeacher()) {
          const classIds = getTeacherAssignedClassIds(classes) || new Set();
          const effectiveSecs = allSections.length > 0 ? allSections : sections;
          const secIds = getTeacherAssignedSectionIds(effectiveSecs, classes) || new Set();
          records = records.filter(rec => {
            if (rec.section_id) {
              return secIds.has(String(rec.section_id));
            }
            return rec.class_id ? classIds.has(String(rec.class_id)) : false;
          });
        }
        setAttendances(records);
        setPagination(response.meta ? {
          ...response.meta,
          total: isTeacher() ? records.length : response.meta.total,
        } : null);
      }
    } catch (error) {
      toast.error('Failed to fetch attendance records');
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setFilters(prev => ({
        ...prev,
        page: 1,
        date: '',
        start_date: firstDay,
        end_date: todayStr,
      }));
    } else if (preset === 'last_30_days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFilters(prev => ({
        ...prev,
        page: 1,
        date: '',
        start_date: past30,
        end_date: todayStr,
      }));
    } else if (preset === 'all') {
      setFilters(prev => ({
        ...prev,
        page: 1,
        date: '',
        start_date: '',
        end_date: '',
      }));
    } else if (preset === 'single') {
      setFilters(prev => ({
        ...prev,
        page: 1,
        date: todayStr,
        start_date: '',
        end_date: '',
      }));
    }
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Attendance Record',
      message: 'Are you sure you want to delete this attendance record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await attendanceAPI.delete(id);
        toast.success('Attendance record deleted successfully');
        fetchAttendances();
        if (isStudent() && currentStudent?.id) {
          fetchStudentStats(currentStudent.id);
        }
      } catch (error) {
        toast.error('Failed to delete attendance record');
        console.error('Error deleting attendance:', error);
      }
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'danger';
      case 'late': return 'warning';
      case 'excused':
      case 'half-day':
      case 'on-leave': return 'info';
      default: return 'default';
    }
  };

  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    } catch (_) {
      return '';
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      const hour = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (_) {
      return timeStr;
    }
  };

  // Student columns
  const studentColumns = useMemo(() => [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{formatDate(row.date)}</div>
          <div className="text-xs text-gray-500 font-medium">{getDayOfWeek(row.date)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '-'}
        </Badge>
      ),
    },
    {
      key: 'check_in_time',
      label: 'Check-In',
      render: (row) => (
        <span className="text-sm text-gray-700 font-mono">
          {formatTime(row.check_in_time)}
        </span>
      ),
    },
    {
      key: 'check_out_time',
      label: 'Check-Out',
      render: (row) => (
        <span className="text-sm text-gray-700 font-mono">
          {formatTime(row.check_out_time)}
        </span>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (row) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {row.remarks || '-'}
        </div>
      ),
    },
  ], [formatDate]);

  // Staff columns
  const staffColumns = useMemo(() => [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => formatDate(row.date),
    },
    {
      key: 'student',
      label: 'Student',
      render: (row) => row.student ? (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.student.first_name} {row.student.last_name}
          </div>
          <div className="text-sm text-gray-500">{row.student.admission_number}</div>
        </div>
      ) : '-',
    },
    {
      key: 'class',
      label: 'Class & Section',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.class?.name || '-'}</div>
          <div className="text-sm text-gray-500">{row.section?.name || '-'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (row) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {row.remarks || '-'}
        </div>
      ),
    },
  ], [formatDate]);

  const staffActions = (row) => (
    <>
      {hasPermission('edit-attendance') && (
        <button
          onClick={() => navigate(`/attendance/${row.id}/edit`)}
          className="text-green-600 hover:text-green-900 cursor-pointer"
          title="Edit"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {isAdmin() && (
        <button
          onClick={() => handleDelete(row.id)}
          className="text-red-600 hover:text-red-900 cursor-pointer"
          title="Delete"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </>
  );

  // -------------------------------------------------------------
  // STUDENT VIEW
  // -------------------------------------------------------------
  if (isStudent()) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>📅</span> My Attendance Records
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              View your personalized daily attendance history, check-in records, and statistics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">
              🔒 Personal Student View
            </span>
          </div>
        </div>

        {/* Student Profile & Attendance Summary Card */}
        {studentLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="h-16 bg-gray-100 rounded-xl"></div>
              <div className="h-16 bg-gray-100 rounded-xl"></div>
              <div className="h-16 bg-gray-100 rounded-xl"></div>
              <div className="h-16 bg-gray-100 rounded-xl"></div>
              <div className="h-16 bg-gray-100 rounded-xl"></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            {/* Student Details Bar (Strictly Read-Only - No other student or class selection) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-xs">
                  {currentStudent ? `${currentStudent.first_name?.[0] || 'S'}${currentStudent.last_name?.[0] || ''}` : '👨‍🎓'}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'Enrolled Student'}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    Admission No: <span className="font-semibold text-gray-800">{currentStudent?.admission_number || 'N/A'}</span>
                    {currentStudent?.roll_number && (
                      <span className="ml-2 pl-2 border-l border-gray-300">
                        Roll: <span className="font-semibold text-gray-800">{currentStudent.roll_number}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Locked Class & Section Info */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Assigned Class:</span>
                <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold">
                  {currentStudent?.class?.name || (currentStudent?.class_id ? `Class ${currentStudent.class_id}` : 'Class 10')}
                </span>
                <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-bold">
                  {currentStudent?.section?.name || (currentStudent?.section_id ? `Section ${currentStudent.section_id}` : 'Section A')}
                </span>
              </div>
            </div>

            {/* Attendance Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-center">
                <p className="text-xs font-medium text-gray-500">Total Recorded</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{studentStats.total} <span className="text-xs font-normal text-gray-500">Days</span></p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center">
                <p className="text-xs font-medium text-emerald-700 flex items-center justify-center gap-1">
                  <span>✓</span> Present
                </p>
                <p className="text-xl font-bold text-emerald-800 mt-1">{studentStats.present} <span className="text-xs font-normal text-emerald-600">Days</span></p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-center">
                <p className="text-xs font-medium text-red-700 flex items-center justify-center gap-1">
                  <span>✕</span> Absent
                </p>
                <p className="text-xl font-bold text-red-800 mt-1">{studentStats.absent} <span className="text-xs font-normal text-red-600">Days</span></p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center">
                <p className="text-xs font-medium text-amber-700 flex items-center justify-center gap-1">
                  <span>⏰</span> Late / Excused
                </p>
                <p className="text-xl font-bold text-amber-800 mt-1">{(studentStats.late || 0) + (studentStats.excused || 0)} <span className="text-xs font-normal text-amber-600">Days</span></p>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-3.5 text-center">
                <p className="text-xs font-medium text-indigo-700">Attendance Rate</p>
                <p className={`text-xl font-extrabold mt-1 ${
                  studentStats.percentage >= 75 ? 'text-emerald-700' : studentStats.percentage >= 60 ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {studentStats.percentage}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Student Specific Filters (Date Presets, Date Pickers, Status - Strictly No Class/Section) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Filter By Date:</span>
              <div className="inline-flex rounded-xl bg-gray-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('this_month')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    datePreset === 'this_month' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('last_30_days')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    datePreset === 'last_30_days' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    datePreset === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Records
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('custom')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    datePreset === 'custom' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Custom Range
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('single')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    datePreset === 'single' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Specific Date
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                handleDatePresetChange('this_month');
                handleFilterChange('status', '');
              }}
              className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer self-end md:self-auto"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {datePreset === 'single' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={filters.date || ''}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="input-field text-xs"
                />
              </div>
            ) : datePreset === 'custom' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.start_date || ''}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.end_date || ''}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 flex items-center text-xs text-gray-500 italic pt-2">
                Showing {datePreset === 'this_month' ? 'records from the current month' : datePreset === 'last_30_days' ? 'records from the past 30 days' : 'all recorded attendance sessions'}.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Attendance Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input-field text-xs"
              >
                <option value="">All Statuses (Present, Absent, Late)</option>
                <option value="present">Present Only</option>
                <option value="absent">Absent Only</option>
                <option value="late">Late Only</option>
                <option value="excused">Excused / On-Leave</option>
              </select>
            </div>
          </div>
        </div>

        {/* Student Attendance Records Table (No action buttons, no other students) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <DataTable
            columns={studentColumns}
            data={attendances}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            actions={null}
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STAFF VIEW (Admin, Super Admin, Teacher, Back Office)
  // -------------------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
          <p className="text-gray-600 text-sm mt-1">View, track, and manage school attendance registers</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasPermission('mark-attendance') && (
            <button
              onClick={() => navigate('/attendance/mark')}
              className="btn-primary flex items-center space-x-2 text-xs py-2 px-4 rounded-xl shadow cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Mark Attendance</span>
            </button>
          )}
          {hasPermission('view-reports') && (
            <button
              onClick={() => navigate('/attendance/report')}
              className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 flex items-center space-x-2 text-xs font-semibold cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Reports</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Class</label>
            <select
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="input-field text-xs"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Section</label>
            <select
              value={filters.section_id}
              onChange={(e) => handleFilterChange('section_id', e.target.value)}
              className="input-field text-xs"
              disabled={!filters.class_id}
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field text-xs"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  per_page: 20,
                  class_id: '',
                  section_id: '',
                  date: new Date().toISOString().split('T')[0],
                  status: '',
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <DataTable
          columns={staffColumns}
          data={attendances}
          loading={loading}
          pagination={pagination}
          onPageChange={handlePageChange}
          actions={staffActions}
        />
      </div>
    </div>
  );
};

export default AttendanceList;
