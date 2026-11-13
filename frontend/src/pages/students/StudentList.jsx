import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI, classAPI, sectionAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useConfirm } from '../../context/ConfirmContext';

const StudentList = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
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
  const [allSections, setAllSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch classes and all sections once on mount
  useEffect(() => {
    fetchClasses();
    fetchAllSections();
  }, []);

  // Debounce search input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if (prev.search === searchTerm) return prev;
        return { ...prev, search: searchTerm, page: 1 };
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch students on filter/page changes
  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll({ per_page: 'all' });
      if (response.success) {
        setClasses(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchAllSections = async () => {
    try {
      const response = await sectionAPI.getAll({ per_page: 'all' });
      if (response.success) {
        setAllSections(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch all sections:', error);
    }
  };

  // Dynamically compute available sections based on selected class
  const availableSections = useMemo(() => {
    if (filters.class_id) {
      return allSections
        .filter(s => String(s.class_id) === String(filters.class_id))
        .map(s => ({ id: String(s.id), name: s.name }));
    }
    // When "All Classes" is selected, extract distinct section names (e.g. A, B, C)
    const seen = new Set();
    const unique = [];
    allSections.forEach(s => {
      const trimmed = s.name?.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        unique.push({ id: trimmed, name: trimmed });
      }
    });
    return unique.sort((a, b) => a.name.localeCompare(b.name));
  }, [allSections, filters.class_id]);

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
    if (key === 'class_id') {
      setFilters(prev => {
        let newSectionId = prev.section_id;
        if (value && newSectionId) {
          // If a section was already selected, find the matching section in the new class
          const matching = allSections.find(s => 
            String(s.class_id) === String(value) && 
            (String(s.id) === String(newSectionId) || s.name === String(newSectionId))
          );
          newSectionId = matching ? String(matching.id) : '';
        } else if (!value && newSectionId) {
          // Switching back to all classes, convert numeric section id to section name if available
          const sec = allSections.find(s => String(s.id) === String(newSectionId));
          newSectionId = sec ? sec.name : '';
        }
        return { ...prev, class_id: value, section_id: newSectionId, page: 1 };
      });
    } else {
      setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    }
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Student',
      message: 'Are you sure you want to delete this student? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (isConfirmed) {
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

  const handleDownloadTemplate = async () => {
    try {
      try {
        const blob = await studentAPI.downloadTemplate();
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'student_import_template.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Student template downloaded successfully!');
        return;
      } catch (err) {
        console.warn('Backend download failed, using client fallback:', err);
      }

      const csvContent = `first_name,last_name,email,phone,admission_number,admission_date,class_id,section_id,academic_year_id,roll_number,date_of_birth,gender,blood_group,religion,caste,nationality,mother_tongue,status,address,city,state,country,postal_code,father_name,father_phone,father_occupation,mother_name,mother_phone,mother_occupation,guardian_name,guardian_phone,guardian_relation,emergency_contact_name,emergency_contact_phone,emergency_contact_relation,previous_school,medical_conditions,allergies,notes
Aarav,Sharma,aarav.sharma@example.com,+91 98765 11001,ADM2026001,2026-04-01,1,1,1,101,2015-05-15,male,B+,Hindu,General,Indian,Hindi,active,"Flat 402, Shanti Kunj, Sector 14, Dwarka",New Delhi,Delhi,India,110078,Rajesh Sharma,+91 98765 22001,Software Engineer,Pooja Sharma,+91 98765 22002,Teacher,,,,Rajesh Sharma,+91 98765 22001,Father,"Delhi Public School, R.K. Puram",None,None,"Excels in mathematics and active in school athletics"
Ananya,Patel,ananya.patel@example.com,+91 98765 11002,ADM2026002,2026-04-01,1,1,1,102,2015-08-20,female,O+,Hindu,General,Indian,Gujarati,active,"B-12, Gokul Dham, Satellite",Ahmedabad,Gujarat,India,380015,Kirit Patel,+91 98765 22003,Businessman,Neeta Patel,+91 98765 22004,Homemaker,,,,Kirit Patel,+91 98765 22003,Father,"St. Xavier High School, Ahmedabad","Mild Asthmatic","Dust allergy","Interested in classical vocal music and debate"`;
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Student template downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download student template');
    }
  };

  const columns = [
    {
      key: 'admission_number',
      label: 'Admission No.',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.admission_number}</div>
          {row.roll_number && <div className="text-xs text-gray-500">Roll: {row.roll_number}</div>}
        </div>
      ),
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
            <div className="text-sm text-gray-500">{row.email || row.user?.email || '-'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.class?.name || '-'}</div>
          <div className="text-sm text-gray-500">{row.section?.name ? `Section ${row.section.name}` : '-'}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (row) => row.phone || row.user?.phone || '-',
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (row) => (
        <span className="capitalize">{row.gender || row.user?.gender || '-'}</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-1">Manage student records</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center space-x-1.5 shadow-sm transition"
              title="Download CSV Template for student import"
            >
              <span>📥</span>
              <span>Download Template</span>
            </button>
            <button
              onClick={() => navigate('/tools/bulk')}
              className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center space-x-1.5 shadow-sm transition"
              title="Import students in bulk"
            >
              <span>📤</span>
              <span>Import Students</span>
            </button>
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
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            >
              <option value="">All Sections</option>
              {availableSections.map((section) => (
                <option key={section.id} value={section.id}>
                  Section {section.name}
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

