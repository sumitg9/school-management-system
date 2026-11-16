import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeAPI, studentAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { formatFeeTypeLabel, getFeeTypeBadgeVariant } from '../../utils/feeTypes';
import { numberToWords } from '../../utils/numberToWords';
import FeeTabs from './FeeTabs';

const ALL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const extractMonthsFromRemarks = (remarksText) => {
  if (!remarksText || typeof remarksText !== 'string') return [];
  const found = [];
  ALL_MONTH_NAMES.forEach(m => {
    const regex = new RegExp(`\\b${m}\\b`, 'i');
    if (regex.test(remarksText)) {
      found.push(m);
    }
  });
  return found;
};

const FeePayments = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // fee_structure_id
  const { formatDate, formatCurrency, settings } = useSettings();
  const { showValidationError } = useAlert();
  const { isStudent, currentStudent, studentLoading, hasPermission } = useAuth();

  const [feeStructure, setFeeStructure] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Payment Details Dialog Modal state
  const [selectedPaymentForView, setSelectedPaymentForView] = useState(null);
  const [isDialogFullScreen, setIsDialogFullScreen] = useState(false);
  const [activeDialogTab, setActiveDialogTab] = useState('breakdown'); // 'breakdown' | 'receipt'

  // Collect Payment Modal state
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    student_id: '',
    amount: '',
    discount: '0',
    fine: '0',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'cash',
    transaction_id: '',
    remarks: '',
  });

  useEffect(() => {
    fetchFeeStructure();
    fetchPayments();
  }, [id, methodFilter, statusFilter, isStudent(), currentStudent?.id, studentLoading]);

  const fetchFeeStructure = async () => {
    if (!id) return;
    try {
      const response = await feeAPI.getById(id);
      if (response && response.success && response.data) {
        setFeeStructure(response.data);
        setPaymentForm(prev => ({
          ...prev,
          amount: response.data.amount || '',
        }));
      }
    } catch (error) {
      console.warn('Could not load fee structure details:', error);
    }
  };

  const fetchPayments = async () => {
    if (isStudent() && studentLoading) return;
    setLoading(true);
    try {
      const params = {
        per_page: 50,
      };

      // Strict student enforcement: only fetch this student's payment records
      if (isStudent()) {
        if (!currentStudent?.id) {
          setPayments([]);
          setLoading(false);
          return;
        }
        params.student_id = currentStudent.id;
      } else if (id) {
        params.fee_structure_id = id;
      }

      if (methodFilter) {
        params.payment_method = methodFilter;
      }
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await feeAPI.getPayments(params);
      if (response && response.success) {
        setPayments(response.data || []);
        setPagination(response.meta || null);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load fee payments');
    } finally {
      setLoading(false);
    }
  };

  // Open Collect Modal and fetch eligible students
  const handleOpenCollectModal = async () => {
    setShowCollectModal(true);
    setLoadingStudents(true);
    try {
      const params = { per_page: 100 };
      if (feeStructure?.class_id) {
        params.class_id = feeStructure.class_id;
      }
      const res = await studentAPI.getAll(params);
      if (res && res.data) {
        setStudents(res.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Failed to load students list');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handlePaymentFormChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({ ...prev, [name]: value }));
  };

  const calculateTotalAmount = () => {
    const amt = parseFloat(paymentForm.amount) || 0;
    const disc = parseFloat(paymentForm.discount) || 0;
    const fn = parseFloat(paymentForm.fine) || 0;
    return Math.max(0, amt - disc + fn);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.student_id) {
      showValidationError('Please select a student for payment collection.', 'Student Required');
      return;
    }
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      showValidationError('Please enter a valid positive payment amount.', 'Invalid Amount');
      return;
    }

    setSubmittingPayment(true);
    try {
      const total = calculateTotalAmount();
      const payload = {
        student_id: paymentForm.student_id,
        fee_structure_id: id || feeStructure?.id,
        amount: amt,
        discount: parseFloat(paymentForm.discount) || 0,
        fine: parseFloat(paymentForm.fine) || 0,
        total_amount: total,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        transaction_id: (paymentForm.transaction_id || '').trim() || null,
        remarks: (paymentForm.remarks || '').trim() || null,
        status: 'completed',
      };

      await feeAPI.collectPayment(payload);
      toast.success('Payment recorded successfully!');
      setShowCollectModal(false);
      // Reset form
      setPaymentForm({
        student_id: '',
        amount: feeStructure?.amount || '',
        discount: '0',
        fine: '0',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'cash',
        transaction_id: '',
        remarks: '',
      });
      fetchPayments();
    } catch (error) {
      console.error('Error recording payment:', error);
      showValidationError(error, 'Failed to Record Payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Filter payments by search term locally
  const filteredPayments = payments.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    const studentName = `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.toLowerCase();
    const receipt = (p.receipt_number || '').toLowerCase();
    const txn = (p.transaction_id || '').toLowerCase();
    const remarks = (p.remarks || '').toLowerCase();
    return studentName.includes(term) || receipt.includes(term) || txn.includes(term) || remarks.includes(term);
  });

  // Calculate summary metrics
  const totalCollected = filteredPayments.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
  const totalDiscounts = filteredPayments.reduce((acc, curr) => acc + (parseFloat(curr.discount) || 0), 0);
  const totalFines = filteredPayments.reduce((acc, curr) => acc + (parseFloat(curr.fine) || 0), 0);

  const getMethodBadge = (method) => {
    switch (String(method || '').toLowerCase()) {
      case 'cash':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">💵 Cash</span>;
      case 'card':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">💳 Card</span>;
      case 'online':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">🌐 Online</span>;
      case 'bank-transfer':
      case 'bank_transfer':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">🏦 Bank Transfer</span>;
      case 'check':
      case 'cheque':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">📝 Cheque</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 capitalize">{method || 'Standard'}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'refunded':
        return <Badge variant="default">Refunded</Badge>;
      default:
        return <Badge variant="success">Completed</Badge>;
    }
  };

  const handleOpenPaymentDetailModal = (payment) => {
    setSelectedPaymentForView(payment);
    setActiveDialogTab('breakdown');
  };

  const columns = [
    {
      key: 'receipt_number',
      label: 'Receipt #',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenPaymentDetailModal(row)}
          className="text-left group cursor-pointer focus:outline-hidden"
          title="Click to view full payment details & breakdown"
        >
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white px-2.5 py-1 rounded-md border border-blue-200 group-hover:border-blue-600 transition inline-flex items-center gap-1 shadow-2xs">
              <span>{row.receipt_number || `RCP-${row.id}`}</span>
            </span>
            <span className="text-gray-400 group-hover:text-blue-600 transition text-xs font-semibold">
              👁️
            </span>
          </div>
          {row.transaction_id && (
            <p className="text-[11px] text-gray-400 mt-1 font-mono">Txn: {row.transaction_id}</p>
          )}
        </button>
      ),
    },
    ...(!isStudent() ? [{
      key: 'student',
      label: 'Student',
      render: (row) => (
        <div>
          <button
            type="button"
            onClick={() => handleOpenPaymentDetailModal(row)}
            className="text-left font-semibold text-gray-900 hover:text-blue-600 transition text-sm cursor-pointer"
            title="Click to view payment breakdown"
          >
            {row.student ? `${row.student.first_name} ${row.student.last_name}` : 'Unknown Student'}
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
            {row.student?.admission_number && (
              <span>Adm: {row.student.admission_number}</span>
            )}
            {row.student?.class?.name && (
              <span className="text-gray-400">• {row.student.class.name}</span>
            )}
          </div>
        </div>
      ),
    }] : [{
      key: 'fee_type',
      label: 'Fee Structure',
      render: (row) => (
        <div>
          <span className="font-semibold text-gray-900 text-sm">
            {row.fee_structure?.name || 'School Fee'}
          </span>
          {row.fee_structure?.type && (
            <div className="mt-0.5">
              <Badge variant={getFeeTypeBadgeVariant(row.fee_structure.type)}>
                {formatFeeTypeLabel(row.fee_structure.type)}
              </Badge>
            </div>
          )}
        </div>
      ),
    }]),
    {
      key: 'payment_date',
      label: 'Payment Date',
      render: (row) => (
        <span className="text-sm text-gray-700 font-medium">
          {formatDate(row.payment_date)}
        </span>
      ),
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (row) => getMethodBadge(row.payment_method),
    },
    {
      key: 'amount_breakdown',
      label: 'Breakdown',
      render: (row) => {
        const disc = parseFloat(row.discount) || 0;
        const fn = parseFloat(row.fine) || 0;
        return (
          <div className="text-xs text-gray-600 space-y-0.5">
            <div>Base: <span className="font-medium text-gray-900">{formatCurrency(row.amount)}</span></div>
            {disc > 0 && <div className="text-emerald-600">Discount: -{formatCurrency(disc)}</div>}
            {fn > 0 && <div className="text-red-500">Fine: +{formatCurrency(fn)}</div>}
          </div>
        );
      },
    },
    {
      key: 'total_amount',
      label: 'Total Paid',
      render: (row) => (
        <span className="text-base font-bold text-gray-900 font-mono">
          {formatCurrency(row.total_amount || row.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'remarks',
      label: 'Remarks / Coverage',
      render: (row) => (
        <div
          onClick={() => handleOpenPaymentDetailModal(row)}
          className="text-xs text-gray-700 max-w-xs cursor-pointer hover:text-blue-700 transition"
          title="Click to view full payment remarks & breakdown"
        >
          {row.remarks ? (
            <div className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg p-2 transition">
              <p className="line-clamp-2 leading-relaxed text-[11px] text-gray-800 font-medium">
                {row.remarks}
              </p>
              <span className="text-[10px] text-blue-600 hover:underline block mt-0.5 font-bold">
                View full note →
              </span>
            </div>
          ) : (
            <span className="text-gray-400 italic text-xs">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenPaymentDetailModal(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-2xs hover:shadow-sm transition cursor-pointer"
            title="View Full Payment Details & Breakdown"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>View</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Tab Navigation */}
      <FeeTabs />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => navigate('/fees')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            title="Back to Fees"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          {isStudent() ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-xs">
                {currentStudent ? `${currentStudent.first_name?.[0] || 'S'}${currentStudent.last_name?.[0] || ''}` : '👨‍🎓'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">My Payment Receipts</h1>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
                    Personal Records
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  Student: <span className="font-semibold text-gray-800">{currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'Enrolled Student'}</span>
                  {currentStudent?.admission_number && <span className="ml-2 pl-2 border-l border-gray-300">Adm: {currentStudent.admission_number}</span>}
                  {currentStudent?.class?.name && <span className="ml-2 pl-2 border-l border-gray-300">Class: {currentStudent.class.name}</span>}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {feeStructure ? `Payments: ${feeStructure.name}` : 'Fee Payments Management'}
                </h1>
                {feeStructure?.type && (
                  <Badge variant={getFeeTypeBadgeVariant(feeStructure.type)}>
                    {formatFeeTypeLabel(feeStructure.type)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {feeStructure
                  ? `Standard Amount: ${formatCurrency(feeStructure.amount)} • Class: ${feeStructure.class?.name || 'All Classes'} • Academic Year: ${feeStructure.academic_year?.name || '-'}`
                  : 'Track and collect fee payments across students'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchPayments}
            className="px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition cursor-pointer"
            title="Refresh payments"
          >
            🔄 Refresh
          </button>
          {!isStudent() && hasPermission('collect-fees') && (
            <button
              type="button"
              onClick={() => navigate('/fees/payment')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition flex items-center space-x-2 cursor-pointer"
            >
              <span>💳</span>
              <span>Collect Fees (Single / Advance)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{isStudent() ? 'Total Paid' : 'Total Collected'}</p>
            <p className="text-2xl font-bold text-gray-900 font-mono mt-1 text-emerald-600">
              {formatCurrency(totalCollected)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{filteredPayments.length} Payments recorded</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
            ₹
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transactions</p>
            <p className="text-2xl font-bold text-gray-900 font-mono mt-1">
              {filteredPayments.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">{isStudent() ? 'Receipts issued' : 'Completed entries'}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            🧾
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Discounts</p>
            <p className="text-2xl font-bold text-gray-900 font-mono mt-1 text-blue-600">
              {formatCurrency(totalDiscounts)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{isStudent() ? 'Concessions received' : 'Concessions given'}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            🎁
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Late Fines</p>
            <p className="text-2xl font-bold text-gray-900 font-mono mt-1 text-amber-600">
              {formatCurrency(totalFines)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Overdue penalties</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            ⚠️
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Search Payments</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isStudent() ? "Search receipt #, method, remarks..." : "Search by student, receipt, txn..."}
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="check">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setMethodFilter('');
                setStatusFilter('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-500">Loading fee payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="text-5xl select-none">💳</div>
            <h3 className="text-lg font-bold text-gray-900">No Payments Recorded Yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              There are no payment records matching your filter criteria for this fee structure.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleOpenCollectModal}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm cursor-pointer"
              >
                <span>➕</span>
                <span>Collect First Payment</span>
              </button>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredPayments}
            loading={false}
            pagination={pagination}
            onPageChange={(page) => fetchPayments(page)}
          />
        )}
      </div>

      {/* Collect Payment Modal */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span>💳</span> Collect Fee Payment
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  {feeStructure ? `${feeStructure.name} (${formatFeeTypeLabel(feeStructure.type)})` : 'Record student payment'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {/* Student Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Student <span className="text-red-500">*</span>
                </label>
                {loadingStudents ? (
                  <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border">Loading students...</div>
                ) : (
                  <select
                    name="student_id"
                    value={paymentForm.student_id}
                    onChange={handlePaymentFormChange}
                    className="input-field text-sm"
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.first_name} {st.last_name} {st.admission_number ? `(${st.admission_number})` : ''} - Class: {st.class?.name || 'Assigned'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount Breakdown Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Base Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentFormChange}
                    className="input-field text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="discount"
                    value={paymentForm.discount}
                    onChange={handlePaymentFormChange}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Late Fine (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="fine"
                    value={paymentForm.fine}
                    onChange={handlePaymentFormChange}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Net Total Card */}
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Total Amount to Collect
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-700">
                    {formatCurrency(calculateTotalAmount())}
                  </p>
                </div>
                <div className="text-xs text-emerald-600 font-medium text-right">
                  {parseFloat(paymentForm.discount) > 0 && <div>- {formatCurrency(paymentForm.discount)} concession</div>}
                  {parseFloat(paymentForm.fine) > 0 && <div>+ {formatCurrency(paymentForm.fine)} fine</div>}
                </div>
              </div>

              {/* Payment Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="payment_method"
                    value={paymentForm.payment_method}
                    onChange={handlePaymentFormChange}
                    className="input-field text-sm"
                    required
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="online">🌐 Online / UPI</option>
                    <option value="bank-transfer">🏦 Bank Transfer</option>
                    <option value="check">📝 Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={paymentForm.payment_date}
                    onChange={handlePaymentFormChange}
                    className="input-field text-sm"
                    required
                  />
                </div>
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Transaction / Cheque / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  name="transaction_id"
                  value={paymentForm.transaction_id}
                  onChange={handlePaymentFormChange}
                  placeholder="e.g. UPI-12345678, CHQ-998877"
                  className="input-field text-sm"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <textarea
                  name="remarks"
                  value={paymentForm.remarks}
                  onChange={handlePaymentFormChange}
                  rows="2"
                  placeholder="Any additional notes about this payment..."
                  className="input-field text-sm"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  disabled={submittingPayment}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || loadingStudents}
                  className="btn-primary px-5 py-2 text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Confirm & Record Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAYMENT DETAILS & BREAKDOWN FULL-SCREEN DIALOG MODAL     */}
      {/* ========================================================= */}
      {selectedPaymentForView && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0 md:p-3 transition-all duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPaymentForView(null);
          }}
        >
          <div
            className={`bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
              isDialogFullScreen
                ? 'w-screen h-screen rounded-none'
                : 'w-full max-w-5xl h-[95vh] rounded-2xl border border-gray-200'
            }`}
          >
            {/* Modal Top Header */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-xl">
                  🧾
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      Payment Details & Breakdown
                    </h2>
                    {getStatusBadge(selectedPaymentForView.status)}
                    {getMethodBadge(selectedPaymentForView.payment_method)}
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5 font-mono">
                    Receipt #{selectedPaymentForView.receipt_number || `RCP-${selectedPaymentForView.id}`} • Recorded on {formatDate(selectedPaymentForView.payment_date)}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDialogTab(activeDialogTab === 'receipt' ? 'breakdown' : 'receipt')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border flex items-center gap-1.5 ${
                    activeDialogTab === 'receipt'
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                  title="Toggle between Breakdown View and Printable Receipt View"
                >
                  <span>{activeDialogTab === 'receipt' ? '📊 Breakdown View' : '🖨️ Printable Receipt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDialogFullScreen(!isDialogFullScreen)}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1"
                  title={isDialogFullScreen ? "Exit Fullscreen" : "Fullscreen Dialog"}
                >
                  <span>{isDialogFullScreen ? '🗗 Restore' : '⛶ Fullscreen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentForView(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                  title="Close Dialog"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
              {activeDialogTab === 'breakdown' ? (
                <>
                  {/* Top Key Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                        Net Amount Paid
                      </span>
                      <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                        {formatCurrency(selectedPaymentForView.total_amount || selectedPaymentForView.amount)}
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                        ✓ Settled & Verified
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                        Payment Method
                      </span>
                      <div className="mt-1 flex items-center gap-1.5">
                        {getMethodBadge(selectedPaymentForView.payment_method)}
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono mt-1">
                        Txn: {selectedPaymentForView.transaction_id || 'N/A (Cash/Direct)'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                        Payment Date
                      </span>
                      <div className="text-base font-bold text-gray-900 mt-1">
                        {formatDate(selectedPaymentForView.payment_date)}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Recorded: {selectedPaymentForView.created_at ? new Date(selectedPaymentForView.created_at).toLocaleString() : 'System recorded'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                        Receipt Number
                      </span>
                      <div className="text-sm font-bold text-blue-700 font-mono mt-1 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block">
                        {selectedPaymentForView.receipt_number || `RCP-${selectedPaymentForView.id}`}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Payment ID: #{selectedPaymentForView.id}
                      </p>
                    </div>
                  </div>

                  {/* Remarks & Fee Coverage Section (Full Visibility, No Truncation) */}
                  <div className="bg-white rounded-2xl border border-blue-200 shadow-xs overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <h3 className="text-sm font-bold text-blue-900">
                          Payment Remarks & Advance Months Coverage
                        </h3>
                      </div>
                      <span className="text-[11px] text-blue-700 bg-blue-100/60 px-2.5 py-0.5 rounded-full font-bold">
                        Full Unabridged Note
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      {selectedPaymentForView.remarks ? (
                        <>
                          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-gray-800 font-medium whitespace-pre-wrap leading-relaxed shadow-2xs">
                            {selectedPaymentForView.remarks}
                          </div>
                          {extractMonthsFromRemarks(selectedPaymentForView.remarks).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-xs font-semibold text-gray-600">Detected Covered Months:</span>
                              {extractMonthsFromRemarks(selectedPaymentForView.remarks).map((m, idx) => (
                                <span key={idx} className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold font-mono">
                                  ✓ {m}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-400 italic">
                          No specific remarks or advance coverage notes were recorded for this transaction.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student & Fee Structure Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Info Card */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b pb-3">
                        <span className="text-lg">🎓</span>
                        <h3 className="text-sm font-bold text-gray-900">Student Information</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-500">Student Name:</span>
                          <span className="font-bold text-gray-900 text-sm">
                            {selectedPaymentForView.student
                              ? `${selectedPaymentForView.student.first_name} ${selectedPaymentForView.student.last_name}`
                              : 'Unknown Student'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-500">Admission Number:</span>
                          <span className="font-mono font-semibold text-gray-800">
                            {selectedPaymentForView.student?.admission_number || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-500">Roll Number:</span>
                          <span className="font-mono font-semibold text-gray-800">
                            {selectedPaymentForView.student?.roll_number || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">Class & Section:</span>
                          <span className="font-semibold text-gray-900">
                            {selectedPaymentForView.student?.class?.name || feeStructure?.class?.name || 'Class Record'}
                            {selectedPaymentForView.student?.section?.name ? ` - Section ${selectedPaymentForView.student.section.name}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fee Component Info Card */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 border-b pb-3">
                        <span className="text-lg">📚</span>
                        <h3 className="text-sm font-bold text-gray-900">Fee Component Information</h3>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-500">Fee Structure Name:</span>
                          <span className="font-bold text-gray-900">
                            {selectedPaymentForView.fee_structure?.name || feeStructure?.name || 'Standard School Fee'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-500">Fee Category / Type:</span>
                          <span>
                            <Badge variant={getFeeTypeBadgeVariant(selectedPaymentForView.fee_structure?.type || feeStructure?.type)}>
                              {formatFeeTypeLabel(selectedPaymentForView.fee_structure?.type || feeStructure?.type || 'tuition')}
                            </Badge>
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-100">
                          <span className="text-gray-500">Billing Frequency:</span>
                          <span className="font-semibold text-gray-800 capitalize">
                            {selectedPaymentForView.fee_structure?.frequency || feeStructure?.frequency || 'Monthly'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">Academic Session:</span>
                          <span className="font-semibold text-gray-900">
                            {selectedPaymentForView.fee_structure?.academic_year?.name || feeStructure?.academic_year?.name || 'Current Session'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Table Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="bg-gray-100 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        <h3 className="text-sm font-bold text-gray-900">Payment Breakdown & Ledger Settlement</h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-gray-600">
                        Receipt: #{selectedPaymentForView.receipt_number || selectedPaymentForView.id}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider font-semibold border-b">
                          <tr>
                            <th className="p-3.5">Component / Description</th>
                            <th className="p-3.5 text-right">Base / Subtotal</th>
                            <th className="p-3.5 text-right">Discount</th>
                            <th className="p-3.5 text-right">Late Fine / Penalty</th>
                            <th className="p-3.5 text-right">Net Paid</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          <tr>
                            <td className="p-3.5">
                              <span className="font-bold text-gray-900">
                                {selectedPaymentForView.fee_structure?.name || feeStructure?.name || 'Student Fee Structure'}
                              </span>
                              <span className="block text-[11px] text-gray-500 mt-0.5">
                                {formatFeeTypeLabel(selectedPaymentForView.fee_structure?.type || feeStructure?.type)} Fee Component
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono text-gray-900 font-bold">
                              {formatCurrency(selectedPaymentForView.amount)}
                            </td>
                            <td className="p-3.5 text-right font-mono text-emerald-600 font-bold">
                              {parseFloat(selectedPaymentForView.discount) > 0 ? `-${formatCurrency(selectedPaymentForView.discount)}` : '₹0.00'}
                            </td>
                            <td className="p-3.5 text-right font-mono text-red-600 font-bold">
                              {parseFloat(selectedPaymentForView.fine) > 0 ? `+${formatCurrency(selectedPaymentForView.fine)}` : '₹0.00'}
                            </td>
                            <td className="p-3.5 text-right font-mono font-black text-gray-900 text-sm">
                              {formatCurrency(selectedPaymentForView.total_amount || selectedPaymentForView.amount)}
                            </td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                          <tr>
                            <td colSpan={4} className="p-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Subtotal Gross Amount:
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-gray-800 text-sm">
                              {formatCurrency(selectedPaymentForView.amount)}
                            </td>
                          </tr>
                          {parseFloat(selectedPaymentForView.discount) > 0 && (
                            <tr>
                              <td colSpan={4} className="p-2 text-right text-xs font-bold text-emerald-700">
                                Total Concession / Discount:
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                -{formatCurrency(selectedPaymentForView.discount)}
                              </td>
                            </tr>
                          )}
                          {parseFloat(selectedPaymentForView.fine) > 0 && (
                            <tr>
                              <td colSpan={4} className="p-2 text-right text-xs font-bold text-red-600">
                                Total Late Fine Incurred:
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-red-600">
                                +{formatCurrency(selectedPaymentForView.fine)}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-slate-900 text-white">
                            <td colSpan={4} className="p-3.5 text-right text-sm font-extrabold uppercase tracking-wider">
                              Total Settled Amount Received:
                            </td>
                            <td className="p-3.5 text-right font-mono font-extrabold text-emerald-400 text-base">
                              {formatCurrency(selectedPaymentForView.total_amount || selectedPaymentForView.amount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Amount in words */}
                    <div className="p-4 bg-slate-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-gray-600">Amount in Words:</span>{' '}
                        <span className="font-semibold text-gray-900 italic">
                          {numberToWords(parseFloat(selectedPaymentForView.total_amount || selectedPaymentForView.amount) || 0)}
                        </span>
                      </div>
                      <div className="font-mono text-gray-500">
                        Status: <span className="font-bold text-emerald-700 capitalize">{selectedPaymentForView.status || 'Completed'}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Official Printable Receipt Preview */
                <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-gray-300 shadow-sm">
                  <div id="printable-payment-receipt" className="text-gray-900 text-xs">
                    {/* Receipt Header */}
                    <div className="border-b-2 border-gray-900 pb-4 mb-4 text-center space-y-1">
                      <div className="flex items-center justify-center gap-3 mb-1">
                        {settings?.school_logo ? (
                          settings.school_logo.startsWith('preset:') ? (
                            <span className="text-3xl">{settings.school_logo.replace('preset:', '')}</span>
                          ) : (
                            <img
                              src={settings.school_logo}
                              alt="Logo"
                              className="h-10 w-10 object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.parentElement.innerHTML = '<span class="text-3xl">🎓</span>';
                              }}
                            />
                          )
                        ) : (
                          <span className="text-3xl">🎓</span>
                        )}
                        <h2 className="text-2xl font-black uppercase tracking-wider text-gray-900">
                          {settings?.school_name || 'Delhi Public Academy'}
                        </h2>
                      </div>
                      {settings?.school_affiliation && (
                        <p className="text-xs text-gray-700 font-medium">
                          {settings.school_affiliation}
                        </p>
                      )}
                      {(settings?.school_address || settings?.school_phone || settings?.school_email || settings?.school_website) && (
                        <p className="text-[11px] text-gray-500">
                          {[
                            settings?.school_address,
                            settings?.school_phone && `Contact: ${settings.school_phone}`,
                            settings?.school_email && `Email: ${settings.school_email}`,
                            settings?.school_website && `Website: ${settings.school_website}`
                          ].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <div className="pt-2">
                        <span className="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded">
                          Official Fee Payment Receipt
                        </span>
                      </div>
                    </div>

                    {/* Receipt Meta */}
                    <div className="grid grid-cols-2 gap-4 mb-5 border border-gray-200 rounded-xl p-3.5 bg-gray-50/50">
                      <div className="space-y-1">
                        <div>
                          <span className="text-gray-500 uppercase text-[10px] font-semibold">Student Name:</span>{' '}
                          <span className="font-bold text-gray-900 text-sm">
                            {selectedPaymentForView.student ? `${selectedPaymentForView.student.first_name} ${selectedPaymentForView.student.last_name}` : 'Unknown Student'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase text-[10px] font-semibold">Admission No:</span>{' '}
                          <span className="font-semibold text-gray-800 font-mono">
                            {selectedPaymentForView.student?.admission_number || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase text-[10px] font-semibold">Class & Section:</span>{' '}
                          <span className="font-semibold text-gray-800">
                            {selectedPaymentForView.student?.class?.name || feeStructure?.class?.name || 'Class Record'}
                            {selectedPaymentForView.student?.section?.name ? ` - Section ${selectedPaymentForView.student.section.name}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-right">
                        <div>
                          <span className="text-gray-500 uppercase text-[10px] font-semibold">Receipt Number:</span>{' '}
                          <span className="font-mono font-bold text-blue-900 text-sm">
                            {selectedPaymentForView.receipt_number || `RCP-${selectedPaymentForView.id}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase text-[10px] font-semibold">Date of Payment:</span>{' '}
                          <span className="font-semibold text-gray-800">
                            {formatDate(selectedPaymentForView.payment_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase text-[10px] font-semibold">Mode of Payment:</span>{' '}
                          <span className="font-bold text-gray-800 uppercase">
                            {selectedPaymentForView.payment_method}
                            {selectedPaymentForView.transaction_id ? ` (Txn: ${selectedPaymentForView.transaction_id})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Receipt Table */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden mb-5">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 border-b border-gray-300 font-bold text-gray-700">
                          <tr>
                            <th className="p-2 text-left">#</th>
                            <th className="p-2 text-left">Fee Particulars</th>
                            <th className="p-2 text-right">Base Amount</th>
                            <th className="p-2 text-right">Discount</th>
                            <th className="p-2 text-right">Late Fine</th>
                            <th className="p-2 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="p-2 text-center text-gray-500">1</td>
                            <td className="p-2 font-semibold text-gray-900">
                              {selectedPaymentForView.fee_structure?.name || feeStructure?.name || 'School Fee'}
                              <span className="text-[10px] text-gray-500 block font-normal capitalize">
                                Category: {formatFeeTypeLabel(selectedPaymentForView.fee_structure?.type || feeStructure?.type)}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono text-gray-700">
                              {formatCurrency(selectedPaymentForView.amount)}
                            </td>
                            <td className="p-2 text-right font-mono text-emerald-700">
                              {parseFloat(selectedPaymentForView.discount) > 0 ? `-${formatCurrency(selectedPaymentForView.discount)}` : '-'}
                            </td>
                            <td className="p-2 text-right font-mono text-red-600">
                              {parseFloat(selectedPaymentForView.fine) > 0 ? `+${formatCurrency(selectedPaymentForView.fine)}` : '-'}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-gray-900">
                              {formatCurrency(selectedPaymentForView.total_amount || selectedPaymentForView.amount)}
                            </td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold border-t border-gray-300">
                          <tr className="bg-gray-900 text-white text-sm">
                            <td colSpan={5} className="p-2.5 text-right uppercase tracking-wider font-extrabold">
                              Total Amount Received:
                            </td>
                            <td className="p-2.5 text-right font-mono text-emerald-400 font-extrabold text-base">
                              {formatCurrency(selectedPaymentForView.total_amount || selectedPaymentForView.amount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Amount in Words */}
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="font-bold text-gray-700">Amount in Words:</span>{' '}
                      <span className="font-semibold text-gray-900 italic">
                        {numberToWords(parseFloat(selectedPaymentForView.total_amount || selectedPaymentForView.amount) || 0)}
                      </span>
                    </div>

                    {/* Remarks on Receipt */}
                    {selectedPaymentForView.remarks && (
                      <div className="mb-6 p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs text-gray-800">
                        <span className="font-bold text-blue-900">Remarks / Coverage:</span>{' '}
                        <span>{selectedPaymentForView.remarks}</span>
                      </div>
                    )}

                    {/* Signatures */}
                    <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                      <div>
                        <div className="border-t border-gray-400 pt-1.5 mx-auto w-48 font-semibold text-gray-700">
                          Parent / Student Signature
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-gray-400 pt-1.5 mx-auto w-48 font-semibold text-gray-700">
                          Cashier / Accounts Officer
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          Authorized Signatory
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-[10px] text-gray-400 mt-6 pt-3 border-t">
                      This is an official computer-generated fee receipt. Thank you for your payment!
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="bg-white border-t border-gray-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="text-xs text-gray-500">
                Payment Record #{selectedPaymentForView.id} • Status: <span className="font-bold text-emerald-600 capitalize">{selectedPaymentForView.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                  title="Print official receipt"
                >
                  <span>🖨️</span>
                  <span>Print Receipt / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForView(null)}
                  className="px-5 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS styling injection for clean window.print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payment-receipt, #printable-payment-receipt * {
            visibility: visible;
          }
          #printable-payment-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FeePayments;

