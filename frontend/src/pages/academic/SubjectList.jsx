import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { subjectAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';

const SubjectList = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    search: '',
    type: '',
  });

  useEffect(() => {
    fetchSubjects();
  }, [filters]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await subjectAPI.getAll(filters);
      if (response.success) {
        setSubjects(response.data);
        setPagination(response.meta);
      }
    } catch (error) {
      toast.error('Failed to fetch subjects');
      console.error('Error fetching subjects:', error);
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
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await subjectAPI.delete(id);
        toast.success('Subject deleted successfully');
        fetchSubjects();
      } catch (error) {
        toast.error('Failed to delete subject');
        console.error('Error deleting subject:', error);
      }
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

  const columns = [
    {
      key: 'name',
      label: 'Subject Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.code}</div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (row) => (
        <Badge variant={getTypeVariant(row.type)}>
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {row.description || '-'}
        </div>
      ),
    },
    {
      key: 'credits',
      label: 'Credits',
      render: (row) => row.credits || '-',
    },
    {
      key: 'total_marks',
      label: 'Total Marks',
      render: (row) => row.total_marks || '-',
    },
    {
      key: 'passing_marks',
      label: 'Passing Marks',
      render: (row) => row.passing_marks || '-',
    },
  ];

  const actions = (row) => (
    <>
      <button
        onClick={() => navigate(`/subjects/${row.id}`)}
        className="text-blue-600 hover:text-blue-900"
        title="View"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      <button
        onClick={() => navigate(`/subjects/${row.id}/edit`)}
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
            <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
            <p className="text-gray-600 mt-1">Manage subject records</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/classes')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>🏫</span>
              <span>Classes</span>
            </button>
            <button
              onClick={() => navigate('/sections')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>📋</span>
              <span>Sections</span>
            </button>
            <button
              onClick={() => navigate('/subjects/create')}
              className="btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Subject</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by subject name or code..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="core">Core</option>
              <option value="elective">Elective</option>
              <option value="optional">Optional</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  per_page: 20,
                  search: '',
                  type: '',
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
        data={subjects}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        actions={actions}
      />
    </div>
  );
};

export default SubjectList;

