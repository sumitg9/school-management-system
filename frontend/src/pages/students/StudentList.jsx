import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI, classAPI, sectionAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    search: '',
    class_id: '',
    section_id: '',
    status: '',
  });
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    fetchClasses();
    fetchStudents();
  }, [filters]);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll({ per_page: 'all' });
      if (response.success) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await sectionAPI.getAll({ class_id: classId, per_page: 'all' });
      if (response.success) {
        setSections(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sections:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getAll(filters);
      if (response.success) {
        setStudents(response.data);
        setPagination(response.meta);
      }
    } catch (error) {
      toast.error('Failed to fetch students');
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    
    if (key === 'class_id') {
      if (value) {
        fetchSections(value);
      } else {
        setSections([]);
      }
      setFilters(prev => ({ ...prev, section_id: '' }));
    }
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.delete(id);
        toast.success('Student deleted successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Failed to delete student');
        console.error('Error deleting student:', error);
      }
    }
  };

  const columns = [
    {
      key: 'admission_number',
      label: 'Admission No.',
      sortable: true,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {row.first_name} {row.last_name}
            </div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.class?.name}</div>
          <div className="text-sm text-gray-500">{row.section?.name}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => row.phone || '-',
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (row) => (
        <span className="capitalize">{row.gender}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'inactive' ? 'warning' : 'danger'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  const actions = (row) => (
    <>
      <button
        onClick={() => navigate(`/students/${row.id}`)}
        className="text-blue-600 hover:text-blue-900"
        title="View"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      <button
        onClick={() => navigate(`/students/${row.id}/edit`)}
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
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">Manage student records</p>
          </div>
          <button
            onClick={() => navigate('/students/create')}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by name, email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
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
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  per_page: 20,
                  search: '',
                  class_id: '',
                  section_id: '',
                  status: '',
                });
                setSections([]);
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
        data={students}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        actions={actions}
      />
    </div>
  );
};

export default StudentList;

