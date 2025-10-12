import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const StudentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchStudent();
  }, [id]);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getById(id);
      if (response.success) {
        setStudent(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch student details');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'academic', name: 'Academic', icon: '📚' },
    { id: 'attendance', name: 'Attendance', icon: '📊' },
    { id: 'fees', name: 'Fees', icon: '💰' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/students')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Details</h1>
              <p className="text-gray-600 mt-1">View and manage student information</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/students/${id}/edit`)}
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

      {/* Student Header Card */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          <div className="flex items-start space-x-6">
            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-3xl">
                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {student.first_name} {student.last_name}
                  </h2>
                  <p className="text-gray-600 mt-1">{student.email}</p>
                </div>
                <Badge variant={student.status === 'active' ? 'success' : 'warning'}>
                  {student.status}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Admission No.</p>
                  <p className="font-semibold text-gray-900">{student.admission_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Class</p>
                  <p className="font-semibold text-gray-900">{student.class?.name} - {student.section?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Roll Number</p>
                  <p className="font-semibold text-gray-900">{student.roll_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Academic Year</p>
                  <p className="font-semibold text-gray-900">{student.academic_year?.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Date of Birth:</span>
                <span className="font-medium">{student.date_of_birth || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gender:</span>
                <span className="font-medium capitalize">{student.gender || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blood Group:</span>
                <span className="font-medium">{student.blood_group || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{student.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Admission Date:</span>
                <span className="font-medium">{student.admission_date || '-'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 block mb-1">Address:</span>
                <span className="font-medium">{student.address || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">City:</span>
                <span className="font-medium">{student.city || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">State:</span>
                <span className="font-medium">{student.state || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Country:</span>
                <span className="font-medium">{student.country || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Postal Code:</span>
                <span className="font-medium">{student.postal_code || '-'}</span>
              </div>
            </div>
          </div>

          {/* Parent Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Father's Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{student.father_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{student.father_phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Occupation:</span>
                <span className="font-medium">{student.father_occupation || '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mother's Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{student.mother_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{student.mother_phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Occupation:</span>
                <span className="font-medium">{student.mother_occupation || '-'}</span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 block mb-1">Previous School:</span>
                <span className="font-medium">{student.previous_school || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600 block mb-1">Medical Conditions:</span>
                <span className="font-medium">{student.medical_conditions || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'academic' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic Records</h3>
          <p className="text-gray-500">Academic records will be displayed here.</p>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Records</h3>
          <p className="text-gray-500">Attendance records will be displayed here.</p>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Records</h3>
          <p className="text-gray-500">Fee records will be displayed here.</p>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;

