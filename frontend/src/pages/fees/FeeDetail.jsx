import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const FeeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFee();
  }, [id]);

  const fetchFee = async () => {
    setLoading(true);
    try {
      const response = await feeAPI.getById(id);
      if (response.success) {
        setFee(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch fee details');
      navigate('/fees');
    } finally {
      setLoading(false);
    }
  };

  const getTypeVariant = (type) => {
    switch (type) {
      case 'tuition': return 'primary';
      case 'transport': return 'info';
      case 'library': return 'success';
      case 'sports': return 'warning';
      case 'exam': return 'danger';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Fee structure not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
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
              <h1 className="text-2xl font-bold text-gray-900">Fee Structure Details</h1>
              <p className="text-gray-600 mt-1">View fee structure information</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/fees/${id}/payments`)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Manage Payments</span>
            </button>
            <button
              onClick={() => navigate(`/fees/${id}/edit`)}
              className="btn-primary flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fee Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold text-3xl">💰</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{fee.name}</h2>
                <p className="text-gray-600 mt-1">{fee.academic_year?.name || '-'}</p>
              </div>
              <Badge variant={getTypeVariant(fee.type)}>
                {fee.type}
              </Badge>
            </div>
            <p className="text-gray-600 mt-3">{fee.description || 'No description available'}</p>
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Fee Name:</span>
              <span className="font-medium text-gray-900">{fee.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Academic Year:</span>
              <span className="font-medium text-gray-900">{fee.academic_year?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Class:</span>
              <span className="font-medium text-gray-900">{fee.class?.name || 'All Classes'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <Badge variant={getTypeVariant(fee.type)}>
                {fee.type}
              </Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Description:</span>
              <span className="font-medium text-gray-900">{fee.description || '-'}</span>
            </div>
          </div>
        </div>

        {/* Fee Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-medium text-gray-900 text-xl text-green-600">
                ${parseFloat(fee.amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium text-gray-900">
                {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge variant={new Date(fee.due_date) > new Date() ? 'success' : 'danger'}>
                {new Date(fee.due_date) > new Date() ? 'Active' : 'Overdue'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeDetail;

