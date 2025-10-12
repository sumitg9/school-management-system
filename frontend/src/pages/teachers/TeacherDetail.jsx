import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { teacherAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const TeacherDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchTeacher();
  }, [id]);

  const fetchTeacher = async () => {
    setLoading(true);
    try {
      const response = await teacherAPI.getById(id);
      if (response.success) {
        setTeacher(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch teacher details');
      navigate('/teachers');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'classes', name: 'Classes', icon: '📚' },
    { id: 'schedule', name: 'Schedule', icon: '📅' },
    { id: 'performance', name: 'Performance', icon: '📊' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Teacher not found</p>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'on-leave': return 'info';
      case 'terminated': return 'danger';
      default: return 'default';
    }
  };

  const getEmploymentVariant = (type) => {
    switch (type) {
      case 'permanent': return 'primary';
      case 'contract': return 'info';
      case 'part-time': return 'warning';
      case 'temporary': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/teachers')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Details</h1>
              <p className="text-gray-600 mt-1">View teacher information</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/teachers/${id}/edit`)}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Teacher Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold text-3xl">
              {teacher.first_name?.charAt(0)}{teacher.last_name?.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {teacher.first_name} {teacher.last_name}
                </h2>
                <p className="text-gray-600 mt-1">{teacher.email}</p>
              </div>
              <div className="flex space-x-2">
                <Badge variant={getStatusVariant(teacher.status)}>
                  {teacher.status}
                </Badge>
                <Badge variant={getEmploymentVariant(teacher.employment_type)}>
                  {teacher.employment_type}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Employee ID</p>
                <p className="font-semibold text-gray-900">{teacher.employee_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-semibold text-gray-900">{teacher.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Designation</p>
                <p className="font-semibold text-gray-900">{teacher.designation || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Joining Date</p>
                <p className="font-semibold text-gray-900">
                  {teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : '-'}
                </p>
              </div>
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
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Full Name:</span>
                <span className="font-medium text-gray-900">
                  {teacher.first_name} {teacher.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date of Birth:</span>
                <span className="font-medium text-gray-900">
                  {teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gender:</span>
                <span className="font-medium text-gray-900 capitalize">{teacher.gender || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blood Group:</span>
                <span className="font-medium text-gray-900">{teacher.blood_group || '-'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{teacher.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium text-gray-900">{teacher.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Address:</span>
                <span className="font-medium text-gray-900 text-right">{teacher.address || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">City:</span>
                <span className="font-medium text-gray-900">{teacher.city || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">State:</span>
                <span className="font-medium text-gray-900">{teacher.state || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Country:</span>
                <span className="font-medium text-gray-900">{teacher.country || '-'}</span>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Qualification:</span>
                <span className="font-medium text-gray-900">{teacher.qualification || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Experience:</span>
                <span className="font-medium text-gray-900">
                  {teacher.experience_years ? `${teacher.experience_years} years` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Specialization:</span>
                <span className="font-medium text-gray-900">{teacher.specialization || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Previous School:</span>
                <span className="font-medium text-gray-900 text-right">{teacher.previous_school || '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-600 mb-1">Certifications:</span>
                <span className="font-medium text-gray-900">{teacher.certifications || '-'}</span>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Employee ID:</span>
                <span className="font-medium text-gray-900">{teacher.employee_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium text-gray-900">{teacher.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Designation:</span>
                <span className="font-medium text-gray-900">{teacher.designation || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Joining Date:</span>
                <span className="font-medium text-gray-900">
                  {teacher.joining_date ? new Date(teacher.joining_date).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Employment Type:</span>
                <span className="font-medium text-gray-900 capitalize">{teacher.employment_type || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-gray-900 capitalize">{teacher.status || '-'}</span>
              </div>
            </div>
          </div>

          {/* Bank Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Salary:</span>
                <span className="font-medium text-gray-900">
                  {teacher.salary ? `$${parseFloat(teacher.salary).toFixed(2)}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bank Name:</span>
                <span className="font-medium text-gray-900">{teacher.bank_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Number:</span>
                <span className="font-medium text-gray-900">{teacher.bank_account_number || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IFSC Code:</span>
                <span className="font-medium text-gray-900">{teacher.bank_ifsc_code || '-'}</span>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Contact Name:</span>
                <span className="font-medium text-gray-900">{teacher.emergency_contact_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contact Phone:</span>
                <span className="font-medium text-gray-900">{teacher.emergency_contact_phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Relation:</span>
                <span className="font-medium text-gray-900 capitalize">{teacher.emergency_contact_relation || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">Classes information will be displayed here</p>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">Schedule information will be displayed here</p>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">Performance information will be displayed here</p>
        </div>
      )}
    </div>
  );
};

export default TeacherDetail;

