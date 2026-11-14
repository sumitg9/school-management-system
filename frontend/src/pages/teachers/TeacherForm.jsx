import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { teacherAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { useSettings } from '../../context/SettingsContext';
import { getMaxTeacherDateOfBirth, validateTeacherDateOfBirth } from '../../utils/dateFormatter';

const TeacherForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { showValidationError } = useAlert();
  const { settings } = useSettings();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    qualification: '',
    experience_years: '0',
    department: '',
    designation: '',
    specialization: '',
    joining_date: new Date().toISOString().substring(0, 10),
    employment_type: 'full-time',
    salary: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    previous_school: '',
    certifications: '',
    status: 'active',
  });

  const departments = [
    'Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science',
    'Physical Education', 'Arts', 'Music', 'Languages', 'Administration'
  ];

  const designations = [
    'Principal', 'Vice Principal', 'Head of Department', 'Senior Teacher',
    'Teacher', 'Assistant Teacher', 'Lab Assistant', 'Sports Coach',
    'Librarian', 'Counselor', 'Administrative Staff'
  ];

  useEffect(() => {
    if (isEdit) {
      fetchTeacher();
    }
  }, [id]);

  const fetchTeacher = async () => {
    setLoading(true);
    try {
      const response = await teacherAPI.getById(id);
      if (response.success && response.data) {
        const t = response.data;
        setFormData({
          employee_id: t.employee_id || '',
          first_name: t.first_name || '',
          last_name: t.last_name || '',
          date_of_birth: t.date_of_birth ? String(t.date_of_birth).substring(0, 10) : '',
          gender: t.gender || '',
          blood_group: t.blood_group || '',
          email: t.email || '',
          phone: t.phone || '',
          address: t.address || '',
          city: t.city || '',
          state: t.state || '',
          country: t.country || 'India',
          postal_code: t.postal_code || '',
          qualification: t.qualification || '',
          experience_years: t.experience_years !== null && t.experience_years !== undefined ? String(t.experience_years) : '0',
          department: t.department || '',
          designation: t.designation || '',
          specialization: t.specialization || '',
          joining_date: t.joining_date ? String(t.joining_date).substring(0, 10) : new Date().toISOString().substring(0, 10),
          employment_type: t.employment_type === 'permanent' ? 'full-time' : (t.employment_type || 'full-time'),
          salary: t.salary !== null && t.salary !== undefined ? String(t.salary) : '',
          bank_name: t.bank_name || '',
          bank_account_number: t.bank_account_number || '',
          bank_ifsc_code: t.bank_ifsc_code || t.bank_ifsc || '',
          emergency_contact_name: t.emergency_contact_name || '',
          emergency_contact_phone: t.emergency_contact_phone || '',
          emergency_contact_relation: t.emergency_contact_relation || '',
          previous_school: t.previous_school || '',
          certifications: t.certifications || '',
          status: t.status || 'active',
        });
      }
    } catch (error) {
      toast.error('Failed to fetch teacher details');
      navigate('/teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const teacherMinYears = settings?.teacher_min_age_years ?? 20;
  const maxTeacherDOB = getMaxTeacherDateOfBirth(settings);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dobError = validateTeacherDateOfBirth(formData.date_of_birth, settings);
    if (dobError) {
      showValidationError(dobError, 'Teacher Age Requirement');
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        await teacherAPI.update(id, formData);
        toast.success('Teacher updated successfully');
      } else {
        await teacherAPI.create(formData);
        toast.success('Teacher created successfully');
      }
      navigate('/teachers');
    } catch (error) {
      showValidationError(error, `Failed to ${isEdit ? 'update' : 'create'} teacher`);
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
            onClick={() => navigate('/teachers')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update teacher information' : 'Fill in the teacher details'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employment Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation <span className="text-red-500">*</span>
              </label>
              <select
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Designation</option>
                {designations.map((desig) => (
                  <option key={desig} value={desig}>
                    {desig}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Joining Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                name="employment_type"
                value={formData.employment_type === 'permanent' ? 'full-time' : formData.employment_type}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="full-time">Full-Time (Permanent)</option>
                <option value="contract">Contract</option>
                <option value="part-time">Part-Time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on-leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                max={maxTeacherDOB}
                data-entity-type="teacher"
                data-min-years={teacherMinYears}
                className="input-field"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least {teacherMinYears} years back (born on or before {maxTeacherDOB})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blood Group
              </label>
              <select
                name="blood_group"
                value={formData.blood_group}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input-field"
                rows="2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qualification <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., M.Ed, B.Ed, Ph.D"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience (Years)
              </label>
              <input
                type="number"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleChange}
                className="input-field"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Mathematics, Physics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Previous School
              </label>
              <input
                type="text"
                name="previous_school"
                value={formData.previous_school}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certifications
              </label>
              <textarea
                name="certifications"
                value={formData.certifications}
                onChange={handleChange}
                className="input-field"
                rows="2"
                placeholder="List any certifications or additional qualifications"
              />
            </div>
          </div>
        </div>

        {/* Salary & Bank Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Salary & Bank Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Salary (₹)
              </label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                className="input-field"
                placeholder="₹ 0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank IFSC Code
              </label>
              <input
                type="text"
                name="bank_ifsc_code"
                value={formData.bank_ifsc_code}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relation
              </label>
              <input
                type="text"
                name="emergency_contact_relation"
                value={formData.emergency_contact_relation}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., Spouse, Parent, Sibling"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/teachers')}
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
            {loading ? 'Saving...' : isEdit ? 'Update Teacher' : 'Create Teacher'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeacherForm;

