import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { classAPI, academicYearAPI, teacherAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';

const ClassForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { showValidationError } = useAlert();

  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [formData, setFormData] = useState({
    academic_year_id: '',
    name: '',
    description: '',
    class_teacher_id: '',
    room_number: '',
    capacity: '',
  });

  useEffect(() => {
    fetchAcademicYears();
    fetchTeachers();
    if (isEdit) {
      fetchClass();
    }
  }, [id]);

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearAPI.getAll();
      if (response.success) {
        setAcademicYears(response.data);
        // Set current academic year as default
        const current = response.data.find(ay => ay.is_current);
        if (current && !isEdit) {
          setFormData(prev => ({ ...prev, academic_year_id: current.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
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

  const fetchClass = async () => {
    setLoading(true);
    try {
      const response = await classAPI.getById(id);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch class details');
      navigate('/classes');
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
        await classAPI.update(id, formData);
        toast.success('Class updated successfully');
      } else {
        await classAPI.create(formData);
        toast.success('Class created successfully');
      }
      navigate('/classes');
    } catch (error) {
      showValidationError(error, `Failed to ${isEdit ? 'update' : 'create'} class`);
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
            onClick={() => navigate('/classes')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Class' : 'Add New Class'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update class information' : 'Fill in the class details'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Class Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                name="academic_year_id"
                value={formData.academic_year_id}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Class 10, Grade 5"
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
                placeholder="Brief description of the class"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Teacher
              </label>
              <select
                name="class_teacher_id"
                value={formData.class_teacher_id}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Class Teacher</option>
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
            onClick={() => navigate('/classes')}
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
            {loading ? 'Saving...' : isEdit ? 'Update Class' : 'Create Class'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClassForm;

