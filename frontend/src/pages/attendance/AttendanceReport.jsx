import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { attendanceAPI, classAPI, sectionAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const AttendanceReport = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({
    class_id: '',
    section_id: '',
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
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
    }
  }, [filters.class_id]);

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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = async () => {
    if (!filters.class_id || !filters.section_id) {
      toast.error('Please select class and section');
      return;
    }

    setLoading(true);
    try {
      const response = await attendanceAPI.getReport(filters);
      if (response.success) {
        setReport(response.data);
      }
    } catch (error) {
      toast.error('Failed to generate report');
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendancePercentage = (student) => {
    const total = student.total_days || 0;
    const present = student.present_days || 0;
    return total > 0 ? ((present / total) * 100).toFixed(1) : 0;
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
            <p className="text-gray-600 mt-1">Generate attendance reports</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="input-field"
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
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleGenerateReport}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Report */}
      {report && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{report.total_students || 0}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👨‍🎓</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg. Attendance</p>
                  <p className="text-3xl font-bold text-green-600">{report.average_attendance || 0}%</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Days</p>
                  <p className="text-3xl font-bold text-gray-900">{report.total_days || 0}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Low Attendance</p>
                  <p className="text-3xl font-bold text-red-600">{report.low_attendance_count || 0}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>
          </div>

          {/* Student-wise Report */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Student-wise Attendance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Present
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Absent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Late
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Excused
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.students?.map((student) => {
                    const percentage = getAttendancePercentage(student);
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.total_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="success">{student.present_days || 0}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="danger">{student.absent_days || 0}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="warning">{student.late_days || 0}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="info">{student.excused_days || 0}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-lg font-bold ${getPercentageColor(percentage)}`}>
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Select filters and click "Generate Report" to view attendance data</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;

