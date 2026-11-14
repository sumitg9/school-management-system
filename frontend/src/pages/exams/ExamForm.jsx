import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { examAPI, academicYearAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';

const ExamForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { showValidationError } = useAlert();
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState({
    academic_year_id: '',
    name: '',
    description: '',
    type: 'midterm',
    start_date: '',
    end_date: '',
    total_marks: '',
    passing_marks: '',
  });

  useEffect(() => {
    fetchAcademicYears();
    if (isEditMode) {
      fetchExam();
    }
  }, [id]);

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearAPI.getAll({ per_page: 100 });
      if (response.success) {
        setAcademicYears(response.data);
        // Auto-select current academic year if creating new
        if (!isEditMode) {
          const currentYear = response.data.find(year => year.is_current);
          if (currentYear) {
            setFormData(prev => ({ ...prev, academic_year_id: currentYear.id }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
    }
  };

  const fetchExam = async () => {
    setLoading(true);
    try {
      const response = await examAPI.getById(id);
      if (response.success) {
        setFormData({
          academic_year_id: response.data.academic_year_id || '',
          name: response.data.name || '',
          description: response.data.description || '',
          type: response.data.type || 'midterm',
          start_date: response.data.start_date || '',
          end_date: response.data.end_date || '',
          total_marks: response.data.total_marks || '',
          passing_marks: response.data.passing_marks || '',
        });
      }
    } catch (error) {
      toast.error('Failed to fetch exam details');
      navigate('/exams');
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
        await examAPI.update(id, formData);
        toast.success('Exam updated successfully');
      } else {
        await examAPI.create(formData);
        toast.success('Exam created successfully');
      }
      navigate('/exams');
    } catch (error) {
      showValidationError(error, `Failed to ${isEditMode ? 'update' : 'create'} exam`);
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
            onClick={() => navigate('/exams')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Exam' : 'Create Exam'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode ? 'Update exam information' : 'Add a new exam'}
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
                Exam Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., First Term Exam"
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
                placeholder="Exam description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exam Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
                <option value="quiz">Quiz</option>
                <option value="practical">Practical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>
        </div>

        {/* Marks Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Marks Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passing Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="passing_marks"
                value={formData.passing_marks}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 40"
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
            onClick={() => navigate('/exams')}
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
            {loading ? 'Saving...' : isEditMode ? 'Update Exam' : 'Create Exam'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExamForm;

