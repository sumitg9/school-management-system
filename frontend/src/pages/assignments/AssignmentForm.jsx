import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { assignmentAPI, classAPI, sectionAPI, subjectAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';

const AssignmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { showValidationError } = useAlert();
  const {
    isStudent,
    isTeacher,
    user,
    currentTeacher,
    filterTeacherClasses,
    filterTeacherSections,
    filterTeacherSubjects,
    getTeacherAssignedSectionIds,
    isClassAssignedToTeacher,
    isSectionAssignedToTeacher,
    isSubjectAssignedToTeacher,
  } = useAuth();

  if (isStudent()) {
    return <Navigate to="/assignments" replace />;
  }
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    class_id: '',
    section_id: '',
    subject_id: '',
    title: '',
    description: '',
    due_date: '',
    total_marks: '',
  });

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    if (isEditMode) {
      fetchAssignment();
    }
  }, [id]);

  useEffect(() => {
    if (formData.class_id) {
      fetchSections(formData.class_id);
    } else {
      setSections([]);
    }
  }, [formData.class_id]);

  const fetchClasses = async () => {
    try {
      const [classRes, secRes] = await Promise.all([
        classAPI.getAll({ per_page: 100 }),
        isTeacher() ? sectionAPI.getAll({ per_page: 200 }) : Promise.resolve({ success: true, data: [] }),
      ]);
      if (classRes.success) {
        let list = classRes.data || [];
        if (isTeacher()) {
          // Only show classes where the teacher is explicitly assigned to at least one section
          const teacherSecs = filterTeacherSections(secRes.data || [], list);
          const allowedClassIds = new Set(teacherSecs.map(s => String(s.class_id)));
          list = list.filter(c => allowedClassIds.has(String(c.id)));
        }
        setClasses(list);

        // Auto-select class if the teacher only has one assigned class
        if (isTeacher() && list.length === 1 && !formData.class_id) {
          setFormData(prev => ({ ...prev, class_id: String(list[0].id) }));
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await sectionAPI.getAll({ class_id: classId, per_page: 100 });
      if (response.success) {
        const raw = response.data || [];
        const scoped = isTeacher() ? filterTeacherSections(raw, classes) : raw;
        setSections(scoped);

        // If only 1 section is assigned to this teacher in this class, auto-select it
        if (isTeacher() && scoped.length === 1) {
          setFormData(prev => ({ ...prev, section_id: String(scoped[0].id) }));
        } else if (isTeacher() && scoped.length === 0) {
          setFormData(prev => ({ ...prev, section_id: '' }));
        }
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await subjectAPI.getAll({ per_page: 100 });
      if (response.success) {
        setSubjects(isTeacher() ? filterTeacherSubjects(response.data || []) : (response.data || []));
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchAssignment = async () => {
    setLoading(true);
    try {
      const response = await assignmentAPI.getById(id);
      if (response.success) {
        const data = response.data;
        if (isTeacher()) {
          const tId = currentTeacher?.id ? String(currentTeacher.id) : null;
          const uId = user?.id ? String(user.id) : null;
          const isOwner = (tId && String(data.teacher_id) === tId) || (uId && String(data.created_by) === uId);
          if (!isOwner) {
            if (data.class_id && !isClassAssignedToTeacher(data.class_id, classes)) {
              toast.error('You are not authorized to edit this assignment');
              navigate('/assignments');
              return;
            }
            if (data.section_id && !isSectionAssignedToTeacher(data.section_id, [], classes)) {
              toast.error('You are not authorized to edit this assignment');
              navigate('/assignments');
              return;
            }
            if (data.subject_id && !isSubjectAssignedToTeacher(data.subject_id, [])) {
              toast.error('You are not authorized to edit this assignment');
              navigate('/assignments');
              return;
            }
          }
        }
        setFormData({
          class_id: data.class_id || '',
          section_id: data.section_id || '',
          subject_id: data.subject_id || '',
          title: data.title || '',
          description: data.description || '',
          due_date: data.due_date || '',
          total_marks: data.total_marks || '',
        });
      }
    } catch (error) {
      toast.error('Failed to fetch assignment details');
      navigate('/assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isTeacher()) {
      const assignedSecIds = getTeacherAssignedSectionIds(sections, classes) || new Set();
      if (!formData.section_id || !assignedSecIds.has(String(formData.section_id))) {
        toast.error('You can only create assignments for your assigned section(s).');
        return;
      }
      if (!formData.subject_id || !isSubjectAssignedToTeacher(formData.subject_id, subjects)) {
        toast.error('You can only create assignments for your assigned subject(s).');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        teacher_id: formData.teacher_id || currentTeacher?.id || null,
      };
      if (isEditMode) {
        await assignmentAPI.update(id, payload);
        toast.success('Assignment updated successfully');
      } else {
        await assignmentAPI.create(payload);
        toast.success('Assignment created successfully');
      }
      navigate('/assignments');
    } catch (error) {
      showValidationError(error, `Failed to ${isEditMode ? 'update' : 'create'} assignment`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/assignments')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Assignment' : 'Create Assignment'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode ? 'Update assignment information' : 'Add a new assignment'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                name="class_id"
                value={formData.class_id}
                onChange={handleChange}
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
                name="section_id"
                value={formData.section_id}
                onChange={handleChange}
                className="input-field"
                disabled={!formData.class_id || (isTeacher() && sections.length === 0)}
                required
              >
                <option value="">
                  {isTeacher() && sections.length === 0
                    ? 'No assigned sections available'
                    : 'Select Section'}
                </option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              {isTeacher() && sections.length === 0 && formData.class_id && (
                <p className="text-xs text-amber-600 mt-1">
                  You do not have any assigned sections in this class.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                name="subject_id"
                value={formData.subject_id}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Chapter 5 Exercises"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                rows="4"
                placeholder="Assignment description and instructions..."
                required
              />
            </div>
          </div>
        </div>

        {/* Assignment Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="total_marks"
                value={formData.total_marks}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 100"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/assignments')}
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
            {loading ? 'Saving...' : isEditMode ? 'Update Assignment' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignmentForm;

