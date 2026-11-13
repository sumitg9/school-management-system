import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeAPI, academicYearAPI, classAPI } from '../../services/api';

const FeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    academic_year_id: '',
    class_id: '',
    name: '',
    description: '',
    type: 'tuition',
    amount: '',
    due_date: '',
  });

  useEffect(() => {
    fetchAcademicYears();
    fetchClasses();
    if (isEditMode) {
      fetchFee();
    }
  }, [id]);

  const fetchAcademicYears = async () => {
    try {
      const response = await academicYearAPI.getAll({ per_page: 100 });
      if (response.success) {
        setAcademicYears(response.data);
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

  const fetchFee = async () => {
    setLoading(true);
    try {
      const response = await feeAPI.getById(id);
      if (response.success) {
        setFormData({
          academic_year_id: response.data.academic_year_id || '',
          class_id: response.data.class_id || '',
          name: response.data.name || '',
          description: response.data.description || '',
          type: response.data.type || 'tuition',
          amount: response.data.amount || '',
          due_date: response.data.due_date || '',
        });
      }
    } catch (error) {
      toast.error('Failed to fetch fee details');
      navigate('/fees');
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
        await feeAPI.update(id, formData);
        toast.success('Fee structure updated successfully');
      } else {
        await feeAPI.create(formData);
        toast.success('Fee structure created successfully');
      }
      navigate('/fees');
    } catch (error) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} fee structure`);
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
            onClick={() => navigate('/fees')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Fee Structure' : 'Create Fee Structure'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode ? 'Update fee structure information' : 'Add a new fee structure'}
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
                Class
              </label>
              <select
                name="class_id"
                value={formData.class_id}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Leave empty to apply to all classes</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Tuition Fee"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="tuition">Tuition</option>
                <option value="transport">Transport</option>
                <option value="library">Library</option>
                <option value="sports">Sports</option>
                <option value="exam">Exam</option>
              </select>
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
                placeholder="Fee description..."
              />
            </div>
          </div>
        </div>

        {/* Fee Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="input-field"
                placeholder="₹ 0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
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
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/fees')}
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
            {loading ? 'Saving...' : isEditMode ? 'Update Fee Structure' : 'Create Fee Structure'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeeForm;

