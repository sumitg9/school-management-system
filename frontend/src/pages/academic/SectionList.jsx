import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { sectionAPI, classAPI, teacherAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';

const SectionList = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { isStudent, hasPermission } = useAuth();
  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [isAssignTeacherModalOpen, setIsAssignTeacherModalOpen] = useState(false);
  const [targetSection, setTargetSection] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 20,
    search: '',
    class_id: '',
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchSections();
  }, [filters]);

  const fetchTeachers = async () => {
    try {
      const res = await teacherAPI.getAll({ per_page: 100, status: 'active' });
      if (res && res.data) {
        setTeachers(res.data);
      }
    } catch (_) {}
  };

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

  const fetchSections = async () => {
    setLoading(true);
    try {
      const response = await sectionAPI.getAll(filters);
      if (response.success) {
        setSections(response.data);
        setPagination(response.meta);
      }
    } catch (error) {
      toast.error('Failed to fetch sections');
      console.error('Error fetching sections:', error);
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

  const handleOpenAssignTeacher = (section) => {
    setTargetSection(section);
    setSelectedTeacherId(section.section_teacher_id || section.section_teacher?.id || '');
    setIsAssignTeacherModalOpen(true);
  };

  const handleAssignTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!targetSection) return;
    setAssigningTeacher(true);
    try {
      await sectionAPI.assignTeacher(targetSection.id, selectedTeacherId || null);
      toast.success('Section teacher updated successfully');
      setIsAssignTeacherModalOpen(false);
      setTargetSection(null);
      fetchSections();
    } catch (error) {
      toast.error('Failed to assign section teacher');
      console.error(error);
    } finally {
      setAssigningTeacher(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Section',
      message: 'Are you sure you want to delete this section? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await sectionAPI.delete(id);
        toast.success('Section deleted successfully');
        fetchSections();
      } catch (error) {
        toast.error('Failed to delete section');
        console.error('Error deleting section:', error);
      }
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Section Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.description || 'No description'}</div>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      render: (row) => row.class?.name || '-',
    },
    {
      key: 'section_teacher',
      label: 'Section Teacher',
      render: (row) => row.section_teacher ? (
        <div>
          <div className="text-sm text-gray-900">
            {row.section_teacher.first_name} {row.section_teacher.last_name}
          </div>
          <div className="text-sm text-gray-500">{row.section_teacher.email}</div>
        </div>
      ) : '-',
    },
    {
      key: 'room_number',
      label: 'Room',
      render: (row) => row.room_number || '-',
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (row) => row.capacity || '-',
    },
    {
      key: 'students_count',
      label: 'Students',
      render: (row) => (
        <Badge variant="primary">
          {row.students_count || 0} students
        </Badge>
      ),
    },
  ];

  const actions = (row) => (
    <div className="flex items-center gap-1.5 justify-end">
      {!isStudent() && hasPermission('edit-classes') && (
        <button
          onClick={() => handleOpenAssignTeacher(row)}
          className="text-indigo-600 hover:text-indigo-900 cursor-pointer p-1 rounded hover:bg-indigo-50"
          title="Assign Section Teacher"
        >
          <span className="text-base" role="img" aria-label="assign teacher">👨‍🏫</span>
        </button>
      )}
      {!isStudent() && hasPermission('edit-classes') && (
        <button
          onClick={() => navigate(`/sections/${row.id}/edit`)}
          className="text-green-600 hover:text-green-900 cursor-pointer"
          title="Edit"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {!isStudent() && hasPermission('delete-classes') && (
        <button
          onClick={() => handleDelete(row.id)}
          className="text-red-600 hover:text-red-900 cursor-pointer"
          title="Delete"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
            <p className="text-gray-600 mt-1">Manage section records</p>
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
              onClick={() => navigate('/subjects')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>📚</span>
              <span>Subjects</span>
            </button>
            {!isStudent() && hasPermission('create-classes') && (
              <button
                onClick={() => navigate('/sections/create')}
                className="btn-primary flex items-center space-x-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Section</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by section name..."
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
            <button
              onClick={() => {
                setFilters({
                  page: 1,
                  per_page: 20,
                  search: '',
                  class_id: '',
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
        data={sections}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        actions={actions}
      />

      {/* Assign Teacher Modal */}
      <Modal
        isOpen={isAssignTeacherModalOpen}
        onClose={() => {
          setIsAssignTeacherModalOpen(false);
          setTargetSection(null);
        }}
        title={`Assign Teacher - Section ${targetSection?.name || ''}`}
      >
        <form onSubmit={handleAssignTeacherSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Section Teacher
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="input-field"
            >
              <option value="">No Teacher Assigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.employee_id || t.email})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Assign a dedicated teacher responsible for this section's day-to-day classes and attendance.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsAssignTeacherModalOpen(false);
                setTargetSection(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigningTeacher}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {assigningTeacher ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SectionList;

