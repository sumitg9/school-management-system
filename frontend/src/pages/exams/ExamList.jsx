import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { examAPI, academicYearAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useConfirm } from '../../context/ConfirmContext';

const ExamList = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { formatDate } = useSettings();
  const [exams, setExams] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    search: '',
    academic_year_id: '',
    type: '',
  });

  // Fetch academic years once on mount
  useEffect(() => {
    fetchAcademicYears();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if (prev.search === searchTerm) return prev;
        return { ...prev, search: searchTerm, page: 1 };
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch exams when filters change
  useEffect(() => {
    fetchExams();
  }, [filters]);

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearAPI.getAll({ per_page: 100 });
      if (response.success) {
        setAcademicYears(response.data);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await examAPI.getAll(filters);
      if (response.success) {
        setExams(response.data);
        setPagination(response.meta);
      }
    } catch (error) {
      toast.error('Failed to fetch exams');
      console.error('Error fetching exams:', error);
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
    const isConfirmed = await confirm({
      title: 'Delete Exam',
      message: 'Are you sure you want to delete this exam? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await examAPI.delete(id);
        toast.success('Exam deleted successfully');
        fetchExams();
      } catch (error) {
        toast.error('Failed to delete exam');
        console.error('Error deleting exam:', error);
      }
    }
  };

  const getTypeVariant = (type) => {
    switch (type) {
      case 'midterm': return 'info';
      case 'final': return 'primary';
      case 'quiz': return 'warning';
      case 'practical': return 'success';
      default: return 'default';
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Exam Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.description || '-'}</div>
        </div>
      ),
    },
    {
      key: 'academic_year',
      label: 'Academic Year',
      render: (row) => row.academic_year?.name || '-',
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
      key: 'start_date',
      label: 'Start Date',
      render: (row) => formatDate(row.start_date),
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (row) => formatDate(row.end_date),
    },
    {
      key: 'total_marks',
      label: 'Total Marks',
      render: (row) => row.total_marks || '-',
    },
  ];

  const actions = (row) => (
    <>
      <button
        onClick={() => navigate(`/exams/${row.id}`)}
        className="text-blue-600 hover:text-blue-900"
        title="View"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
      <button
        onClick={() => navigate(`/exams/${row.id}/edit`)}
        className="text-green-600 hover:text-green-900"
        title="Edit"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={() => navigate(`/exams/${row.id}/grades`)}
        className="text-purple-600 hover:text-purple-900"
        title="Grades"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
            <h1 className="text-2xl font-bold text-gray-900">Examinations</h1>
            <p className="text-gray-600 mt-1">Manage exams and assessments</p>
          </div>
          <button
            onClick={() => navigate('/exams/create')}
            className="btn-primary flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Exam</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search exams..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select
              value={filters.academic_year_id}
              onChange={(e) => handleFilterChange('academic_year_id', e.target.value)}
              className="input-field"
            >
              <option value="">All Years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
              <option value="quiz">Quiz</option>
              <option value="practical">Practical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  page: 1,
                  per_page: 20,
                  search: '',
                  academic_year_id: '',
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
        data={exams}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        actions={actions}
      />
    </div>
  );
};

export default ExamList;

