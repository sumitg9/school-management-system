import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeAPI, academicYearAPI, classAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { getAllFeeTypes, saveCustomFeeType, formatFeeTypeLabel } from '../../utils/feeTypes';

const FeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { showValidationError } = useAlert();
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [feeTypes, setFeeTypes] = useState(() => getAllFeeTypes());
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');
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
    loadExistingFeeTypes();
    if (isEditMode) {
      fetchFee();
    }
  }, [id]);

  const loadExistingFeeTypes = async () => {
    try {
      const response = await feeAPI.getAll({ per_page: 100 });
      if (response && response.data) {
        const typesInDb = response.data.map(f => f.type).filter(Boolean);
        setFeeTypes(getAllFeeTypes(typesInDb));
      }
    } catch (err) {
      console.warn('Could not load existing fee types:', err);
    }
  };

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
        const feeType = response.data.type || 'tuition';
        setFeeTypes(prev => getAllFeeTypes([...prev.map(t => t.id), feeType]));
        setFormData({
          academic_year_id: response.data.academic_year_id || '',
          class_id: response.data.class_id || '',
          name: response.data.name || '',
          description: response.data.description || '',
          type: feeType,
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

  const handleApplyCustomType = () => {
    const trimmed = customTypeInput.trim();
    if (!trimmed) return;
    const created = saveCustomFeeType(trimmed);
    if (created) {
      setFeeTypes(getAllFeeTypes([created.id]));
      setFormData(prev => ({ ...prev, type: created.id }));
      setShowCustomInput(false);
      setCustomTypeInput('');
      toast.success(`Custom fee type "${created.label}" added and selected!`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalType = formData.type;
    if (showCustomInput && customTypeInput.trim()) {
      const created = saveCustomFeeType(customTypeInput.trim());
      if (created) {
        finalType = created.id;
        setFeeTypes(getAllFeeTypes([created.id]));
        setFormData(prev => ({ ...prev, type: created.id }));
      }
    }

    if (!finalType) {
      showValidationError('Please specify or select a Fee Type.', 'Validation Error');
      return;
    }

    setLoading(true);

    const payload = {
      ...formData,
      type: finalType,
    };

    try {
      if (isEditMode) {
        await feeAPI.update(id, payload);
        toast.success('Fee structure updated successfully');
      } else {
        await feeAPI.create(payload);
        toast.success('Fee structure created successfully');
      }
      navigate('/fees');
    } catch (error) {
      showValidationError(error, `Failed to ${isEditMode ? 'update' : 'create'} fee structure`);
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Fee Type <span className="text-red-500">*</span>
                </label>
                {!showCustomInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(true);
                      setCustomTypeInput('');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Custom Type</span>
                  </button>
                )}
              </div>

              {!showCustomInput ? (
                <div className="space-y-1">
                  <select
                    name="type"
                    value={formData.type}
                    onChange={(e) => {
                      if (e.target.value === '__add_custom__') {
                        setShowCustomInput(true);
                        setCustomTypeInput('');
                      } else {
                        handleChange(e);
                      }
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Select Fee Type</option>
                    <optgroup label="Standard Fee Types">
                      {feeTypes.filter(t => !t.isCustom).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </optgroup>
                    {feeTypes.some(t => t.isCustom) && (
                      <optgroup label="Custom Fee Types">
                        {feeTypes.filter(t => t.isCustom).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label} (Custom)
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__add_custom__" className="text-blue-600 font-bold">
                      ➕ + Add Custom Fee Type...
                    </option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Select a type or choose "+ Add Custom Fee Type" if not in the list.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                      <span>🏷️</span> Add Custom Fee Type
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      Cancel (Back to dropdown)
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTypeInput}
                      onChange={(e) => setCustomTypeInput(e.target.value)}
                      placeholder="e.g. Computer Lab, Robotics, Field Trip"
                      className="input-field flex-1 text-sm bg-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCustomType();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomType}
                      disabled={!customTypeInput.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      Add & Select
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    This custom type will be saved to your fee types list and selected for this fee structure.
                  </p>
                </div>
              )}
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

