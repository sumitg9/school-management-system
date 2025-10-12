import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { subjectAPI } from '../../services/api';

const SubjectForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'core',
    credits: '',
    total_marks: '',
    passing_marks: '',
    theory_marks: '',
    practical_marks: '',
  });

  useEffect(() => {
    if (isEdit) {
      fetchSubject();
    }
  }, [id]);

  const fetchSubject = async () => {
    setLoading(true);
    try {
      const response = await subjectAPI.getById(id);
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch subject details');
      navigate('/subjects');
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
        await subjectAPI.update(id, formData);
        toast.success('Subject updated successfully');
      } else {
        await subjectAPI.create(formData);
        toast.success('Subject created successfully');
      }
      navigate('/subjects');
    } catch (error) {
      toast.error(error.message || `Failed to ${isEdit ? 'update' : 'create'} subject`);
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
            onClick={() => navigate('/subjects')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Subject' : 'Add New Subject'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update subject information' : 'Fill in the subject details'}
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
                Subject Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Mathematics, Physics"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., MATH101, PHY201"
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
                placeholder="Brief description of the subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="core">Core</option>
                <option value="elective">Elective</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credits
              </label>
              <input
                type="number"
                name="credits"
                value={formData.credits}
                onChange={handleChange}
                className="input-field"
                min="0"
                step="0.5"
                placeholder="e.g., 3, 4"
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
                Total Marks
              </label>
              <input
                type="number"
                name="total_marks"
                value={formData.total_marks}
                onChange={handleChange}
                className="input-field"
                min="0"
                placeholder="e.g., 100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passing Marks
              </label>
              <input
                type="number"
                name="passing_marks"
                value={formData.passing_marks}
                onChange={handleChange}
                className="input-field"
                min="0"
                placeholder="e.g., 40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Theory Marks
              </label>
              <input
                type="number"
                name="theory_marks"
                value={formData.theory_marks}
                onChange={handleChange}
                className="input-field"
                min="0"
                placeholder="e.g., 70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Practical Marks
              </label>
              <input
                type="number"
                name="practical_marks"
                value={formData.practical_marks}
                onChange={handleChange}
                className="input-field"
                min="0"
                placeholder="e.g., 30"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/subjects')}
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
            {loading ? 'Saving...' : isEdit ? 'Update Subject' : 'Create Subject'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubjectForm;

