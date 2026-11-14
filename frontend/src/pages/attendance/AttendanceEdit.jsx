import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { attendanceAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';

const AttendanceEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showValidationError } = useAlert();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: 'present',
    remarks: '',
  });
  const [attendanceData, setAttendanceData] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, [id]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await attendanceAPI.getById(id);
      if (response.success) {
        setAttendanceData(response.data);
        setFormData({
          status: response.data.status,
          remarks: response.data.remarks || '',
        });
      }
    } catch (error) {
      toast.error('Failed to fetch attendance details');
      navigate('/attendance');
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
      await attendanceAPI.update(id, formData);
      toast.success('Attendance updated successfully');
      navigate('/attendance');
    } catch (error) {
      showValidationError(error, 'Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !attendanceData) {
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
            onClick={() => navigate('/attendance')}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Attendance</h1>
            <p className="text-gray-600 mt-1">Update attendance record</p>
          </div>
        </div>
      </div>

      {/* Student Info */}
      {attendanceData && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Student Name</p>
              <p className="font-medium text-gray-900">
                {attendanceData.student?.first_name} {attendanceData.student?.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Admission Number</p>
              <p className="font-medium text-gray-900">{attendanceData.student?.admission_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Class & Section</p>
              <p className="font-medium text-gray-900">
                {attendanceData.class?.name} - {attendanceData.section?.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium text-gray-900">
                {new Date(attendanceData.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="input-field"
                placeholder="Optional remarks"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/attendance')}
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
            {loading ? 'Saving...' : 'Update Attendance'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AttendanceEdit;

