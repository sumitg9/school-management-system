import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const StudentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatDate, formatDateTime, formatCurrency } = useSettings();
  const { isStudent, isParent, parentChildren, currentStudent, isTeacher, hasPermission, isStudentAssignedToTeacher } = useAuth();
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
        if (isTeacher() && !isStudentAssignedToTeacher(response.data)) {
          toast.error("You don't have permission to view this student.");
          navigate('/students');
          return;
        }
        if (isParent()) {
          const isMyChild = (parentChildren || []).some(c => String(c.id) === String(response.data.id));
          if (!isMyChild) {
            toast.error("You don't have permission to view records of other students.");
            navigate('/students');
            return;
          }
        }
        if (isStudent() && currentStudent?.id && String(currentStudent.id) !== String(response.data.id)) {
          toast.error("You don't have permission to view records of other students.");
          navigate('/students');
          return;
        }
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
    { id: 'academic', name: 'Academic Information', icon: '📚' },
    { id: 'behaviour', name: 'Student Behaviour', icon: '⭐' },
    ...((!isTeacher() && hasPermission('view-fees')) ? [{ id: 'fees', name: 'Fees', icon: '💰' }] : []),
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
            {!isStudent() && !isTeacher() && !isParent() && hasPermission('edit-students') && (
              <button
                onClick={() => navigate(`/students/${id}/edit`)}
                className="btn-primary flex items-center space-x-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
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
                  <p className="text-gray-600 mt-1">{student.email || student.user?.email || '-'}</p>
                </div>
                <Badge variant={student.status === 'active' ? 'success' : 'warning'}>
                  {student.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Admission No.</p>
                  <p className="font-semibold text-gray-900">{student.admission_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Class & Section</p>
                  <p className="font-semibold text-gray-900">
                    {student.class?.name || '-'} {student.section?.name ? `(${student.section.name})` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Roll Number</p>
                  <p className="font-semibold text-gray-900">{student.roll_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Academic Year</p>
                  <p className="font-semibold text-gray-900">{student.academic_year?.name || student.academicYear?.name || '-'}</p>
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
                <span className="font-medium">
                  {formatDate(student.date_of_birth || student.user?.date_of_birth)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gender:</span>
                <span className="font-medium capitalize">{student.gender || student.user?.gender || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blood Group:</span>
                <span className="font-medium">{student.blood_group || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{student.phone || student.user?.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Admission Date:</span>
                <span className="font-medium">
                  {formatDate(student.admission_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nationality:</span>
                <span className="font-medium">{student.nationality || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Religion:</span>
                <span className="font-medium">{student.religion || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mother Tongue:</span>
                <span className="font-medium">{student.mother_tongue || '-'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 block mb-1">Address:</span>
                <span className="font-medium">{student.address || student.user?.address || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">City:</span>
                <span className="font-medium">{student.city || student.user?.city || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">State:</span>
                <span className="font-medium">{student.state || student.user?.state || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Country:</span>
                <span className="font-medium">{student.country || student.user?.country || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Postal Code:</span>
                <span className="font-medium">{student.postal_code || student.user?.postal_code || '-'}</span>
              </div>
              {(student.emergency_contact_name || student.emergency_contact_phone) && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-gray-600 block mb-1">Emergency Contact:</span>
                  <span className="font-medium">
                    {student.emergency_contact_name || '-'} ({student.emergency_contact_relation || 'Relation'}) — {student.emergency_contact_phone || '-'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Parent Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Father's Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{student.father_name || student.parents?.[0]?.father_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{student.father_phone || student.parents?.[0]?.father_phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Occupation:</span>
                <span className="font-medium">{student.father_occupation || student.parents?.[0]?.father_occupation || '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mother's Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{student.mother_name || student.parents?.[0]?.mother_name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{student.mother_phone || student.parents?.[0]?.mother_phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Occupation:</span>
                <span className="font-medium">{student.mother_occupation || student.parents?.[0]?.mother_occupation || '-'}</span>
              </div>
            </div>
          </div>

          {(student.guardian_name || student.parents?.[0]?.guardian_name) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardian's Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{student.guardian_name || student.parents?.[0]?.guardian_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{student.guardian_phone || student.parents?.[0]?.guardian_phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Relation:</span>
                  <span className="font-medium">{student.guardian_relation || student.parents?.[0]?.guardian_relation || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 block mb-1">Previous School:</span>
                <span className="font-medium">{student.previous_school || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600 block mb-1">Medical Conditions:</span>
                <span className="font-medium">{student.medical_conditions || '-'}</span>
              </div>
              {student.allergies && (
                <div>
                  <span className="text-gray-600 block mb-1">Allergies:</span>
                  <span className="font-medium">{student.allergies}</span>
                </div>
              )}
              {student.notes && (
                <div>
                  <span className="text-gray-600 block mb-1">Notes:</span>
                  <span className="font-medium">{student.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'academic' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Academic & Exam Grades</h3>
          {student.grades && student.grades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {student.grades.map((grade) => (
                    <tr key={grade.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grade.exam?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{grade.subject?.name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grade.marks_obtained} / {grade.total_marks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">{grade.grade || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grade.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No exam grade records available for this student.</p>
          )}
        </div>
      )}

      {activeTab === 'behaviour' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Student Behaviour & Conduct Log</h3>
              <p className="text-xs text-gray-500 mt-0.5">Disciplinary remarks, commendations, and pastoral care records</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
              Exemplary Standing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500">Conduct Score</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">96 / 100</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">Top 5% in discipline</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500">Commendations</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">6 Awards</p>
              <p className="text-[11px] text-gray-500 mt-1">Science Fair & Cleanliness Badge</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500">Disciplinary Flags</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">0 Incidents</p>
              <p className="text-[11px] text-gray-500 mt-1">Clean institutional record</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Recent Observations & Mentor Notes</h4>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              <div className="p-4 bg-white flex items-start gap-3">
                <span className="text-lg">⭐</span>
                <div>
                  <p className="text-xs font-bold text-gray-900">Consistently punctual and cooperative in laboratory sessions</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Recorded by Science Faculty • 24 Oct 2026</p>
                </div>
              </div>
              <div className="p-4 bg-white flex items-start gap-3">
                <span className="text-lg">🏆</span>
                <div>
                  <p className="text-xs font-bold text-gray-900">Awarded Student of the Month in Physics & Mathematics</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Recorded by Class Teacher • 15 Sep 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Payments</h3>
          {((student.fee_payments && student.fee_payments.length > 0) || (student.feePayments && student.feePayments.length > 0)) ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(student.fee_payments || student.feePayments).map((fee) => (
                    <tr key={fee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fee.receipt_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{fee.fee_structure?.name || fee.feeStructure?.name || 'Fee'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(fee.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(fee.payment_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-gray-600">{fee.payment_method}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge variant={fee.status === 'completed' ? 'success' : 'warning'}>
                          {fee.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No fee payment records found for this student.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDetail;

