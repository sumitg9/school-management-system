import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { attendanceAPI, classAPI, sectionAPI, studentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { useAlert } from '../../context/AlertContext';

const MarkAttendance = () => {
  const navigate = useNavigate();
  const { showValidationError } = useAlert();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [filters, setFilters] = useState({
    class_id: '',
    section_id: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (filters.class_id) {
      fetchSections(filters.class_id);
    } else {
      setSections([]);
      setFilters(prev => ({ ...prev, section_id: '' }));
      setStudents([]);
    }
  }, [filters.class_id]);

  useEffect(() => {
    if (filters.section_id && filters.date) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [filters.section_id, filters.date]);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll({ per_page: 100 });
      if (response.success) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await sectionAPI.getAll({ class_id: classId, per_page: 100 });
      if (response.success) {
        setSections(response.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getAll({
        class_id: filters.class_id,
        section_id: filters.section_id,
        per_page: 100,
      });
      if (response.success) {
        setStudents(response.data);
        // Initialize attendance with 'present' for all students
        const initialAttendance = {};
        response.data.forEach(student => {
          initialAttendance[student.id] = {
            status: 'present',
            remarks: '',
          };
        });
        setAttendance(initialAttendance);
      }
    } catch (error) {
      toast.error('Failed to fetch students');
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status) => {
    const updatedAttendance = {};
    students.forEach(student => {
      updatedAttendance[student.id] = {
        status,
        remarks: attendance[student.id]?.remarks || '',
      };
    });
    setAttendance(updatedAttendance);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const attendanceData = students.map(student => ({
        student_id: student.id,
        class_id: filters.class_id,
        section_id: filters.section_id,
        date: filters.date,
        status: attendance[student.id]?.status || 'present',
        remarks: attendance[student.id]?.remarks || '',
      }));

      await attendanceAPI.markBulk({ attendances: attendanceData });
      toast.success('Attendance marked successfully');
      navigate('/attendance');
    } catch (error) {
      showValidationError(error, 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 border-green-500 text-green-700';
      case 'absent': return 'bg-red-100 border-red-500 text-red-700';
      case 'late': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'excused': return 'bg-blue-100 border-blue-500 text-blue-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  const getStats = () => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    Object.values(attendance).forEach(att => {
      if (stats[att.status] !== undefined) {
        stats[att.status]++;
      }
    });
    return stats;
  };

  const stats = getStats();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/attendance')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
            <p className="text-gray-600 mt-1">Mark attendance for students</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Class & Date</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.section_id}
              onChange={(e) => handleFilterChange('section_id', e.target.value)}
              className="input-field"
              disabled={!filters.class_id}
              required
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✗</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">⏰</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Excused</p>
                <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Quick Actions:</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handleMarkAll('present')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
              >
                Mark All Present
              </button>
              <button
                onClick={() => handleMarkAll('absent')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
              >
                Mark All Absent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student List */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && students.length === 0 && filters.section_id && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No students found in this section</p>
        </div>
      )}

      {!loading && students.length > 0 && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{student.admission_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {['present', 'absent', 'late', 'excused'].map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(student.id, status)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium border-2 transition ${
                                attendance[student.id]?.status === status
                                  ? getStatusColor(status)
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={attendance[student.id]?.remarks || ''}
                          onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                          className="input-field"
                          placeholder="Optional remarks"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={() => navigate('/attendance')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default MarkAttendance;

