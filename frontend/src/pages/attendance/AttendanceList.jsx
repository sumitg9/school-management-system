import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { attendanceAPI, classAPI, sectionAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';

const AttendanceList = () => {
  const navigate = useNavigate();
  const [attendances, setAttendances] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    class_id: '',
    section_id: '',
    date: new Date().toISOString().split('T')[0],
    status: '',
  });

  useEffect(() => {
    fetchClasses();
    fetchAttendances();
  }, [filters]);

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

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getAll(filters);
      if (response.success) {
        setAttendances(response.data);
        setPagination(response.meta);
      }
    } catch (error) {
      toast.error('Failed to fetch attendance records');
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await attendanceAPI.delete(id);
        toast.success('Attendance record deleted successfully');
        fetchAttendances();
      } catch (error) {
        toast.error('Failed to delete attendance record');
        console.error('Error deleting attendance:', error);
      }
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'danger';
      case 'late': return 'warning';
      case 'excused': return 'info';
      default: return 'default';
    }
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: 'student',
      label: 'Student',
      render: (row) => row.student ? (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.student.first_name} {row.student.last_name}
          </div>
          <div className="text-sm text-gray-500">{row.student.admission_number}</div>
        </div>
      ) : '-',
    },
    {
      key: 'class',
      label: 'Class & Section',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.class?.name || '-'}</div>
          <div className="text-sm text-gray-500">{row.section?.name || '-'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (row) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {row.remarks || '-'}
        </div>
      ),
    },
  ];

  const actions = (row) => (
    <>
      <button
        onClick={() => navigate(`/attendance/${row.id}/edit`)}
        className="text-green-600 hover:text-green-900"
        title="Edit"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={() => handleDelete(row.id)}
        className="text-red-600 hover:text-red-900"
        title="Delete"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
            <p className="text-gray-600 mt-1">View and manage attendance</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/attendance/mark')}
              className="btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Mark Attendance</span>
            </button>
            <button
              onClick={() => navigate('/attendance/report')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="input-field"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              value={filters.section_id}
              onChange={(e) => handleFilterChange('section_id', e.target.value)}
              className="input-field"
              disabled={!filters.class_id}
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  per_page: 20,
                  class_id: '',
                  section_id: '',
                  date: new Date().toISOString().split('T')[0],
                  status: '',
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={attendances}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        actions={actions}
      />
    </div>
  );
};

export default AttendanceList;

