import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { studentAPI, classAPI, sectionAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const StudentList = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { activeSchoolId, currentSchool } = useSchool();
  const {
    isStudent,
    isParent,
    parentChildren,
    activeChild,
    setActiveChild,
    parentLoading,
    currentStudent,
    isTeacher,
    hasPermission,
    filterTeacherClasses,
    filterTeacherSections,
    filterTeacherStudents,
  } = useAuth();
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

  // Fetch classes and all sections on mount and when active school changes
  useEffect(() => {
    fetchClasses();
    fetchAllSections();
  }, [activeSchoolId]);

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

  // Fetch students on filter/page or active school changes
  useEffect(() => {
    fetchStudents();
  }, [filters, activeSchoolId]);

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll({ per_page: 'all', school_id: activeSchoolId });
      if (response.success) {
        const raw = response.data || [];
        setClasses(isTeacher() ? filterTeacherClasses(raw) : raw);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchAllSections = async () => {
    try {
      const response = await sectionAPI.getAll({ per_page: 'all', school_id: activeSchoolId });
      if (response.success) {
        const raw = response.data || [];
        setAllSections(isTeacher() ? filterTeacherSections(raw, classes) : raw);
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
      const response = await studentAPI.getAll({ ...filters, school_id: activeSchoolId });
      if (response.success) {
        const raw = response.data || [];
        const scoped = isTeacher() ? filterTeacherStudents(raw, classes, allSections) : raw;
        setStudents(scoped);
        setPagination(response.meta ? {
          ...response.meta,
          total: isTeacher() ? scoped.length : response.meta.total,
        } : null);
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
    <div className="flex items-center gap-1.5 justify-end">
      <button
        onClick={() => navigate(`/students/${row.id}`)}
        className="text-blue-600 hover:text-blue-900 cursor-pointer"
        title="View Details"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>

      {/* Edit and Delete are strictly hidden for students */}
      {!isStudent() && hasPermission('edit-students') && (
        <button
          onClick={() => navigate(`/students/${row.id}/edit`)}
          className="text-green-600 hover:text-green-900 cursor-pointer"
          title="Edit"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      {!isStudent() && hasPermission('delete-students') && (
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

  // -------------------------------------------------------------
  // PARENT VIEW: My Children Only (Strict Data Scoping)
  // -------------------------------------------------------------
  if (isParent()) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 bg-amber-50 rounded-2xl text-amber-600 shadow-xs">👨‍👩‍👧</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Children</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  View and manage records for your verified children enrolled in the school.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full font-bold">
              👨‍👩‍👧 {parentChildren.length} Linked Child{parentChildren.length !== 1 ? 'ren' : ''}
            </span>
          </div>
        </div>

        {/* Children Cards */}
        {parentLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mb-3"></div>
            <p className="text-sm text-gray-500">Loading linked children profiles...</p>
          </div>
        ) : parentChildren.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
            <span className="text-5xl block mb-3">👦👧</span>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No Associated Children Found</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
              We could not find any student records verified with your parent details (Name, Contact Phone, Email, or Address). Please contact school administration to link your student profile.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parentChildren.map((child) => {
              const isActive = activeChild && String(activeChild.id) === String(child.id);
              const className = child.class?.name || child.classes?.name || (child.class_id ? `Class ${child.class_id}` : 'N/A');
              const sectionName = child.section?.name || child.sections?.name || (child.section_id ? `Section ${child.section_id}` : '');

              return (
                <div
                  key={child.id}
                  className={`bg-white rounded-2xl p-6 border transition-all duration-200 shadow-sm flex flex-col justify-between ${
                    isActive ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div>
                    {/* Top status bar */}
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span>✓</span> Currently Active View
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveChild(child);
                              toast.info(`Switched active view to ${child.first_name}`);
                            }}
                            className="text-xs bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-900 font-semibold px-2.5 py-0.5 rounded-full transition cursor-pointer"
                          >
                            Set as Active Child
                          </button>
                        )}
                      </div>
                      <Badge variant="success">Enrolled Student</Badge>
                    </div>

                    {/* Child Identity */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-xl shadow-sm flex-shrink-0">
                        {child.first_name?.[0]}{child.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-gray-900 truncate">
                          {child.first_name} {child.last_name}
                        </h3>
                        <p className="text-sm font-semibold text-amber-700 mt-0.5">
                          {className} {sectionName ? `• ${sectionName}` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-mono mt-2">
                          <span>Adm: <strong className="text-gray-800">{child.admission_number || 'N/A'}</strong></span>
                          {child.roll_number && (
                            <span>Roll: <strong className="text-gray-800">{child.roll_number}</strong></span>
                          )}
                          <span>Gender: <strong className="text-gray-800 capitalize">{child.gender || 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Verified Details */}
                    <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 text-gray-600 border border-gray-100 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Father's Name:</span>
                        <span className="font-medium text-gray-900">{child.father_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Mother's Name:</span>
                        <span className="font-medium text-gray-900">{child.mother_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Contact / Emergency:</span>
                        <span className="font-medium text-gray-900">{child.emergency_contact || child.parent_phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Address:</span>
                        <span className="font-medium text-gray-900 truncate max-w-[200px]" title={child.address}>
                          {child.address || 'N/A'}{child.city ? `, ${child.city}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this Child */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/students/${child.id}`)}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition text-center cursor-pointer"
                    >
                      👤 Full Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChild(child);
                        navigate('/attendance');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition text-center cursor-pointer"
                    >
                      📊 Attendance
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChild(child);
                        navigate('/fees');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition text-center cursor-pointer"
                    >
                      💰 Fees
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChild(child);
                        navigate('/assignments');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl hover:bg-purple-100 transition text-center cursor-pointer"
                    >
                      📋 Assignments
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Teacher Scoped Student Notice */}
      {isTeacher() && (
        <div className="mb-4 p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-xs text-blue-900 shadow-2xs">
          <span className="text-xl">👨‍🏫</span>
          <div>
            <span className="font-bold block">Assigned Students Faculty View</span>
            <span>Displaying students enrolled in your assigned classes and sections ({students.length} students).</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Students</h1>
              {currentSchool && (
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  📍 {currentSchool.shortName || currentSchool.name}
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">Manage student records</p>
          </div>
          {!isStudent() && (
            <div className="flex flex-wrap items-center gap-2.5">
              {hasPermission('manage-tools') && (
                <>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                    title="Download CSV Template for student import"
                  >
                    <span>📥</span>
                    <span>Download Template</span>
                  </button>
                  <button
                    onClick={() => navigate('/tools/bulk')}
                    className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                    title="Import students in bulk"
                  >
                    <span>📤</span>
                    <span>Import Students</span>
                  </button>
                </>
              )}
              {!isTeacher() && hasPermission('create-students') && (
                <button
                  onClick={() => navigate('/students/create')}
                  className="btn-primary flex items-center space-x-2 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Student</span>
                </button>
              )}
            </div>
          )}
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

