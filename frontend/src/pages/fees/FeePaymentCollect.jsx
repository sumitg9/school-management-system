import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  feeAPI,
  academicYearAPI,
  classAPI,
  sectionAPI,
  studentAPI
} from '../../services/api';
import FeeTabs from './FeeTabs';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { formatFeeTypeLabel, getFeeTypeBadgeVariant } from '../../utils/feeTypes';
import { numberToWords } from '../../utils/numberToWords';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FeePaymentCollect = () => {
  const navigate = useNavigate();
  const { formatDate, formatCurrency } = useSettings();
  const { showValidationError } = useAlert();
  const { user } = useAuth();

  // Core Dropdown Data
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);

  // Selection states
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Loading states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [loadingStudentPayments, setLoadingStudentPayments] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Selected Student Object & History
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentPayments, setStudentPayments] = useState([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Fee Structures & Line Items
  const [feeItems, setFeeItems] = useState([]);
  const [showAddCustomItem, setShowAddCustomItem] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({
    name: '',
    type: 'other',
    amount: '',
    frequency: 'one-time',
  });

  // Global Adjustments
  const [globalDiscount, setGlobalDiscount] = useState('0');
  const [globalFine, setGlobalFine] = useState('0');

  // Month Selection States
  const [selectedMonthKeys, setSelectedMonthKeys] = useState([]);

  // Payment Form Details
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [cashTendered, setCashTendered] = useState('');

  // Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // 1. Initial Load: Academic Years and Classes
  useEffect(() => {
    const initData = async () => {
      setLoadingInitial(true);
      try {
        const [yearsRes, classesRes, currentYearRes] = await Promise.all([
          academicYearAPI.getAll({ per_page: 100 }),
          classAPI.getAll({ per_page: 100 }),
          academicYearAPI.getCurrent().catch(() => null),
        ]);

        if (yearsRes?.success && yearsRes.data) {
          setAcademicYears(yearsRes.data);
          // Set current or latest academic year by default
          if (currentYearRes?.data?.id) {
            setSelectedAcademicYearId(String(currentYearRes.data.id));
          } else if (yearsRes.data.length > 0) {
            const cur = yearsRes.data.find(y => y.is_current) || yearsRes.data[0];
            setSelectedAcademicYearId(String(cur.id));
          }
        }

        if (classesRes?.success && classesRes.data) {
          setClasses(classesRes.data);
        }
      } catch (err) {
        console.error('Failed to load initial fee payment metadata:', err);
        toast.error('Failed to load academic years or classes');
      } finally {
        setLoadingInitial(false);
      }
    };

    initData();
  }, []);

  // 2. Fetch Sections when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }

    const fetchSections = async () => {
      setLoadingSections(true);
      try {
        const res = await sectionAPI.getAll({ class_id: selectedClassId, per_page: 100 });
        if (res?.success) {
          setSections(res.data || []);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSections();
  }, [selectedClassId]);

  // 3. Fetch Students when Class or Section or Academic Year changes
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId('');
      setSelectedStudent(null);
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const params = {
          class_id: selectedClassId,
          per_page: 'all',
        };
        if (selectedSectionId) {
          params.section_id = selectedSectionId;
        }
        if (selectedAcademicYearId) {
          params.academic_year_id = selectedAcademicYearId;
        }

        const res = await studentAPI.getAll(params);
        if (res?.success) {
          setStudents(res.data || []);
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedClassId, selectedSectionId, selectedAcademicYearId]);

  // 4. Update selectedStudent object when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null);
      setStudentPayments([]);
      return;
    }

    const found = students.find(s => String(s.id) === String(selectedStudentId));
    setSelectedStudent(found || null);

    // Fetch this student's payment history to detect already paid months & previous payments
    const fetchStudentPaymentHistory = async () => {
      setLoadingStudentPayments(true);
      try {
        const res = await feeAPI.getPayments({
          student_id: selectedStudentId,
          per_page: 100,
        });
        if (res?.success) {
          setStudentPayments(res.data || []);
        }
      } catch (err) {
        console.warn('Could not fetch student payment history:', err);
      } finally {
        setLoadingStudentPayments(false);
      }
    };

    fetchStudentPaymentHistory();
  }, [selectedStudentId, students]);

  // 5. Generate Academic Year Months
  const selectedYearObj = useMemo(() => {
    return academicYears.find(y => String(y.id) === String(selectedAcademicYearId));
  }, [academicYears, selectedAcademicYearId]);

  const academicMonths = useMemo(() => {
    // Determine start and end year
    let startYear = new Date().getFullYear();
    let startMonth = 3; // April (0-indexed) by default for Indian academic sessions

    if (selectedYearObj?.name) {
      const match = selectedYearObj.name.match(/(\d{4})/g);
      if (match && match.length >= 1) {
        startYear = parseInt(match[0], 10);
      }
    }

    if (selectedYearObj?.start_date) {
      const d = new Date(selectedYearObj.start_date);
      if (!isNaN(d.getTime())) {
        startYear = d.getFullYear();
        startMonth = d.getMonth();
      }
    }

    const months = [];
    for (let i = 0; i < 12; i++) {
      const currentMonthIndex = (startMonth + i) % 12;
      const currentYear = startYear + Math.floor((startMonth + i) / 12);
      const key = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
      const name = `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;
      const shortName = `${SHORT_MONTH_NAMES[currentMonthIndex]} '${String(currentYear).slice(2)}`;

      months.push({
        key,
        name,
        shortName,
        monthIndex: currentMonthIndex,
        year: currentYear,
      });
    }

    return months;
  }, [selectedYearObj]);

  // Detect which months have already been paid by the student
  const paidMonthsSet = useMemo(() => {
    const paidSet = new Set();
    if (!studentPayments || studentPayments.length === 0) return paidSet;

    studentPayments.forEach(pay => {
      const text = `${pay.remarks || ''} ${pay.receipt_number || ''}`;
      academicMonths.forEach(m => {
        if (text.includes(m.name) || text.includes(m.shortName)) {
          paidSet.add(m.key);
        }
      });
    });

    return paidSet;
  }, [studentPayments, academicMonths]);

  // Set default selected month (e.g. current month or first unpaid month) on mount
  useEffect(() => {
    if (academicMonths.length > 0 && selectedMonthKeys.length === 0) {
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const foundCurrent = academicMonths.find(m => m.key === currentKey);

      if (foundCurrent) {
        setSelectedMonthKeys([foundCurrent.key]);
      } else {
        setSelectedMonthKeys([academicMonths[0].key]);
      }
    }
  }, [academicMonths]);

  // 6. Fetch Fee Structures when Academic Year or Class changes
  useEffect(() => {
    if (!selectedAcademicYearId || !selectedClassId) {
      setFeeItems([]);
      return;
    }

    const fetchStructures = async () => {
      setLoadingStructures(true);
      try {
        const res = await feeAPI.getStructures({
          academic_year_id: selectedAcademicYearId,
          class_id: selectedClassId,
          include_all_classes: true,
          per_page: 'all',
        });

        if (res?.success && res.data) {
          const items = (res.data || []).map(struct => ({
            id: `fs_${struct.id}`,
            fee_structure_id: struct.id,
            name: struct.name,
            type: struct.type || 'tuition',
            frequency: struct.frequency || (struct.type === 'tuition' || struct.type === 'transport' ? 'monthly' : 'yearly'),
            base_amount: parseFloat(struct.amount) || 0,
            is_mandatory: struct.is_mandatory !== false,
            enabled: true,
            is_custom: false,
            discount: '0',
            fine: '0',
            description: struct.description || '',
          }));
          setFeeItems(items);
        }
      } catch (err) {
        console.error('Error fetching fee structures:', err);
        toast.error('Could not load fee structures for selected class');
      } finally {
        setLoadingStructures(false);
      }
    };

    fetchStructures();
  }, [selectedAcademicYearId, selectedClassId]);

  // Filter students based on quick search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const term = studentSearch.toLowerCase().trim();
    return students.filter(s => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const admNo = String(s.admission_number || '').toLowerCase();
      const rollNo = String(s.roll_number || '').toLowerCase();
      return fullName.includes(term) || admNo.includes(term) || rollNo.includes(term);
    });
  }, [students, studentSearch]);

  // Month selection handlers
  const handleToggleMonth = (key) => {
    setSelectedMonthKeys(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleSelectPresetMonths = (count) => {
    if (academicMonths.length === 0) return;

    if (count === 1) {
      const now = new Date();
      const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const cur = academicMonths.find(m => m.key === curKey) || academicMonths[0];
      setSelectedMonthKeys([cur.key]);
      return;
    }

    if (count === 12) {
      setSelectedMonthKeys(academicMonths.map(m => m.key));
      return;
    }

    // Advance count months starting from first unpaid month or current month
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let startIndex = academicMonths.findIndex(m => m.key === curKey);
    if (startIndex === -1) startIndex = 0;

    const slice = academicMonths.slice(startIndex, startIndex + count);
    if (slice.length < count) {
      // Wrap around or pick first count
      setSelectedMonthKeys(academicMonths.slice(0, count).map(m => m.key));
    } else {
      setSelectedMonthKeys(slice.map(m => m.key));
    }
  };

  const handleClearMonths = () => {
    setSelectedMonthKeys([]);
  };

  // Selected Months display names
  const selectedMonthsNames = useMemo(() => {
    return academicMonths
      .filter(m => selectedMonthKeys.includes(m.key))
      .map(m => m.name);
  }, [academicMonths, selectedMonthKeys]);

  // Synchronize Remarks with Selected Months
  useEffect(() => {
    if (selectedMonthsNames.length > 0) {
      const count = selectedMonthsNames.length;
      const desc = `Fee payment for ${selectedMonthsNames.join(', ')} (${count} Month${count > 1 ? 's' : ''})`;
      setRemarks(prev => {
        // If remarks was empty or was an auto-generated fee string, update it
        if (!prev || prev.startsWith('Fee payment for')) {
          return desc;
        }
        return prev;
      });
    }
  }, [selectedMonthsNames]);

  // Fee item toggle and edit handlers
  const handleToggleFeeItem = (id) => {
    setFeeItems(prev =>
      prev.map(item => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleItemDiscountChange = (id, val) => {
    setFeeItems(prev =>
      prev.map(item => (item.id === id ? { ...item, discount: val } : item))
    );
  };

  const handleItemFineChange = (id, val) => {
    setFeeItems(prev =>
      prev.map(item => (item.id === id ? { ...item, fine: val } : item))
    );
  };

  const handleRemoveCustomItem = (id) => {
    setFeeItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItemForm.name.trim() || !customItemForm.amount || parseFloat(customItemForm.amount) <= 0) {
      showValidationError('Please provide a valid item name and positive amount');
      return;
    }

    const newItem = {
      id: `custom_${Date.now()}`,
      fee_structure_id: null,
      name: customItemForm.name.trim(),
      type: customItemForm.type,
      frequency: customItemForm.frequency,
      base_amount: parseFloat(customItemForm.amount),
      is_mandatory: false,
      enabled: true,
      is_custom: true,
      discount: '0',
      fine: '0',
      description: 'Ad-hoc student fee charge',
    };

    setFeeItems(prev => [...prev, newItem]);
    setCustomItemForm({ name: '', type: 'other', amount: '', frequency: 'one-time' });
    setShowAddCustomItem(false);
    toast.success('Custom fee item added');
  };

  // Detailed Breakdown Calculations
  const calculatedBreakdown = useMemo(() => {
    const monthsCount = selectedMonthKeys.length;

    let grossTotal = 0;
    let itemsDiscountTotal = 0;
    let itemsFineTotal = 0;

    const detailedItems = feeItems.map(item => {
      let multiplier = 1;
      let periodLabel = 'One-Time';

      if (item.frequency === 'monthly') {
        multiplier = Math.max(1, monthsCount);
        periodLabel = `${multiplier} Month${multiplier > 1 ? 's' : ''}`;
      } else if (item.frequency === 'quarterly') {
        multiplier = Math.max(1, Math.ceil(monthsCount / 3));
        periodLabel = `${multiplier} Quarter${multiplier > 1 ? 's' : ''}`;
      } else if (item.frequency === 'half-yearly') {
        multiplier = Math.max(1, Math.ceil(monthsCount / 6));
        periodLabel = `${multiplier} Half-Year${multiplier > 1 ? 's' : ''}`;
      } else {
        multiplier = 1;
        periodLabel = 'Annual / Fixed';
      }

      const subtotal = item.enabled ? item.base_amount * multiplier : 0;
      const discount = item.enabled ? Math.max(0, parseFloat(item.discount) || 0) : 0;
      const fine = item.enabled ? Math.max(0, parseFloat(item.fine) || 0) : 0;
      const total = item.enabled ? Math.max(0, subtotal - discount + fine) : 0;

      if (item.enabled) {
        grossTotal += subtotal;
        itemsDiscountTotal += discount;
        itemsFineTotal += fine;
      }

      return {
        ...item,
        multiplier,
        periodLabel,
        subtotal,
        total,
      };
    });

    const parsedGlobalDisc = Math.max(0, parseFloat(globalDiscount) || 0);
    const parsedGlobalFine = Math.max(0, parseFloat(globalFine) || 0);

    const totalDiscount = itemsDiscountTotal + parsedGlobalDisc;
    const totalFine = itemsFineTotal + parsedGlobalFine;
    const netPayable = Math.max(0, grossTotal - totalDiscount + totalFine);

    return {
      items: detailedItems,
      grossTotal,
      itemsDiscountTotal,
      itemsFineTotal,
      totalDiscount,
      totalFine,
      netPayable,
    };
  }, [feeItems, selectedMonthKeys, globalDiscount, globalFine]);

  // Cash change calculation
  const cashChangeReturn = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    const tendered = parseFloat(cashTendered) || 0;
    return tendered - calculatedBreakdown.netPayable;
  }, [paymentMethod, cashTendered, calculatedBreakdown.netPayable]);

  // Submit & Collect Payment
  const handleCollectPayment = async (e) => {
    e.preventDefault();

    if (!selectedAcademicYearId) {
      showValidationError('Please select an Academic Year');
      return;
    }
    if (!selectedClassId) {
      showValidationError('Please select a Class');
      return;
    }
    if (!selectedStudentId || !selectedStudent) {
      showValidationError('Please select a Student to collect payment for');
      return;
    }
    if (selectedMonthKeys.length === 0) {
      showValidationError('Please select at least 1 month for fee collection');
      return;
    }

    const enabledItems = calculatedBreakdown.items.filter(item => item.enabled);
    if (enabledItems.length === 0) {
      showValidationError('Please select at least one fee structure item in the breakdown table');
      return;
    }

    if (calculatedBreakdown.netPayable < 0) {
      showValidationError('Net payable fee amount cannot be negative');
      return;
    }

    if (!paymentDate) {
      showValidationError('Please select a valid payment date');
      return;
    }

    setSubmittingPayment(true);
    try {
      const payload = {
        student_id: selectedStudent.id,
        academic_year_id: selectedAcademicYearId,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_id: transactionId.trim() || null,
        remarks: remarks.trim(),
        months: selectedMonthsNames,
        discount: calculatedBreakdown.totalDiscount,
        fine: calculatedBreakdown.totalFine,
        total_amount: calculatedBreakdown.netPayable,
        items: enabledItems.map(item => ({
          fee_structure_id: item.fee_structure_id,
          name: item.name,
          subtotal: item.subtotal,
          discount: item.discount,
          fine: item.fine,
          total_amount: item.total,
        })),
      };

      const res = await feeAPI.collectTotalPayment(payload);

      if (res?.success) {
        toast.success(`Fee collected successfully! Receipt #${res.receipt_number}`);

        // Prepare receipt data for print modal
        const finalReceipt = {
          receipt_number: res.receipt_number,
          payment_date: paymentDate,
          created_at: new Date().toISOString(),
          student: selectedStudent,
          class_name: classes.find(c => String(c.id) === String(selectedClassId))?.name || 'Class',
          section_name: sections.find(s => String(s.id) === String(selectedSectionId))?.name || '',
          academic_year_name: selectedYearObj?.name || '',
          months_paid: selectedMonthsNames,
          payment_method: paymentMethod,
          transaction_id: transactionId,
          remarks: remarks,
          breakdown_items: enabledItems,
          gross_total: calculatedBreakdown.grossTotal,
          discount: calculatedBreakdown.totalDiscount,
          fine: calculatedBreakdown.totalFine,
          net_amount: calculatedBreakdown.netPayable,
          collected_by: user?.name || 'Administrator',
        };

        setReceiptData(finalReceipt);
        setShowReceiptModal(true);

        // Refresh student payments
        const refreshedHistory = await feeAPI.getPayments({
          student_id: selectedStudent.id,
          per_page: 50,
        });
        if (refreshedHistory?.success) {
          setStudentPayments(refreshedHistory.data || []);
        }
      }
    } catch (err) {
      console.error('Error recording total fee payment:', err);
      showValidationError(err.message || 'Failed to collect payment. Please check details and try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Reset Form for next student
  const handleResetForm = () => {
    setSelectedStudentId('');
    setSelectedStudent(null);
    setStudentSearch('');
    setStudentPayments([]);
    setGlobalDiscount('0');
    setGlobalFine('0');
    setTransactionId('');
    setCashTendered('');
    setShowReceiptModal(false);
    setReceiptData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Trigger Print
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Tab Navigation */}
      <FeeTabs />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">💳</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Fee Payment</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Collect monthly or multi-month advance student fees with automatic breakdown and instant receipt
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/fees/payments')}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <span>🧾</span>
            <span>All Payment History</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Selection & Payment Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Filters, Student Card & Month Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card 1: Selection Dropdowns */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                <span>Select Academic Period & Student</span>
              </h2>
              {loadingInitial && <span className="text-xs text-blue-600 animate-pulse">Loading...</span>}
            </div>

            {/* Academic Year Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAcademicYearId}
                onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                className="input-field text-sm font-medium"
              >
                <option value="">-- Choose Academic Year --</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} {year.is_current ? '(Current Session)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Class & Section Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSectionId('');
                    setSelectedStudentId('');
                  }}
                  className="input-field text-sm"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => {
                    setSelectedSectionId(e.target.value);
                    setSelectedStudentId('');
                  }}
                  disabled={!selectedClassId || loadingSections}
                  className="input-field text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Sections</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Search & Select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Student <span className="text-red-500">*</span>
                </label>
                {students.length > 0 && (
                  <span className="text-xs text-gray-500 font-medium">
                    {students.length} Student{students.length > 1 ? 's' : ''} in class
                  </span>
                )}
              </div>

              {/* Quick filter input if class has students */}
              {students.length > 5 && (
                <div className="mb-2">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="🔍 Filter student by name, roll, admission #..."
                    className="input-field text-xs py-1.5 bg-gray-50"
                  />
                </div>
              )}

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={!selectedClassId || loadingStudents}
                className="input-field text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingStudents
                    ? 'Loading students...'
                    : !selectedClassId
                    ? '-- Select Class First --'
                    : students.length === 0
                    ? '-- No Students Found in Class --'
                    : '-- Select Student to Pay Fees --'}
                </option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} {s.roll_number ? `(Roll: ${s.roll_number})` : ''} - Adm: {s.admission_number || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Student Profile Banner */}
          {selectedStudent && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4.5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {selectedStudent.first_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Adm No: <span className="font-semibold text-gray-800">{selectedStudent.admission_number || 'N/A'}</span>
                      {selectedStudent.roll_number && <> • Roll: <span className="font-semibold text-gray-800">{selectedStudent.roll_number}</span></>}
                    </p>
                  </div>
                </div>

                <Badge variant={selectedStudent.status === 'active' ? 'success' : 'default'}>
                  {selectedStudent.status || 'Active'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-blue-100">
                <div>
                  <span className="text-gray-500">Class:</span> <span className="font-medium text-gray-800">{selectedStudent.class?.name || classes.find(c => String(c.id) === String(selectedClassId))?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Section:</span> <span className="font-medium text-gray-800">{selectedStudent.section?.name || 'Default'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Guardian Contact:</span> <span className="font-medium text-gray-800">{selectedStudent.emergency_contact_phone || selectedStudent.user?.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Past Payments:</span>{' '}
                  <span className="font-semibold text-blue-700">
                    {studentPayments.length} recorded
                  </span>
                </div>
              </div>

              {/* View Past Payments Toggle */}
              {studentPayments.length > 0 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showHistoryDrawer ? '▲ Hide Past Payments' : '▼ View Student Payment History'}</span>
                    <span className="text-gray-500">({studentPayments.length})</span>
                  </button>

                  {showHistoryDrawer && (
                    <div className="mt-2.5 max-h-44 overflow-y-auto bg-white rounded-xl border border-blue-200 p-2 text-xs space-y-1.5">
                      {studentPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                          <div>
                            <div className="font-medium text-gray-900">{p.receipt_number || 'Receipt'}</div>
                            <div className="text-[11px] text-gray-500">{formatDate(p.payment_date)} • {p.payment_method?.toUpperCase()}</div>
                            {p.remarks && <div className="text-[10px] text-gray-600 italic truncate max-w-[200px]">{p.remarks}</div>}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 font-mono">{formatCurrency(p.total_amount || p.amount)}</div>
                            <Badge variant={p.status === 'completed' ? 'success' : 'warning'}>{p.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Card 2: Month & Advance Period Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Fee Months & Advance Payment</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select month(s) to pay. Students can pay 1 month or any number of months in advance.
                </p>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                ⚡ Quick Advance Presets:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPresetMonths(1)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                    selectedMonthKeys.length === 1
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Current Month (1 mo)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPresetMonths(3)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                    selectedMonthKeys.length === 3
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Quarter (3 mos)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPresetMonths(6)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                    selectedMonthKeys.length === 6
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Half-Year (6 mos)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPresetMonths(12)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
                    selectedMonthKeys.length === 12
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Full Year (12 mos)
                </button>
                <button
                  type="button"
                  onClick={handleClearMonths}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                  title="Clear all selected months"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Individual Months Grid (12 Months of Academic Session) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Session Months ({academicMonths.length}):
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {academicMonths.map((m) => {
                  const isSelected = selectedMonthKeys.includes(m.key);
                  const isPaid = paidMonthsSet.has(m.key);

                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleToggleMonth(m.key)}
                      className={`relative p-2.5 text-left rounded-xl border transition-all text-xs cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-semibold'
                          : isPaid
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 opacity-90'
                          : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{m.shortName}</span>
                        {isSelected && (
                          <span className="text-blue-600 font-bold">✓</span>
                        )}
                        {!isSelected && isPaid && (
                          <span className="text-emerald-600 text-[10px] font-bold" title="Already marked paid">Paid</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">
                        {isSelected ? 'Selected' : isPaid ? 'Past Paid' : 'Unpaid'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Month Summary Tag */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-800">Selected Duration:</span>{' '}
                <span className="font-bold text-blue-700">
                  {selectedMonthKeys.length} Month{selectedMonthKeys.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-gray-500 text-[11px] font-medium">
                Monthly Fees Multiplier: <span className="font-bold text-gray-800">{selectedMonthKeys.length}×</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Fee Breakdown & Payment Collection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Card 3: Dynamic Fee Breakdown Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Fees Breakdown</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Itemized charges for selected class and {selectedMonthKeys.length} advance month(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomItem(!showAddCustomItem)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>➕</span>
                <span>Add Custom Item</span>
              </button>
            </div>

            {/* Add Custom Item Form (Collapsible) */}
            {showAddCustomItem && (
              <form onSubmit={handleAddCustomItem} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-3">
                <div className="font-semibold text-xs text-gray-800 flex items-center justify-between">
                  <span>Add Ad-hoc / Custom Fee Line</span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomItem(false)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Fee Name (e.g. Identity Card, Uniform)"
                      value={customItemForm.name}
                      onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                      className="input-field text-xs py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="Amount (₹)"
                      value={customItemForm.amount}
                      onChange={(e) => setCustomItemForm({ ...customItemForm, amount: e.target.value })}
                      className="input-field text-xs py-1.5"
                      required
                    />
                  </div>
                  <div>
                    <select
                      value={customItemForm.frequency}
                      onChange={(e) => setCustomItemForm({ ...customItemForm, frequency: e.target.value })}
                      className="input-field text-xs py-1.5"
                    >
                      <option value="one-time">One-Time (1×)</option>
                      <option value="monthly">Monthly ({selectedMonthKeys.length}×)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomItem(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold cursor-pointer"
                  >
                    Add Fee Line
                  </button>
                </div>
              </form>
            )}

            {/* Fee Breakdown Table */}
            {loadingStructures ? (
              <div className="py-8 text-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading fee structures for selected class...
              </div>
            ) : !selectedClassId ? (
              <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs">
                👉 Select a Class and Student on the left to load the applicable fee breakdown.
              </div>
            ) : calculatedBreakdown.items.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs space-y-2">
                <p>No fee structures configured for this class in {selectedYearObj?.name || 'this session'}.</p>
                <button
                  type="button"
                  onClick={() => setShowAddCustomItem(true)}
                  className="btn-primary text-xs px-3 py-1.5 cursor-pointer"
                >
                  ➕ Add Custom Fee Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-semibold uppercase tracking-wider border-b">
                    <tr>
                      <th className="p-2.5 w-10 text-center">Include</th>
                      <th className="p-2.5">Fee Particulars</th>
                      <th className="p-2.5 text-right">Rate (₹)</th>
                      <th className="p-2.5 text-center">Multiplier</th>
                      <th className="p-2.5 text-right">Subtotal (₹)</th>
                      <th className="p-2.5 text-right w-20">Discount (₹)</th>
                      <th className="p-2.5 text-right w-20">Fine (₹)</th>
                      <th className="p-2.5 text-right">Net (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {calculatedBreakdown.items.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition ${item.enabled ? 'hover:bg-blue-50/40' : 'bg-gray-50 opacity-50'}`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => handleToggleFeeItem(item.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900">{item.name}</span>
                            <Badge variant={getFeeTypeBadgeVariant(item.type)}>
                              {formatFeeTypeLabel(item.type)}
                            </Badge>
                            {item.is_custom && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomItem(item.id)}
                                className="text-red-500 hover:text-red-700 ml-1 text-xs"
                                title="Remove item"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 capitalize">
                            Frequency: {item.frequency}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-700">
                          {formatCurrency(item.base_amount)}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800">
                            {item.frequency === 'monthly' ? `× ${item.multiplier} mo` : '× 1'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-gray-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={!item.enabled}
                            value={item.discount}
                            onChange={(e) => handleItemDiscountChange(item.id, e.target.value)}
                            className="w-16 px-1.5 py-1 text-right text-xs rounded border border-gray-300 focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={!item.enabled}
                            value={item.fine}
                            onChange={(e) => handleItemFineChange(item.id, e.target.value)}
                            className="w-16 px-1.5 py-1 text-right text-xs rounded border border-gray-300 focus:ring-1 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Global Adjustments: Concession & Fine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Overall Concession / Scholarship Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)}
                  placeholder="0.00"
                  className="input-field text-xs py-1.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Overall Late Fine / Surcharge (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={globalFine}
                  onChange={(e) => setGlobalFine(e.target.value)}
                  placeholder="0.00"
                  className="input-field text-xs py-1.5"
                />
              </div>
            </div>

            {/* Total Summary Banner */}
            <div className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total Settlement for {selectedMonthKeys.length} Month{selectedMonthKeys.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span>Gross: {formatCurrency(calculatedBreakdown.grossTotal)}</span>
                  {calculatedBreakdown.totalDiscount > 0 && (
                    <span className="text-emerald-400">Discount: -{formatCurrency(calculatedBreakdown.totalDiscount)}</span>
                  )}
                  {calculatedBreakdown.totalFine > 0 && (
                    <span className="text-amber-400">Fine: +{formatCurrency(calculatedBreakdown.totalFine)}</span>
                  )}
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="text-xs uppercase text-gray-400 block">Net Total Payable</span>
                <span className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                  {formatCurrency(calculatedBreakdown.netPayable)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Payment Details & Collection Form */}
          <form onSubmit={handleCollectPayment} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">4</span>
                <span>Payment Settlement & Receipt Details</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field text-sm font-medium capitalize"
                >
                  <option value="cash">💵 Cash Payment</option>
                  <option value="online">📱 UPI / QR / Online</option>
                  <option value="card">💳 Debit / Credit Card</option>
                  <option value="bank-transfer">🏦 Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="check">📝 Cheque / Demand Draft</option>
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input-field text-sm font-medium"
                  required
                />
              </div>

              {/* Transaction ID / Cheque No */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Transaction / Cheque / UTR Ref No
                </label>
                <input
                  type="text"
                  placeholder={paymentMethod === 'cash' ? 'Optional cash register ref' : 'e.g. UPI Ref # or Cheque #'}
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="input-field text-sm font-mono"
                />
              </div>

              {/* Cash Calculator (When Cash Selected) */}
              {paymentMethod === 'cash' && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-emerald-900">
                      Cash Received (₹):
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 5000"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-28 px-2 py-1 text-right text-xs rounded border border-emerald-300 font-mono font-semibold"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200">
                    <span className="text-emerald-800 font-medium">Change to Return:</span>
                    <span className={`font-mono font-bold text-sm ${cashChangeReturn >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCurrency(cashChangeReturn)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Remarks / Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Remarks / Payment Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks, advance months coverage note..."
                className="input-field text-xs"
              />
            </div>

            {/* Submit & Reset Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={submittingPayment || !selectedStudentId || calculatedBreakdown.items.filter(i => i.enabled).length === 0}
                className="w-full sm:w-auto btn-primary px-6 py-2.5 text-sm font-bold flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submittingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <span>💳</span>
                    <span>Collect Fees ({formatCurrency(calculatedBreakdown.netPayable)})</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

      </div>

      {/* ========================================================= */}
      {/* PROFESSIONAL PRINTABLE RECEIPT MODAL                      */}
      {/* ========================================================= */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-200 my-8">
            
            {/* Modal Actions Bar (Hidden during print) */}
            <div className="print:hidden bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span className="font-bold text-sm">Payment Recorded Successfully</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
                >
                  Collect Another
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-400 hover:text-white text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Receipt Area */}
            <div id="printable-fee-receipt" className="p-8 bg-white text-gray-900 text-xs">
              
              {/* Receipt Header */}
              <div className="border-b-2 border-gray-900 pb-4 mb-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-2xl">🎓</span>
                  <h2 className="text-2xl font-black uppercase tracking-wider text-gray-900">
                    Delhi Public Academy
                  </h2>
                </div>
                <p className="text-xs text-gray-600">
                  Affiliated to CBSE / State Board • Reg. No: SMS-EDU-2024-9988
                </p>
                <p className="text-[11px] text-gray-500">
                  Knowledge Park, Institutional Area, New Delhi • Contact: +91 98765 43210 • Email: accounts@school.edu
                </p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded">
                    Official Fee Receipt / Tax Invoice
                  </span>
                </div>
              </div>

              {/* Receipt Meta & Student Info */}
              <div className="grid grid-cols-2 gap-4 mb-5 border border-gray-200 rounded-xl p-3.5 bg-gray-50/50">
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">Student Name:</span>{' '}
                    <span className="font-bold text-gray-900 text-sm">
                      {receiptData.student?.first_name} {receiptData.student?.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">Admission No:</span>{' '}
                    <span className="font-semibold text-gray-800 font-mono">
                      {receiptData.student?.admission_number || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">Class & Section:</span>{' '}
                    <span className="font-semibold text-gray-800">
                      {receiptData.class_name} {receiptData.section_name ? `- Section ${receiptData.section_name}` : ''}
                    </span>
                    {receiptData.student?.roll_number && (
                      <span className="text-gray-600 ml-2">(Roll: {receiptData.student.roll_number})</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">Receipt No:</span>{' '}
                    <span className="font-bold text-gray-900 font-mono text-sm">
                      {receiptData.receipt_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">Date of Payment:</span>{' '}
                    <span className="font-semibold text-gray-800">
                      {formatDate(receiptData.payment_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">Academic Session:</span>{' '}
                    <span className="font-semibold text-gray-800">
                      {receiptData.academic_year_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 uppercase text-[10px] font-semibold">Payment Mode:</span>{' '}
                    <span className="font-bold text-gray-800 uppercase font-mono">
                      {receiptData.payment_method} {receiptData.transaction_id ? `(Ref: ${receiptData.transaction_id})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coverage / Period Banner */}
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs">
                <span className="font-bold text-blue-900">Paid Period:</span>{' '}
                <span className="text-blue-800 font-medium">
                  {receiptData.months_paid?.join(', ')} ({receiptData.months_paid?.length} Month{receiptData.months_paid?.length > 1 ? 's' : ''} Covered)
                </span>
              </div>

              {/* Itemized Fee Table */}
              <div className="mb-5 overflow-hidden border border-gray-300 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Particulars</th>
                      <th className="p-2 text-center">Period / Qty</th>
                      <th className="p-2 text-right">Rate (₹)</th>
                      <th className="p-2 text-right">Subtotal (₹)</th>
                      <th className="p-2 text-right">Discount (₹)</th>
                      <th className="p-2 text-right">Net Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {receiptData.breakdown_items.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-2 text-center text-gray-500">{idx + 1}</td>
                        <td className="p-2 font-semibold text-gray-900">
                          {item.name}
                          <span className="text-[10px] text-gray-500 block font-normal capitalize">
                            Category: {item.type}
                          </span>
                        </td>
                        <td className="p-2 text-center text-gray-700 font-medium">
                          {item.frequency === 'monthly' ? `${item.multiplier} Month(s)` : '1'}
                        </td>
                        <td className="p-2 text-right font-mono text-gray-700">
                          {formatCurrency(item.base_amount)}
                        </td>
                        <td className="p-2 text-right font-mono text-gray-800">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-700">
                          {parseFloat(item.discount) > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold border-t border-gray-300">
                    <tr>
                      <td colSpan={4} className="p-2 text-right text-gray-700">Gross Total:</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(receiptData.gross_total)}</td>
                      <td className="p-2 text-right font-mono text-emerald-700">
                        {receiptData.discount > 0 ? `-${formatCurrency(receiptData.discount)}` : '-'}
                      </td>
                      <td className="p-2 text-right font-mono text-gray-900">{formatCurrency(receiptData.gross_total - receiptData.discount)}</td>
                    </tr>
                    {receiptData.fine > 0 && (
                      <tr>
                        <td colSpan={6} className="p-1.5 text-right text-red-600">Late Fine / Penalty:</td>
                        <td className="p-1.5 text-right font-mono text-red-600">+{formatCurrency(receiptData.fine)}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-900 text-white text-sm">
                      <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider font-extrabold">
                        Total Amount Received:
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-400 font-extrabold text-base">
                        {formatCurrency(receiptData.net_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount in Words */}
              <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="font-bold text-gray-700">Amount in Words:</span>{' '}
                <span className="font-semibold text-gray-900 italic">
                  {numberToWords(receiptData.net_amount)}
                </span>
              </div>

              {/* Remarks */}
              {receiptData.remarks && (
                <div className="mb-6 text-[11px] text-gray-600">
                  <span className="font-bold">Remarks:</span> {receiptData.remarks}
                </div>
              )}

              {/* Signatures & Footer */}
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
                    Authorized Signatory • {receiptData.collected_by}
                  </div>
                </div>
              </div>

              {/* Computer generated disclaimer */}
              <div className="text-center text-[10px] text-gray-400 mt-6 pt-3 border-t">
                This is a computer-generated fee receipt and does not require a physical signature. Thank you for your payment!
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
          #printable-fee-receipt, #printable-fee-receipt * {
            visibility: visible;
          }
          #printable-fee-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FeePaymentCollect;
