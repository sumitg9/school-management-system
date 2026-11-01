import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { examAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';

const ExamDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatDate } = useSettings();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    setLoading(true);
    try {
      const response = await examAPI.getById(id);
      if (response.success) {
        setExam(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch exam details');
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const getTypeVariant = (type) => {
    switch (type) {
      case 'midterm': return 'info';
      case 'final': return 'primary';
      case 'quiz': return 'warning';
      case 'practical': return 'success';
      default: return 'default';
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'schedule', name: 'Schedule', icon: '📅' },
    { id: 'grades', name: 'Grades', icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Exam not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/exams')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Exam Details</h1>
              <p className="text-gray-600 mt-1">View exam information</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/exams/${id}/grades`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Manage Grades</span>
            </button>
            <button
              onClick={() => navigate(`/exams/${id}/edit`)}
              className="btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exam Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-purple-600 font-bold text-3xl">📝</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{exam.name}</h2>
                <p className="text-gray-600 mt-1">{exam.academic_year?.name || '-'}</p>
              </div>
              <Badge variant={getTypeVariant(exam.type)}>
                {exam.type}
              </Badge>
            </div>
            <p className="text-gray-600 mt-3">{exam.description || 'No description available'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Marks</p>
              <p className="text-3xl font-bold text-gray-900">{exam.total_marks || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💯</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Passing Marks</p>
              <p className="text-3xl font-bold text-green-600">{exam.passing_marks || 0}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="text-2xl font-bold text-purple-600">
                {exam.start_date && exam.end_date
                  ? `${Math.ceil((new Date(exam.end_date) - new Date(exam.start_date)) / (1000 * 60 * 60 * 24))} days`
                  : '-'
                }
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pass %</p>
              <p className="text-2xl font-bold text-yellow-600">
                {exam.total_marks && exam.passing_marks
                  ? `${((exam.passing_marks / exam.total_marks) * 100).toFixed(1)}%`
                  : '-'
                }
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exam Name:</span>
                    <span className="font-medium text-gray-900">{exam.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Academic Year:</span>
                    <span className="font-medium text-gray-900">{exam.academic_year?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <Badge variant={getTypeVariant(exam.type)}>
                      {exam.type}
                    </Badge>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-600 mb-1">Description:</span>
                    <span className="font-medium text-gray-900">{exam.description || '-'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Marks Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Marks:</span>
                    <span className="font-medium text-gray-900">{exam.total_marks || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Passing Marks:</span>
                    <span className="font-medium text-gray-900">{exam.passing_marks || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pass Percentage:</span>
                    <span className="font-medium text-gray-900">
                      {exam.total_marks && exam.passing_marks
                        ? `${((exam.passing_marks / exam.total_marks) * 100).toFixed(1)}%`
                        : '-'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Schedule</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(exam.start_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">End Date:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(exam.end_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">
                    {exam.start_date && exam.end_date
                      ? `${Math.ceil((new Date(exam.end_date) - new Date(exam.start_date)) / (1000 * 60 * 60 * 24))} days`
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Manage grades for this exam</p>
              <button
                onClick={() => navigate(`/exams/${id}/grades`)}
                className="btn-primary"
              >
                Go to Grades Management
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamDetail;

