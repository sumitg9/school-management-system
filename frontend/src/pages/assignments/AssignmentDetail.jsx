import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { assignmentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';

const AssignmentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatDate } = useSettings();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    setLoading(true);
    try {
      const response = await assignmentAPI.getById(id);
      if (response.success) {
        setAssignment(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch assignment details');
      navigate('/assignments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    if (due < today) return 'danger';
    if (due.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Assignment not found</p>
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
              onClick={() => navigate('/assignments')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assignment Details</h1>
              <p className="text-gray-600 mt-1">View assignment information</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/assignments/${id}/submissions`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>View Submissions</span>
            </button>
            <button
              onClick={() => navigate(`/assignments/${id}/edit`)}
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

      {/* Assignment Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-600 font-bold text-3xl">📝</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{assignment.title}</h2>
                <p className="text-gray-600 mt-1">
                  {assignment.class?.name} - {assignment.section?.name} | {assignment.subject?.name}
                </p>
              </div>
              <Badge variant={getStatusVariant(assignment.due_date)}>
                {new Date(assignment.due_date) < new Date() ? 'Overdue' : 'Active'}
              </Badge>
            </div>
            <p className="text-gray-600 mt-3">{assignment.description}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Marks</p>
              <p className="text-3xl font-bold text-gray-900">{assignment.total_marks || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💯</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="text-xl font-bold text-gray-900">
                {formatDate(assignment.due_date)}
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
              <p className="text-sm text-gray-500">Days Remaining</p>
              <p className="text-2xl font-bold text-orange-600">
                {Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Title:</span>
              <span className="font-medium text-gray-900">{assignment.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Class:</span>
              <span className="font-medium text-gray-900">{assignment.class?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Section:</span>
              <span className="font-medium text-gray-900">{assignment.section?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subject:</span>
              <span className="font-medium text-gray-900">{assignment.subject?.name || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Description:</span>
              <span className="font-medium text-gray-900">{assignment.description || '-'}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Marks:</span>
              <span className="font-medium text-gray-900">{assignment.total_marks || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium text-gray-900">
                {formatDate(assignment.due_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge variant={getStatusVariant(assignment.due_date)}>
                {new Date(assignment.due_date) < new Date() ? 'Overdue' : 'Active'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;

