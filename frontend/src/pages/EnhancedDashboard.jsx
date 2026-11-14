import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI, teacherAPI, classAPI, attendanceAPI, examAPI, feeAPI, assignmentAPI } from '../services/api';
import Badge from '../components/common/Badge';
import { useSettings } from '../context/SettingsContext';

// Isolated clock component so second-by-second ticks only re-render this badge
const LiveClock = memo(({ formatDateTime }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 text-gray-800 shadow-sm px-4 py-2 rounded-xl text-sm font-semibold">
      <span className="text-blue-600">🕒</span>
      <span className="font-mono text-gray-900">{formatDateTime(time)}</span>
    </div>
  );
});

LiveClock.displayName = 'LiveClock';

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const { formatDateTime } = useSettings();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    students: { total: 0, active: 0, inactive: 0 },
    teachers: { total: 0, active: 0, inactive: 0 },
    classes: { total: 0 },
    attendance: { today: 0, present: 0, absent: 0, percentage: 0 },
    exams: { upcoming: 0, ongoing: 0, completed: 0 },
    fees: { total: 0, paid: 0, pending: 0, overdue: 0 },
    assignments: { total: 0, active: 0, overdue: 0 },
  });

  const [recentActivities, setRecentActivities] = useState([
    { id: 1, type: 'student', action: 'Student management active', time: 'Active', icon: '👨‍🎓' },
    { id: 2, type: 'attendance', action: 'Daily attendance tracker active', time: 'Today', icon: '📊' },
    { id: 3, type: 'exam', action: 'Examinations scheduled', time: 'This Term', icon: '📝' },
    { id: 4, type: 'fee', action: 'Fee management portal updated', time: 'Active', icon: '💰' },
    { id: 5, type: 'assignment', action: 'Assignment system ready', time: 'Active', icon: '📚' },
  ]);

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    }

    try {
      // Fetch all statistics in parallel using allSettled to ensure resilient loading
      const results = await Promise.allSettled([
        studentAPI.getAll({ per_page: 1 }),
        teacherAPI.getAll({ per_page: 1 }),
        classAPI.getAll({ per_page: 1 }),
        attendanceAPI.getAll({ per_page: 1, date: new Date().toISOString().split('T')[0] }),
        examAPI.getAll({ per_page: 1 }),
        feeAPI.getAll({ per_page: 1 }),
        assignmentAPI.getAll({ per_page: 1 }),
      ]);

      const [
        studentsRes,
        teachersRes,
        classesRes,
        attendanceRes,
        examsRes,
        feesRes,
        assignmentsRes,
      ] = results.map(r => (r.status === 'fulfilled' ? r.value : null));

      setStats(prev => ({
        students: {
          total: studentsRes?.meta?.total ?? prev.students.total,
          active: studentsRes?.meta?.total ?? prev.students.active,
          inactive: 0,
        },
        teachers: {
          total: teachersRes?.meta?.total ?? prev.teachers.total,
          active: teachersRes?.meta?.total ?? prev.teachers.active,
          inactive: 0,
        },
        classes: {
          total: classesRes?.meta?.total ?? prev.classes.total,
        },
        attendance: {
          today: attendanceRes?.meta?.total ?? prev.attendance.today,
          present: prev.attendance.present,
          absent: prev.attendance.absent,
          percentage: prev.attendance.percentage,
        },
        exams: {
          upcoming: examsRes?.meta?.total ?? prev.exams.upcoming,
          ongoing: prev.exams.ongoing,
          completed: prev.exams.completed,
        },
        fees: {
          total: feesRes?.meta?.total ?? prev.fees.total,
          paid: prev.fees.paid,
          pending: prev.fees.pending,
          overdue: prev.fees.overdue,
        },
        assignments: {
          total: assignmentsRes?.meta?.total ?? prev.assignments.total,
          active: assignmentsRes?.meta?.total ?? prev.assignments.active,
          overdue: prev.assignments.overdue,
        },
      }));

      // Update dynamic recent activities if real data is available
      const dynamicActivities = [];
      if (studentsRes?.data?.[0]) {
        const s = studentsRes.data[0];
        dynamicActivities.push({
          id: 'student-latest',
          type: 'student',
          action: `Student enrolled: ${s.first_name || ''} ${s.last_name || ''}`.trim(),
          time: 'Recently',
          icon: '👨‍🎓',
        });
      }
      if (teachersRes?.data?.[0]) {
        const t = teachersRes.data[0];
        dynamicActivities.push({
          id: 'teacher-latest',
          type: 'teacher',
          action: `Teacher active: ${t.first_name || ''} ${t.last_name || ''}`.trim(),
          time: 'Recently',
          icon: '👨‍🏫',
        });
      }
      dynamicActivities.push(
        { id: 2, type: 'attendance', action: 'Daily attendance tracker active', time: 'Today', icon: '📊' },
        { id: 3, type: 'exam', action: 'Examinations scheduled', time: 'This Term', icon: '📝' },
        { id: 4, type: 'fee', action: 'Fee management portal updated', time: 'Active', icon: '💰' }
      );
      setRecentActivities(dynamicActivities);

      if (isManual) {
        toast.success('Dashboard data updated');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (isManual) {
        toast.error('Failed to update dashboard data');
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const quickActions = [
    { name: 'Add Student', icon: '👨‍🎓', color: 'blue', path: '/students/create' },
    { name: 'Add Teacher', icon: '👨‍🏫', color: 'green', path: '/teachers/create' },
    { name: 'Mark Attendance', icon: '📊', color: 'orange', path: '/attendance/mark' },
    { name: 'Create Exam', icon: '📝', color: 'red', path: '/exams/create' },
    { name: 'Add Fee', icon: '💰', color: 'emerald', path: '/fees/create' },
    { name: 'Create Assignment', icon: '📚', color: 'purple', path: '/assignments/create' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center gap-3">
          <LiveClock formatDateTime={formatDateTime} />

          {/* Reload Icon Button at top right corner */}
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            title="Refresh dashboard data"
            aria-label="Refresh dashboard data"
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Reload'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Students */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/students')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className={`text-3xl font-bold text-gray-900 ${initialLoading ? 'opacity-40 animate-pulse' : ''}`}>
                {stats.students.total}
              </p>
              <p className="text-sm text-green-600 mt-1">↑ {stats.students.active} Active</p>
            </div>
            <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-3xl">👨‍🎓</span>
            </div>
          </div>
        </div>

        {/* Teachers */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/teachers')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Teachers</p>
              <p className={`text-3xl font-bold text-gray-900 ${initialLoading ? 'opacity-40 animate-pulse' : ''}`}>
                {stats.teachers.total}
              </p>
              <p className="text-sm text-green-600 mt-1">↑ {stats.teachers.active} Active</p>
            </div>
            <div className="h-16 w-16 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-3xl">👨‍🏫</span>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/classes')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Classes</p>
              <p className={`text-3xl font-bold text-gray-900 ${initialLoading ? 'opacity-40 animate-pulse' : ''}`}>
                {stats.classes.total}
              </p>
              <p className="text-sm text-gray-600 mt-1">All Sections</p>
            </div>
            <div className="h-16 w-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-3xl">📚</span>
            </div>
          </div>
        </div>

        {/* Attendance Today */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/attendance')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Attendance Today</p>
              <p className={`text-3xl font-bold text-gray-900 ${initialLoading ? 'opacity-40 animate-pulse' : ''}`}>
                {stats.attendance.percentage}%
              </p>
              <p className="text-sm text-gray-600 mt-1">{stats.attendance.today} Records</p>
            </div>
            <div className="h-16 w-16 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-3xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Exams */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Examinations</h3>
            <span className="text-2xl">📝</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Upcoming</span>
              <Badge variant="info">{stats.exams.upcoming}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ongoing</span>
              <Badge variant="warning">{stats.exams.ongoing}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed</span>
              <Badge variant="success">{stats.exams.completed}</Badge>
            </div>
          </div>
          <button
            onClick={() => navigate('/exams')}
            className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800"
          >
            View All Exams →
          </button>
        </div>

        {/* Fees */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Fee Collection</h3>
            <span className="text-2xl">💰</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <Badge variant="primary">{stats.fees.total}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paid</span>
              <Badge variant="success">{stats.fees.paid}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending</span>
              <Badge variant="warning">{stats.fees.pending}</Badge>
            </div>
          </div>
          <button
            onClick={() => navigate('/fees')}
            className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800"
          >
            View All Fees →
          </button>
        </div>

        {/* Assignments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Assignments</h3>
            <span className="text-2xl">📚</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <Badge variant="primary">{stats.assignments.total}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active</span>
              <Badge variant="success">{stats.assignments.active}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Overdue</span>
              <Badge variant="danger">{stats.assignments.overdue}</Badge>
            </div>
          </div>
          <button
            onClick={() => navigate('/assignments')}
            className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800"
          >
            View All Assignments →
          </button>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.name}
                onClick={() => navigate(action.path)}
                className={`p-4 rounded-lg border-2 border-${action.color}-200 hover:border-${action.color}-400 hover:bg-${action.color}-50 transition flex flex-col items-center space-y-2`}
              >
                <span className="text-3xl">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700">{action.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{activity.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800">
            View All Activity →
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;

