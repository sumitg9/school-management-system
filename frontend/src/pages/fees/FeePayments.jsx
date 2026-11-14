import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeAPI, studentAPI } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useAlert } from '../../context/AlertContext';
import { formatFeeTypeLabel, getFeeTypeBadgeVariant } from '../../utils/feeTypes';

const FeePayments = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // fee_structure_id
  const { formatDate, formatCurrency } = useSettings();
  const { showValidationError } = useAlert();

  const [feeStructure, setFeeStructure] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
  }, [id, methodFilter, statusFilter]);

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
    setLoading(true);
    try {
      const params = {
        per_page: 50,
      };
      if (id) {
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

  const columns = [
    {
      key: 'receipt_number',
      label: 'Receipt #',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
            {row.receipt_number || `RCP-${row.id}`}
          </span>
          {row.transaction_id && (
            <p className="text-xs text-gray-400 mt-1 font-mono">Txn: {row.transaction_id}</p>
          )}
        </div>
      ),
    },
    {
      key: 'student',
      label: 'Student',
      render: (row) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {row.student ? `${row.student.first_name} ${row.student.last_name}` : 'Unknown Student'}
          </p>
          {row.student?.admission_number && (
            <p className="text-xs text-gray-500 font-mono">Adm: {row.student.admission_number}</p>
          )}
        </div>
      ),
    },
    {
      key: 'payment_date',
      label: 'Payment Date',
      render: (row) => (
        <span className="text-sm text-gray-700">
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
      label: 'Remarks',
      render: (row) => (
        <span className="text-xs text-gray-500 italic max-w-xs truncate block">
          {row.remarks || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => navigate(id ? `/fees/${id}` : '/fees')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            title="Back"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
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
          <button
            type="button"
            onClick={handleOpenCollectModal}
            className="btn-primary flex items-center space-x-2 px-4 py-2 cursor-pointer shadow-md"
          >
            <span>💳</span>
            <span>Collect Payment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</p>
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
            <p className="text-xs text-gray-500 mt-1">Completed entries</p>
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
            <p className="text-xs text-gray-500 mt-1">Concessions given</p>
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
              placeholder="Search by student, receipt, txn..."
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
    </div>
  );
};

export default FeePayments;
