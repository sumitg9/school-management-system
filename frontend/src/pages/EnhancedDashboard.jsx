import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI, teacherAPI, classAPI, attendanceAPI, examAPI, feeAPI, assignmentAPI } from '../services/api';
import Badge from '../components/common/Badge';
import { useSettings } from '../context/SettingsContext';

const EnhancedDashboard = () => {
  const navigate = useNavigate();
  const { formatDateTime } = useSettings();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: { total: 0, active: 0, inactive: 0 },
    teachers: { total: 0, active: 0, inactive: 0 },
    classes: { total: 0 },
    attendance: { today: 0, present: 0, absent: 0, percentage: 0 },
    exams: { upcoming: 0, ongoing: 0, completed: 0 },
    fees: { total: 0, paid: 0, pending: 0, overdue: 0 },
    assignments: { total: 0, active: 0, overdue: 0 },
  });

  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all statistics in parallel
      const [
        studentsRes,
        teachersRes,
        classesRes,
        attendanceRes,
        examsRes,
        feesRes,
        assignmentsRes,
      ] = await Promise.all([
        studentAPI.getAll({ per_page: 1 }),
        teacherAPI.getAll({ per_page: 1 }),
        classAPI.getAll({ per_page: 1 }),
        attendanceAPI.getAll({ per_page: 1, date: new Date().toISOString().split('T')[0] }),
        examAPI.getAll({ per_page: 1 }),
        feeAPI.getAll({ per_page: 1 }),
        assignmentAPI.getAll({ per_page: 1 }),
      ]);

      setStats({
        students: {
          total: studentsRes.meta?.total || 0,
          active: studentsRes.meta?.total || 0,
          inactive: 0,
        },
        teachers: {
          total: teachersRes.meta?.total || 0,
          active: teachersRes.meta?.total || 0,
          inactive: 0,
        },
        classes: {
          total: classesRes.meta?.total || 0,
        },
        attendance: {
          today: attendanceRes.meta?.total || 0,
          present: 0,
          absent: 0,
          percentage: 0,
        },
        exams: {
          upcoming: examsRes.meta?.total || 0,
          ongoing: 0,
          completed: 0,
        },
        fees: {
          total: feesRes.meta?.total || 0,
          paid: 0,
          pending: 0,
          overdue: 0,
        },
        assignments: {
          total: assignmentsRes.meta?.total || 0,
          active: assignmentsRes.meta?.total || 0,
          overdue: 0,
        },
      });

      // Mock recent activities
      setRecentActivities([
        { id: 1, type: 'student', action: 'New student enrolled', time: '5 minutes ago', icon: '👨‍🎓' },
        { id: 2, type: 'attendance', action: 'Attendance marked for Class 10-A', time: '15 minutes ago', icon: '📊' },
        { id: 3, type: 'exam', action: 'Midterm exam grades published', time: '1 hour ago', icon: '📝' },
        { id: 4, type: 'fee', action: 'Fee payment received', time: '2 hours ago', icon: '💰' },
        { id: 5, type: 'assignment', action: 'New assignment created', time: '3 hours ago', icon: '📚' },
      ]);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center gap-2 bg-white border border-gray-200 text-gray-800 shadow-sm px-4 py-2 rounded-xl text-sm font-semibold">
          <span className="text-blue-600">🕒</span>
          <span className="font-mono text-gray-900">{formatDateTime(currentTime)}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Students */}
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer" onClick={() => navigate('/students')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{stats.students.total}</p>
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
              <p className="text-3xl font-bold text-gray-900">{stats.teachers.total}</p>
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
              <p className="text-3xl font-bold text-gray-900">{stats.classes.total}</p>
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
              <p className="text-3xl font-bold text-gray-900">{stats.attendance.percentage}%</p>
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

