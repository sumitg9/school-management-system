import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { sectionAPI, classAPI, teacherAPI } from '../../services/api';

const SectionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [formData, setFormData] = useState({
    class_id: '',
    name: '',
    description: '',
    section_teacher_id: '',
    room_number: '',
    capacity: '',
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    if (isEdit) {
      fetchSection();
    }
  }, [id]);

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

  const fetchTeachers = async () => {
    try {
      const response = await teacherAPI.getAll({ per_page: 100, status: 'active' });
      if (response.success) {
        setTeachers(response.data);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchSection = async () => {
    setLoading(true);
    try {
      const response = await sectionAPI.getById(id);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch section details');
      navigate('/sections');
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
      if (isEdit) {
        await sectionAPI.update(id, formData);
        toast.success('Section updated successfully');
      } else {
        await sectionAPI.create(formData);
        toast.success('Section created successfully');
      }
      navigate('/sections');
    } catch (error) {
      toast.error(error.message || `Failed to ${isEdit ? 'update' : 'create'} section`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
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
            onClick={() => navigate('/sections')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Section' : 'Add New Section'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update section information' : 'Fill in the section details'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Section Information</h2>
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
                Section Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Section A, Section B"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="input-field"
                rows="3"
                placeholder="Brief description of the section"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section Teacher
              </label>
              <select
                name="section_teacher_id"
                value={formData.section_teacher_id}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Section Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name} - {teacher.department}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Number
              </label>
              <input
                type="text"
                name="room_number"
                value={formData.room_number}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Room 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="input-field"
                min="1"
                placeholder="Maximum number of students"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/sections')}
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
            {loading ? 'Saving...' : isEdit ? 'Update Section' : 'Create Section'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SectionForm;

