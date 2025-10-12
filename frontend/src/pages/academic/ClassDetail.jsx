import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { classAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const ClassDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchClass();
  }, [id]);

  const fetchClass = async () => {
    setLoading(true);
    try {
      const response = await classAPI.getById(id);
      if (response.success) {
        setClassData(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch class details');
      navigate('/classes');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'sections', name: 'Sections', icon: '📂' },
    { id: 'subjects', name: 'Subjects', icon: '📚' },
    { id: 'students', name: 'Students', icon: '👨‍🎓' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Class not found</p>
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
              onClick={() => navigate('/classes')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Class Details</h1>
              <p className="text-gray-600 mt-1">View class information</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/classes/${id}/edit`)}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Class Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-purple-600 font-bold text-3xl">
              {classData.name?.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{classData.name}</h2>
                <p className="text-gray-600 mt-1">{classData.description || 'No description'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Academic Year</p>
                <p className="font-semibold text-gray-900">{classData.academic_year?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Class Teacher</p>
                <p className="font-semibold text-gray-900">
                  {classData.class_teacher 
                    ? `${classData.class_teacher.first_name} ${classData.class_teacher.last_name}`
                    : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Room Number</p>
                <p className="font-semibold text-gray-900">{classData.room_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Capacity</p>
                <p className="font-semibold text-gray-900">{classData.capacity || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Sections</p>
              <p className="text-3xl font-bold text-gray-900">{classData.sections_count || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📂</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{classData.students_count || 0}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👨‍🎓</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Subjects</p>
              <p className="text-3xl font-bold text-gray-900">{classData.subjects_count || 0}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Class Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Class Name:</span>
                <span className="font-medium text-gray-900">{classData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Academic Year:</span>
                <span className="font-medium text-gray-900">{classData.academic_year?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room Number:</span>
                <span className="font-medium text-gray-900">{classData.room_number || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-medium text-gray-900">{classData.capacity || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-600 mb-1">Description:</span>
                <span className="font-medium text-gray-900">{classData.description || '-'}</span>
              </div>
            </div>
          </div>

          {/* Class Teacher Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Teacher</h3>
            {classData.class_teacher ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">
                    {classData.class_teacher.first_name} {classData.class_teacher.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-900">{classData.class_teacher.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium text-gray-900">{classData.class_teacher.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium text-gray-900">{classData.class_teacher.department || '-'}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No class teacher assigned</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sections' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">Sections list will be displayed here</p>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">Subjects list will be displayed here</p>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">Students list will be displayed here</p>
        </div>
      )}
    </div>
  );
};

export default ClassDetail;

