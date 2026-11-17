import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { classAPI, sectionAPI, teacherAPI, studentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';

const ClassDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isStudent, isTeacher, hasPermission, isClassAssignedToTeacher, filterTeacherSections, filterTeacherStudents } = useAuth();
  const confirm = useConfirm();

  const [classData, setClassData] = useState(null);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isAssignTeacherModalOpen, setIsAssignTeacherModalOpen] = useState(false);
  const [isClassTeacherModalOpen, setIsClassTeacherModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [targetSectionForTeacher, setTargetSectionForTeacher] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Section Form state
  const [sectionFormData, setSectionFormData] = useState({
    name: '',
    room_number: '',
    capacity: 40,
    section_teacher_id: '',
    description: '',
    status: 'active',
  });

  // Assign Teacher Modal state
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  useEffect(() => {
    fetchClassAndRelated();
  }, [id]);

  const fetchClassAndRelated = async () => {
    setLoading(true);
    try {
      const [classRes, secRes, teacherRes, studentRes] = await Promise.all([
        classAPI.getById(id),
        sectionAPI.getAll({ class_id: id, per_page: 'all' }),
        teacherAPI.getAll({ per_page: 100, status: 'active' }),
        studentAPI.getAll({ class_id: id, per_page: 50 }).catch(() => ({ data: [] })),
      ]);

      if (classRes.success) {
        if (isTeacher() && !isClassAssignedToTeacher(id, [classRes.data])) {
          toast.error("You don't have permission to view this class.");
          navigate('/classes');
          return;
        }
        setClassData(classRes.data);
      }
      if (secRes.success && secRes.data) {
        setSections(secRes.data);
      }
      if (teacherRes.success && teacherRes.data) {
        setTeachers(teacherRes.data);
      }
      if (studentRes.data) {
        setStudents(studentRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch class details:', error);
      toast.error('Failed to fetch class details');
      navigate('/classes');
    } finally {
      setLoading(false);
    }
  };

  const refreshSectionsAndClass = async () => {
    try {
      const [classRes, secRes] = await Promise.all([
        classAPI.getById(id),
        sectionAPI.getAll({ class_id: id, per_page: 'all' }),
      ]);
      if (classRes.success) setClassData(classRes.data);
      if (secRes.success && secRes.data) setSections(secRes.data);
    } catch (err) {
      console.error('Error refreshing class data:', err);
    }
  };

  // Open Create Section Modal
  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionFormData({
      name: '',
      room_number: '',
      capacity: 40,
      section_teacher_id: '',
      description: '',
      status: 'active',
    });
    setIsSectionModalOpen(true);
  };

  // Open Edit Section Modal
  const handleOpenEditSection = (section) => {
    setEditingSection(section);
    setSectionFormData({
      name: section.name || '',
      room_number: section.room_number || '',
      capacity: section.capacity || 40,
      section_teacher_id: section.section_teacher_id || section.section_teacher?.id || '',
      description: section.description || '',
      status: section.status || 'active',
    });
    setIsSectionModalOpen(true);
  };

  // Open Assign Teacher to Section Modal
  const handleOpenAssignTeacherModal = (section) => {
    setTargetSectionForTeacher(section);
    setSelectedTeacherId(section.section_teacher_id || section.section_teacher?.id || '');
    setIsAssignTeacherModalOpen(true);
  };

  // Open Assign Class Teacher Modal
  const handleOpenClassTeacherModal = () => {
    setSelectedTeacherId(classData?.class_teacher_id || classData?.class_teacher?.id || '');
    setIsClassTeacherModalOpen(true);
  };

  // Submit Section Form (Create or Edit)
  const handleSectionFormSubmit = async (e) => {
    e.preventDefault();
    if (!sectionFormData.name.trim()) {
      toast.warning('Section name is required (e.g. A, B, C).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...sectionFormData,
        class_id: id,
      };

      if (editingSection) {
        await sectionAPI.update(editingSection.id, payload);
        toast.success(`Section ${sectionFormData.name} updated successfully!`);
      } else {
        await sectionAPI.create(payload);
        toast.success(`Section ${sectionFormData.name} created successfully!`);
      }
      setIsSectionModalOpen(false);
      refreshSectionsAndClass();
    } catch (err) {
      console.error('Error saving section:', err);
      toast.error(err.message || 'Failed to save section.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Assign Teacher to Section
  const handleAssignTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!targetSectionForTeacher) return;

    setSubmitting(true);
    try {
      await sectionAPI.assignTeacher(targetSectionForTeacher.id, selectedTeacherId || null);
      const teacherName = teachers.find(t => String(t.id) === String(selectedTeacherId))?.first_name || 'None';
      toast.success(
        selectedTeacherId
          ? `Teacher assigned to Section ${targetSectionForTeacher.name} successfully!`
          : `Teacher removed from Section ${targetSectionForTeacher.name}.`
      );
      setIsAssignTeacherModalOpen(false);
      refreshSectionsAndClass();
    } catch (err) {
      toast.error('Failed to assign section teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Assign Class Teacher
  const handleAssignClassTeacherSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await classAPI.update(id, {
        class_teacher_id: selectedTeacherId || null,
      });
      toast.success(
        selectedTeacherId
          ? 'Class teacher assigned successfully!'
          : 'Class teacher unassigned.'
      );
      setIsClassTeacherModalOpen(false);
      refreshSectionsAndClass();
    } catch (err) {
      toast.error('Failed to update class teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Section
  const handleDeleteSection = async (section) => {
    if (!hasPermission('delete-classes')) {
      toast.error('Access Denied: You do not have permission to delete section records.');
      return;
    }
    const isConfirmed = await confirm({
      title: `Delete Section ${section.name}?`,
      message: `Are you sure you want to delete Section "${section.name}" of ${classData.name}? Any enrolled students in this section will be unlinked. This action cannot be undone.`,
      confirmText: 'Delete Section',
      confirmVariant: 'danger',
    });

    if (!isConfirmed) return;

    try {
      await sectionAPI.delete(section.id);
      toast.success(`Section ${section.name} deleted successfully`);
      refreshSectionsAndClass();
    } catch (err) {
      toast.error('Failed to delete section.');
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'sections', name: `Sections (${sections.length})`, icon: '📂' },
    { id: 'students', name: `Students (${students.length})`, icon: '👨‍🎓' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Class not found</p>
        </div>
      </div>
    );
  }

  const canEditClass = !isStudent() && !isTeacher() && hasPermission('edit-classes');
  const canCreateSection = !isStudent() && !isTeacher() && hasPermission('create-classes');
  const canDeleteSection = !isStudent() && !isTeacher() && hasPermission('delete-classes');
  const displayedSections = isTeacher()
    ? filterTeacherSections(sections, classData ? [classData] : [])
    : sections;
  const displayedStudents = isTeacher()
    ? filterTeacherStudents(students, classData ? [classData] : [], displayedSections)
    : students;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/classes')}
            className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
              <Badge variant="primary">Grade {classData.numeric_name || classData.name}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Academic Class Details, Section Rosters & Teacher Allocations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreateSection && (
            <button
              onClick={handleOpenCreateSection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <span>+ Add Section</span>
            </button>
          )}

          {canEditClass && (
            <button
              onClick={() => navigate(`/classes/${id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Class Banner Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-sm flex-shrink-0">
              {classData.name?.charAt(0) || 'C'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{classData.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{classData.description || 'Standard institutional curriculum'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ● Status: {classData.status || 'Active'}
                </span>
                <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  Display Order: #{classData.order || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:border-l md:border-gray-100 md:pl-6 text-xs">
            <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-500 block">Class Teacher</span>
              <span className="font-bold text-gray-900 mt-0.5 block truncate">
                {classData.class_teacher
                  ? `${classData.class_teacher.first_name} ${classData.class_teacher.last_name}`
                  : 'Not Assigned'}
              </span>
              {canEditClass && (
                <button
                  onClick={handleOpenClassTeacherModal}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold mt-1 inline-block"
                >
                  {classData.class_teacher ? 'Change' : '+ Assign'}
                </button>
              )}
            </div>

            <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-500 block">Total Sections</span>
              <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                {sections.length} Sections
              </span>
              <span className="text-[11px] text-gray-400">Class divisions</span>
            </div>

            <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-500 block">Enrolled Students</span>
              <span className="font-bold text-blue-700 text-sm mt-0.5 block">
                {sections.reduce((acc, s) => acc + (s.students_count || 0), 0) || students.length} Students
              </span>
              <span className="text-[11px] text-gray-400">Across sections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 font-semibold text-xs flex items-center space-x-2 transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* TAB: SECTIONS MANAGEMENT */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Class Sections & Teacher Assignments</h3>
              <p className="text-xs text-gray-500">
                Manage section divisions (e.g. 10-A, 10-B), allocate room numbers, and assign dedicated Section Teachers.
              </p>
            </div>
            {canCreateSection && (
              <button
                onClick={handleOpenCreateSection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
              >
                <span>+ Add Section</span>
              </button>
            )}
          </div>

          {displayedSections.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <span className="text-4xl block mb-2">📂</span>
              <h4 className="text-base font-bold text-gray-800">
                {isTeacher() ? 'No Assigned Sections Found' : 'No Sections in this Class'}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {isTeacher()
                  ? 'There are currently no sections in this class assigned to your teaching roster.'
                  : 'Create sections (such as Section A, Section B) to assign students and dedicated class teachers.'}
              </p>
              {canCreateSection && (
                <button
                  onClick={handleOpenCreateSection}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-700 transition"
                >
                  Create First Section
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedSections.map((sec) => {
                const assignedTeacher = sec.section_teacher;
                const capacity = sec.capacity || 40;
                const strength = sec.students_count || sec.current_strength || 0;
                const occupancyPercent = Math.min(100, Math.round((strength / capacity) * 100));

                return (
                  <div
                    key={sec.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Section Card Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-100">
                            {sec.name}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">
                              Section {sec.name}
                            </h4>
                            <span className="text-[11px] text-gray-400">
                              {sec.room_number ? `Room: ${sec.room_number}` : 'Room: Not Specified'}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sec.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {sec.status === 'active' ? '● Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Section Teacher Details */}
                      <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Section Teacher
                          </span>
                          {canEditClass && (
                            <button
                              onClick={() => handleOpenAssignTeacherModal(sec)}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              {assignedTeacher ? 'Change' : '+ Assign'}
                            </button>
                          )}
                        </div>

                        {assignedTeacher ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold">
                              {assignedTeacher.first_name?.charAt(0) || 'T'}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {assignedTeacher.first_name} {assignedTeacher.last_name}
                              </p>
                              <p className="text-[11px] text-gray-500 truncate">
                                {assignedTeacher.department || assignedTeacher.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs text-gray-400 py-1">
                            <span>No teacher assigned</span>
                            {canEditClass && (
                              <button
                                onClick={() => handleOpenAssignTeacherModal(sec)}
                                className="text-xs text-blue-600 font-semibold hover:underline"
                              >
                                Assign Now →
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Strength / Capacity Progress Bar */}
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Student Enrollment</span>
                          <span className="font-bold text-gray-800">
                            {strength} / {capacity}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              occupancyPercent >= 90
                                ? 'bg-rose-500'
                                : occupancyPercent >= 70
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section Card Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-2">
                      {canEditClass && (
                        <button
                          onClick={() => handleOpenAssignTeacherModal(sec)}
                          title="Assign Section Teacher"
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1"
                        >
                          <span>👨‍🏫 Teacher</span>
                        </button>
                      )}

                      {canEditClass && (
                        <button
                          onClick={() => handleOpenEditSection(sec)}
                          title="Edit Section"
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}

                      {canDeleteSection && (
                        <button
                          onClick={() => handleDeleteSection(sec)}
                          title="Delete Section"
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Class Specification</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Official Class Name:</span>
                <span className="font-bold text-gray-900">{classData.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Numeric Level:</span>
                <span className="font-bold text-gray-900">{classData.numeric_name || classData.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Room Allocation:</span>
                <span className="font-bold text-gray-900">{classData.room_number || 'Section Specific'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Total Class Capacity:</span>
                <span className="font-bold text-gray-900">{classData.capacity || '40'} Seats</span>
              </div>
              <div className="flex flex-col py-1">
                <span className="text-gray-500 mb-1">Description:</span>
                <span className="font-medium text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  {classData.description || 'No special curriculum notes.'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Head Class Teacher</h3>
              {canEditClass && (
                <button
                  onClick={handleOpenClassTeacherModal}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                >
                  {classData.class_teacher ? 'Change Teacher' : '+ Assign Teacher'}
                </button>
              )}
            </div>

            {classData.class_teacher ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {classData.class_teacher.first_name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">
                      {classData.class_teacher.first_name} {classData.class_teacher.last_name}
                    </h4>
                    <p className="text-gray-500 text-xs">{classData.class_teacher.department || 'Faculty Member'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block text-[11px]">Email</span>
                    <span className="font-semibold text-gray-800 block truncate">{classData.class_teacher.email}</span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block text-[11px]">Phone</span>
                    <span className="font-semibold text-gray-800 block">{classData.class_teacher.phone || '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">👨‍🏫</span>
                <p className="text-xs text-gray-500">No primary Class Teacher currently assigned.</p>
                {canEditClass && (
                  <button
                    onClick={handleOpenClassTeacherModal}
                    className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-blue-700 transition"
                  >
                    Assign Class Teacher
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: STUDENTS */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Enrolled Students in {classData.name}</h3>
            <span className="text-xs text-gray-500 font-medium">{displayedStudents.length} Students Listed</span>
          </div>

          {displayedStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No students enrolled in your assigned sections yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Student Name</th>
                    <th className="px-6 py-3 font-semibold">Roll Number</th>
                    <th className="px-6 py-3 font-semibold">Section</th>
                    <th className="px-6 py-3 font-semibold">Admission No</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedStudents.map((stu) => (
                    <tr key={stu.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-semibold text-gray-900">
                        {stu.first_name} {stu.last_name}
                      </td>
                      <td className="px-6 py-3 font-mono">{stu.roll_number || '—'}</td>
                      <td className="px-6 py-3">
                        <Badge variant="info">Section {stu.section?.name || 'A'}</Badge>
                      </td>
                      <td className="px-6 py-3 font-mono">{stu.admission_number || '—'}</td>
                      <td className="px-6 py-3">
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                          ● {stu.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT SECTION */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => !submitting && setIsSectionModalOpen(false)}
        title={editingSection ? `Edit Section ${editingSection.name}` : `Add New Section to ${classData.name}`}
        size="md"
      >
        <form onSubmit={handleSectionFormSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Section Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sectionFormData.name}
                onChange={(e) => setSectionFormData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                required
                placeholder="e.g. A, B, C, or Rose"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={sectionFormData.room_number}
                onChange={(e) => setSectionFormData(prev => ({ ...prev, room_number: e.target.value }))}
                placeholder="e.g. Room 204"
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Maximum Student Capacity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={sectionFormData.capacity}
                onChange={(e) => setSectionFormData(prev => ({ ...prev, capacity: e.target.value }))}
                required
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Assign Section Teacher
              </label>
              <select
                value={sectionFormData.section_teacher_id}
                onChange={(e) => setSectionFormData(prev => ({ ...prev, section_teacher_id: e.target.value }))}
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">No Teacher Assigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name} ({t.department || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Description / Special Notes
            </label>
            <input
              type="text"
              value={sectionFormData.description}
              onChange={(e) => setSectionFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Science stream section"
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsSectionModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN TEACHER TO SECTION */}
      <Modal
        isOpen={isAssignTeacherModalOpen}
        onClose={() => !submitting && setIsAssignTeacherModalOpen(false)}
        title={`Assign Teacher to Section ${targetSectionForTeacher?.name || ''}`}
        size="sm"
      >
        <form onSubmit={handleAssignTeacherSubmit} className="space-y-4 p-6">
          <p className="text-xs text-gray-500">
            Select a faculty member to be assigned as the official Section Teacher for{' '}
            <strong>{classData.name} - Section {targetSectionForTeacher?.name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Select Faculty Member
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">-- No Teacher Assigned --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.department || 'Faculty'} - {t.designation || 'Teacher'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsAssignTeacherModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN CLASS TEACHER */}
      <Modal
        isOpen={isClassTeacherModalOpen}
        onClose={() => !submitting && setIsClassTeacherModalOpen(false)}
        title={`Assign Class Teacher: ${classData.name}`}
        size="sm"
      >
        <form onSubmit={handleAssignClassTeacherSubmit} className="space-y-4 p-6">
          <p className="text-xs text-gray-500">
            Select a faculty member to serve as the Head Class Teacher for <strong>{classData.name}</strong>.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Select Faculty Member
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">-- No Class Teacher --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.department || 'Faculty'} - {t.designation || 'Teacher'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsClassTeacherModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Class Teacher'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassDetail;
