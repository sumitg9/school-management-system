import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { assignmentAPI, classAPI, sectionAPI, subjectAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';

const AssignmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { showValidationError } = useAlert();
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

  const fetchSubjects = async () => {
    try {
      const response = await subjectAPI.getAll({ per_page: 100 });
      if (response.success) {
        setSubjects(response.data);
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
        setFormData({
          class_id: response.data.class_id || '',
          section_id: response.data.section_id || '',
          subject_id: response.data.subject_id || '',
          title: response.data.title || '',
          description: response.data.description || '',
          due_date: response.data.due_date || '',
          total_marks: response.data.total_marks || '',
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
    setLoading(true);

    try {
      if (isEditMode) {
        await assignmentAPI.update(id, formData);
        toast.success('Assignment updated successfully');
      } else {
        await assignmentAPI.create(formData);
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
                disabled={!formData.class_id}
                required
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

