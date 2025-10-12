import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { subjectAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const SubjectDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubject();
  }, [id]);

  const fetchSubject = async () => {
    setLoading(true);
    try {
      const response = await subjectAPI.getById(id);
      if (response.success) {
        setSubject(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch subject details');
      navigate('/subjects');
    } finally {
      setLoading(false);
    }
  };

  const getTypeVariant = (type) => {
    switch (type) {
      case 'core': return 'primary';
      case 'elective': return 'info';
      case 'optional': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Subject not found</p>
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
              onClick={() => navigate('/subjects')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subject Details</h1>
              <p className="text-gray-600 mt-1">View subject information</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/subjects/${id}/edit`)}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Subject Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-bold text-3xl">📚</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{subject.name}</h2>
                <p className="text-gray-600 mt-1">{subject.code}</p>
              </div>
              <Badge variant={getTypeVariant(subject.type)}>
                {subject.type}
              </Badge>
            </div>
            <p className="text-gray-600 mt-3">{subject.description || 'No description available'}</p>
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subject Name:</span>
              <span className="font-medium text-gray-900">{subject.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subject Code:</span>
              <span className="font-medium text-gray-900">{subject.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <Badge variant={getTypeVariant(subject.type)}>
                {subject.type}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Credits:</span>
              <span className="font-medium text-gray-900">{subject.credits || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Description:</span>
              <span className="font-medium text-gray-900">{subject.description || '-'}</span>
            </div>
          </div>
        </div>

        {/* Marks Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Marks Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Marks:</span>
              <span className="font-medium text-gray-900">{subject.total_marks || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Passing Marks:</span>
              <span className="font-medium text-gray-900">{subject.passing_marks || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Theory Marks:</span>
              <span className="font-medium text-gray-900">{subject.theory_marks || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Practical Marks:</span>
              <span className="font-medium text-gray-900">{subject.practical_marks || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pass Percentage:</span>
              <span className="font-medium text-gray-900">
                {subject.total_marks && subject.passing_marks
                  ? `${((subject.passing_marks / subject.total_marks) * 100).toFixed(1)}%`
                  : '-'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectDetail;

