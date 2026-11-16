import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { feeAPI, academicYearAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { formatFeeTypeLabel, getFeeTypeBadgeVariant } from '../../utils/feeTypes';
import { numberToWords } from '../../utils/numberToWords';
import FeeTabs from './FeeTabs';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const StudentFeesView = () => {
  const navigate = useNavigate();
  const { formatDate, formatCurrency, settings, calculateLateFine, isMonthOverdue, getDaysOverdue } = useSettings();
  const { currentStudent, studentLoading, isParent } = useAuth();

  const [loading, setLoading] = useState(true);
  const [feeStructures, setFeeStructures] = useState([]);
  const [studentPayments, setStudentPayments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'overdue' | 'upcoming' | 'paid'
  const [searchTerm, setSearchTerm] = useState('');

  // Payment Details / Receipt Dialog Modal state
  const [selectedPaymentForView, setSelectedPaymentForView] = useState(null);
  const [isDialogFullScreen, setIsDialogFullScreen] = useState(false);
  const [activeDialogTab, setActiveDialogTab] = useState('breakdown'); // 'breakdown' | 'receipt'

  // Fetch student's fee structures, payments, and academic year details
  const fetchStudentFeeData = async () => {
    if (!currentStudent?.id) return;
    setLoading(true);
    try {
      const [structuresRes, paymentsRes, yearsRes] = await Promise.all([
        feeAPI.getStructures({ per_page: 100 }),
        feeAPI.getPayments({ student_id: currentStudent.id, per_page: 'all' }),
        academicYearAPI.getAll({ per_page: 100 }),
      ]);

      if (structuresRes?.success) {
        // Filter fee structures applicable to this student's class (or class_id === null for school-wide fees)
        const studentClassId = currentStudent.class_id || currentStudent.class?.id;
        const studentYearId = currentStudent.academic_year_id || currentStudent.academic_year?.id;

        const filteredStructures = (structuresRes.data || []).filter(item => {
          const classMatches = !item.class_id || (studentClassId && String(item.class_id) === String(studentClassId));
          const yearMatches = !studentYearId || !item.academic_year_id || String(item.academic_year_id) === String(studentYearId);
          return classMatches && yearMatches;
        });

        setFeeStructures(filteredStructures);
      }

      if (paymentsRes?.success) {
        setStudentPayments(paymentsRes.data || []);
      }

      if (yearsRes?.success) {
        setAcademicYears(yearsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching student fee data:', error);
      toast.error('Failed to load fee details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStudent?.id) {
      fetchStudentFeeData();
    } else if (!studentLoading) {
      setLoading(false);
    }
  }, [currentStudent?.id, studentLoading]);

  // Identify current academic year object
  const currentAcademicYear = useMemo(() => {
    const studentYearId = currentStudent?.academic_year_id || currentStudent?.academic_year?.id;
    if (studentYearId && academicYears.length > 0) {
      const found = academicYears.find(y => String(y.id) === String(studentYearId));
      if (found) return found;
    }
    // Fallback: active year or first
    return academicYears.find(y => y.status === 'active') || academicYears[0] || null;
  }, [academicYears, currentStudent]);

  // Generate 12 Academic Months for the session
  const academicMonths = useMemo(() => {
    let startYear = new Date().getFullYear();
    let startMonth = 3; // April (0-indexed) by default for Indian academic sessions

    if (currentAcademicYear?.name) {
      const match = currentAcademicYear.name.match(/(\d{4})/g);
      if (match && match.length >= 1) {
        startYear = parseInt(match[0], 10);
      }
    }

    if (currentAcademicYear?.start_date) {
      const d = new Date(currentAcademicYear.start_date);
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
  }, [currentAcademicYear]);

  // Map each academic month to whether it has been paid & the corresponding payment record
  const { paidMonthsMap, paidMonthsSet } = useMemo(() => {
    const paidSet = new Set();
    const map = {};

    if (!studentPayments || studentPayments.length === 0) {
      return { paidMonthsMap: map, paidMonthsSet: paidSet };
    }

    studentPayments.forEach(pay => {
      const text = `${pay.remarks || ''} ${pay.receipt_number || ''}`.toLowerCase();
      academicMonths.forEach(m => {
        const fullMonth = m.name.toLowerCase();
        const shortMonth = m.shortName.toLowerCase().replace("'", "");
        const rawShort = SHORT_MONTH_NAMES[m.monthIndex].toLowerCase();
        const yearStr = String(m.year);

        if (
          text.includes(fullMonth) ||
          text.includes(m.shortName.toLowerCase()) ||
          text.includes(shortMonth) ||
          (text.includes(rawShort) && text.includes(yearStr))
        ) {
          paidSet.add(m.key);
          map[m.key] = pay;
        }
      });
    });

    return { paidMonthsMap: map, paidMonthsSet: paidSet };
  }, [studentPayments, academicMonths]);

  // Calculate monthly recurring fee total
  const monthlyStructures = useMemo(() => {
    return feeStructures.filter(f => f.frequency === 'monthly');
  }, [feeStructures]);

  const oneTimeStructures = useMemo(() => {
    return feeStructures.filter(f => f.frequency !== 'monthly');
  }, [feeStructures]);

  const monthlyBaseRate = useMemo(() => {
    return monthlyStructures.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
  }, [monthlyStructures]);

  // Build complete list of monthly fee obligation items
  const monthlyFeeItems = useMemo(() => {
    const dueDay = Math.min(31, Math.max(1, parseInt(settings?.fee_due_day_of_month ?? 10, 10) || 10));
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return academicMonths.map(month => {
      const isPaid = paidMonthsSet.has(month.key);
      const paidPayment = paidMonthsMap[month.key] || null;

      const dueDate = new Date(month.year, month.monthIndex, dueDay);
      const overdue = !isPaid && isMonthOverdue(month);
      const daysOverdueCount = overdue ? getDaysOverdue(month) : 0;
      const lateFineObj = overdue ? calculateLateFine([month], monthlyBaseRate) : { fineAmount: 0 };
      const isCurrentMonth = month.key === currentMonthKey;

      let status = 'upcoming';
      if (isPaid) {
        status = 'paid';
      } else if (overdue) {
        status = 'overdue';
      } else if (isCurrentMonth) {
        status = 'due_soon';
      }

      return {
        id: `monthly-${month.key}`,
        type: 'monthly',
        monthKey: month.key,
        name: `${month.name} Fees`,
        monthName: month.name,
        shortName: month.shortName,
        dueDate,
        baseAmount: monthlyBaseRate,
        lateFine: lateFineObj.fineAmount || 0,
        totalPayable: monthlyBaseRate + (lateFineObj.fineAmount || 0),
        status, // 'paid' | 'overdue' | 'due_soon' | 'upcoming'
        isPaid,
        daysOverdue: daysOverdueCount,
        paidPayment,
        structures: monthlyStructures,
      };
    });
  }, [academicMonths, paidMonthsSet, paidMonthsMap, isMonthOverdue, getDaysOverdue, calculateLateFine, monthlyBaseRate, settings, monthlyStructures]);

  // Build one-time / annual fee obligation items
  const oneTimeFeeItems = useMemo(() => {
    return oneTimeStructures.map(f => {
      // Find if payment exists for this fee_structure_id
      const payment = studentPayments.find(p => p.fee_structure_id === f.id && p.status === 'completed');
      const isPaid = !!payment;
      const dueDate = f.due_date ? new Date(f.due_date) : null;
      const isOverdue = !isPaid && dueDate && new Date() > dueDate;

      let status = 'upcoming';
      if (isPaid) {
        status = 'paid';
      } else if (isOverdue) {
        status = 'overdue';
      }

      return {
        id: `onetime-${f.id}`,
        type: 'one-time',
        name: f.name,
        monthName: f.frequency ? `(${f.frequency})` : 'One-Time',
        dueDate,
        baseAmount: parseFloat(f.amount) || 0,
        lateFine: 0,
        totalPayable: parseFloat(f.amount) || 0,
        status,
        isPaid,
        daysOverdue: isOverdue && dueDate ? Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
        paidPayment: payment || null,
        feeStructure: f,
      };
    });
  }, [oneTimeStructures, studentPayments]);

  // All fee schedule items combined
  const allFeeItems = useMemo(() => {
    return [...monthlyFeeItems, ...oneTimeFeeItems];
  }, [monthlyFeeItems, oneTimeFeeItems]);

  // Overall Financial Aggregates
  const stats = useMemo(() => {
    const totalExpectedAnnual = allFeeItems.reduce((acc, curr) => acc + curr.baseAmount, 0);

    const totalPaidAmount = studentPayments
      .filter(p => p.status === 'completed')
      .reduce((acc, curr) => acc + (parseFloat(curr.total_amount || curr.amount) || 0), 0);

    const overdueItems = allFeeItems.filter(i => i.status === 'overdue');
    const totalOverdueAmount = overdueItems.reduce((acc, curr) => acc + curr.totalPayable, 0);

    const upcomingItems = allFeeItems.filter(i => i.status === 'upcoming' || i.status === 'due_soon');
    const totalUpcomingAmount = upcomingItems.reduce((acc, curr) => acc + curr.baseAmount, 0);

    const paidPercentage = totalExpectedAnnual > 0
      ? Math.min(100, Math.round((totalPaidAmount / totalExpectedAnnual) * 100))
      : (totalPaidAmount > 0 ? 100 : 0);

    return {
      totalExpectedAnnual,
      totalPaidAmount,
      totalOverdueAmount,
      totalUpcomingAmount,
      overdueCount: overdueItems.length,
      upcomingCount: upcomingItems.length,
      paidCount: studentPayments.length,
      paidPercentage,
    };
  }, [allFeeItems, studentPayments]);

  // Filtered Fee Items according to active filter tab and search
  const filteredScheduleItems = useMemo(() => {
    return allFeeItems.filter(item => {
      // Tab filter
      if (activeFilterTab === 'overdue' && item.status !== 'overdue') return false;
      if (activeFilterTab === 'upcoming' && item.status !== 'upcoming' && item.status !== 'due_soon') return false;
      if (activeFilterTab === 'paid' && item.status !== 'paid') return false;

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(term) ||
          item.monthName.toLowerCase().includes(term) ||
          (item.paidPayment?.receipt_number && item.paidPayment.receipt_number.toLowerCase().includes(term))
        );
      }

      return true;
    });
  }, [allFeeItems, activeFilterTab, searchTerm]);

  // Filtered Payments for Receipts Tab
  const filteredPayments = useMemo(() => {
    if (!searchTerm) return studentPayments;
    const term = searchTerm.toLowerCase();
    return studentPayments.filter(p => {
      return (
        (p.receipt_number && p.receipt_number.toLowerCase().includes(term)) ||
        (p.payment_method && p.payment_method.toLowerCase().includes(term)) ||
        (p.remarks && p.remarks.toLowerCase().includes(term))
      );
    });
  }, [studentPayments, searchTerm]);

  // Open full-screen receipt / breakdown modal
  const handleOpenReceiptModal = (payment) => {
    if (!payment) return;
    setSelectedPaymentForView(payment);
    setActiveDialogTab('breakdown');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span>✓</span> Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse shadow-2xs">
            <span>⚠️</span> Overdue
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
            <span>📅</span> Due This Month
          </span>
        );
      case 'upcoming':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span>⏳</span> Upcoming
          </span>
        );
    }
  };

  if (studentLoading || loading) {
    return (
      <div className="px-[15px] py-6 w-full space-y-6">
        <FeeTabs />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStudent && !studentLoading && !loading) {
    return (
      <div className="px-[15px] py-6 w-full space-y-6">
        <FeeTabs />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <span className="text-4xl block mb-3">{isParent() ? '👦👧' : '👨‍🎓'}</span>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{isParent() ? 'No Linked Child Found' : 'No Student Profile Linked'}</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            {isParent()
              ? 'No enrolled child has been linked to your parent account yet. Please verify your contact details or contact school administration.'
              : 'Your account is set to Student role, but no linked student record could be loaded. Please contact the administrator.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-[15px] py-6 w-full space-y-6">
      {/* Tab Navigation */}
      <FeeTabs />

      {/* Top Header & Student Identity Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {currentStudent ? `${currentStudent.first_name?.[0] || 'S'}${currentStudent.last_name?.[0] || ''}` : '👨‍🎓'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'Enrolled Student'}
                </h1>
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                  {isParent() ? "🔒 Parent Portal: Child's Fees" : "🔒 Student Personal Fee Portal"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-mono mt-1.5">
                <span>
                  Admission No: <strong className="text-gray-800">{currentStudent?.admission_number || 'N/A'}</strong>
                </span>
                {currentStudent?.roll_number && (
                  <span className="border-l border-gray-200 pl-3">
                    Roll: <strong className="text-gray-800">{currentStudent.roll_number}</strong>
                  </span>
                )}
                <span className="border-l border-gray-200 pl-3">
                  Class: <strong className="text-gray-800">{currentStudent?.class?.name || (currentStudent?.class_id ? `Class ${currentStudent.class_id}` : 'General')}</strong>
                </span>
                {currentStudent?.section?.name && (
                  <span className="border-l border-gray-200 pl-3">
                    Section: <strong className="text-gray-800">{currentStudent.section.name}</strong>
                  </span>
                )}
                <span className="border-l border-gray-200 pl-3">
                  Session: <strong className="text-gray-800">{currentAcademicYear?.name || 'Current Year'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStudentFeeData}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              title="Refresh fee status"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/fees/payments')}
              className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            >
              <span>🧾</span>
              <span>My Receipts</span>
            </button>
          </div>
        </div>

        {/* 4 Key Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Annual Fees */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Session Fees</span>
              <span className="text-lg">📚</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-gray-900 font-mono">
                {formatCurrency(stats.totalExpectedAnnual)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Annual obligation for {currentStudent?.class?.name || 'Class'}
              </p>
            </div>
          </div>

          {/* Card 2: Total Paid */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Total Amount Paid</span>
              <span className="text-xs font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full font-mono">
                {stats.paidPercentage}% Paid
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {formatCurrency(stats.totalPaidAmount)}
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${stats.paidPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Overdue Fees */}
          <div className={`rounded-2xl p-4 flex flex-col justify-between shadow-2xs border ${
            stats.totalOverdueAmount > 0
              ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
              : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                stats.totalOverdueAmount > 0 ? 'text-red-800' : 'text-gray-500'
              }`}>
                Overdue Fees
              </span>
              <span className="text-lg">{stats.totalOverdueAmount > 0 ? '⚠️' : '✅'}</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-black font-mono ${
                stats.totalOverdueAmount > 0 ? 'text-red-600' : 'text-gray-800'
              }`}>
                {formatCurrency(stats.totalOverdueAmount)}
              </div>
              <p className={`text-[11px] mt-1 font-semibold ${
                stats.totalOverdueAmount > 0 ? 'text-red-700' : 'text-emerald-600'
              }`}>
                {stats.totalOverdueAmount > 0
                  ? `${stats.overdueCount} Month${stats.overdueCount > 1 ? 's' : ''} past due deadline`
                  : 'All fees up to date ✨'}
              </p>
            </div>
          </div>

          {/* Card 4: Upcoming Fees */}
          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/60 border border-blue-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Upcoming Fees</span>
              <span className="text-lg">⏳</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-blue-900 font-mono">
                {formatCurrency(stats.totalUpcomingAmount)}
              </div>
              <p className="text-[11px] text-blue-700 mt-1">
                {stats.upcomingCount} Future installments scheduled
              </p>
            </div>
          </div>
        </div>

        {/* Due Day & Overdue Advisory Notice */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
          <span className="text-lg mt-0.5">ℹ️</span>
          <div className="leading-relaxed">
            <b>Fee Payment Policy:</b> Monthly school fees are due by the{' '}
            <b>{settings?.fee_due_day_of_month || 10}th of each month</b>.
            {settings?.fee_grace_period_days > 0 && (
              <> A grace period of <b>{settings.fee_grace_period_days} days</b> applies before late fees are incurred.</>
            )}
            {' '}For online or cash payment settlement, please contact the school finance department with your student admission number.
          </div>
        </div>
      </div>

      {/* Main Tabbed Fee Schedule & Records */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Filters Bar */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              <span>📋 All Schedule</span>
              <span className="text-[10px] bg-black/15 px-1.5 py-0.2 rounded-full font-mono">
                {allFeeItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('overdue')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'overdue'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
              }`}
            >
              <span>⚠️ Overdue</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilterTab === 'overdue' ? 'bg-white/20' : 'bg-red-100 text-red-800'
              }`}>
                {stats.overdueCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'upcoming'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <span>⏳ Upcoming</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilterTab === 'upcoming' ? 'bg-white/20' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {stats.upcomingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilterTab('paid')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span>🧾 Paid Receipts</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeFilterTab === 'paid' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {stats.paidCount}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search month, receipt, fee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field text-xs py-1.5"
            />
          </div>
        </div>

        {/* TAB CONTENT 1: PAID RECEIPTS VIEW */}
        {activeFilterTab === 'paid' ? (
          <div>
            {filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <span className="text-4xl block mb-2">🧾</span>
                <p className="font-semibold text-gray-700">No payment receipts found.</p>
                <p className="text-xs text-gray-500 mt-1">Paid fee receipts will appear here once recorded by the accounts department.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3.5 pl-5">Receipt #</th>
                      <th className="p-3.5">Payment Date</th>
                      <th className="p-3.5">Fee Category</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Coverage / Remarks</th>
                      <th className="p-3.5 text-right font-mono">Amount Paid</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center pr-5">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredPayments.map(payment => (
                      <tr key={payment.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3.5 pl-5 font-mono font-bold text-blue-700">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptModal(payment)}
                            className="hover:underline flex items-center gap-1 cursor-pointer"
                            title="View official receipt"
                          >
                            <span>{payment.receipt_number || `RCP-${payment.id}`}</span>
                            <span className="text-gray-400">👁️</span>
                          </button>
                        </td>
                        <td className="p-3.5 text-gray-700">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="p-3.5 font-medium text-gray-900">
                          {payment.fee_structure?.name || 'Tuition Fee'}
                        </td>
                        <td className="p-3.5 capitalize text-gray-600 font-medium">
                          {payment.payment_method || 'Cash'}
                        </td>
                        <td className="p-3.5 text-gray-700 max-w-xs truncate" title={payment.remarks}>
                          {payment.remarks || '-'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-700 text-sm">
                          {formatCurrency(payment.total_amount || payment.amount)}
                        </td>
                        <td className="p-3.5 text-center">
                          <Badge variant="success">Completed</Badge>
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceiptModal(payment)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs font-bold transition cursor-pointer"
                          >
                            <span>View Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* TAB CONTENT 2: SCHEDULE VIEW (ALL, OVERDUE, UPCOMING) */
          <div>
            {filteredScheduleItems.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <span className="text-4xl block mb-2">
                  {activeFilterTab === 'overdue' ? '🎉' : '📋'}
                </span>
                <p className="font-semibold text-gray-700">
                  {activeFilterTab === 'overdue'
                    ? 'No overdue fees! All payments are currently in good standing.'
                    : 'No fee records match the selected criteria.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="p-3.5 pl-5">Fee Description & Period</th>
                      <th className="p-3.5">Frequency</th>
                      <th className="p-3.5">Due Date</th>
                      <th className="p-3.5 text-right font-mono">Base Fee</th>
                      <th className="p-3.5 text-right font-mono">Late Fine</th>
                      <th className="p-3.5 text-right font-mono">Total Payable</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center pr-5">Details / Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredScheduleItems.map(item => {
                      const isOverdue = item.status === 'overdue';
                      const isPaid = item.status === 'paid';
                      const isDueSoon = item.status === 'due_soon';

                      return (
                        <tr
                          key={item.id}
                          className={`transition ${
                            isOverdue
                              ? 'bg-red-50/40 hover:bg-red-50/80'
                              : isPaid
                              ? 'bg-emerald-50/20 hover:bg-emerald-50/50'
                              : isDueSoon
                              ? 'bg-amber-50/30 hover:bg-amber-50/70'
                              : 'hover:bg-gray-50/80'
                          }`}
                        >
                          <td className="p-3.5 pl-5">
                            <span className="font-bold text-gray-900 block text-sm">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-gray-500 block font-mono">
                              {item.type === 'monthly' ? `Session Month: ${item.monthName}` : 'Mandatory School Fee'}
                            </span>
                          </td>

                          <td className="p-3.5 capitalize text-gray-700 font-medium">
                            {item.type === 'monthly' ? 'Monthly' : item.monthName}
                          </td>

                          <td className="p-3.5 text-gray-700 font-mono">
                            {item.dueDate ? formatDate(item.dueDate) : '-'}
                            {isOverdue && (
                              <span className="text-[10px] text-red-600 font-bold block">
                                {item.daysOverdue} days overdue
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-right font-mono font-medium text-gray-900">
                            {formatCurrency(item.baseAmount)}
                          </td>

                          <td className="p-3.5 text-right font-mono">
                            {item.lateFine > 0 ? (
                              <span className="text-red-600 font-bold">+{formatCurrency(item.lateFine)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-sm">
                            <span className={isPaid ? 'text-emerald-700' : isOverdue ? 'text-red-700' : 'text-gray-900'}>
                              {formatCurrency(item.totalPayable)}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            {getStatusBadge(item.status)}
                          </td>

                          <td className="p-3.5 text-center pr-5">
                            {isPaid && item.paidPayment ? (
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptModal(item.paidPayment)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-xs font-bold transition cursor-pointer"
                                title="View official payment receipt"
                              >
                                <span>🧾 Receipt</span>
                              </button>
                            ) : isOverdue ? (
                              <span className="text-[11px] font-bold text-red-600 bg-red-100/60 px-2.5 py-1 rounded-md border border-red-200 inline-block">
                                Pay at Office
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-medium">
                                Scheduled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

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
            className={`bg-white rounded-none md:rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 border border-gray-200 ${
              isDialogFullScreen
                ? 'w-full h-full fixed inset-0 m-0 rounded-none'
                : 'w-full max-w-4xl max-h-[92vh] mx-auto'
            }`}
          >
            {/* Modal Top Header Bar */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🧾</span>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      Official Fee Receipt & Breakdown
                    </h2>
                    <span className="bg-emerald-500/20 text-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                      Paid
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5 font-mono">
                    Receipt #{selectedPaymentForView.receipt_number || `RCP-${selectedPaymentForView.id}`} • Recorded on {formatDate(selectedPaymentForView.payment_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDialogFullScreen(!isDialogFullScreen)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                  title={isDialogFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isDialogFullScreen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 10V4m0 6H4m6 0L3 3m14 7V4m0 6h6m-6 0l7-7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    )}
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentForView(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                  title="Close Dialog"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Receipt Printable Container */}
              <div id="student-printable-receipt" className="bg-white border border-gray-300 rounded-xl p-6 shadow-sm space-y-6">
                {/* School Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                      {settings?.school_name || 'Delhi Public School'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {settings?.school_address || 'Knowledge Park, Institutional Area'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Contact: {settings?.school_phone || '+91 98765 43210'} • {settings?.school_email || 'accounts@schoolsms.edu'}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-emerald-300 mb-1">
                      Official Receipt
                    </div>
                    <div className="font-mono text-sm font-bold text-gray-900">
                      Receipt #: {selectedPaymentForView.receipt_number || `RCP-${selectedPaymentForView.id}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      Date: {formatDate(selectedPaymentForView.payment_date)}
                    </div>
                  </div>
                </div>

                {/* Student Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50/70 border border-gray-200 rounded-xl text-xs">
                  <div>
                    <span className="text-gray-500 block">Student Name:</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {currentStudent ? `${currentStudent.first_name} ${currentStudent.last_name}` : 'Enrolled Student'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Admission Number:</span>
                    <span className="font-bold text-gray-900 font-mono text-sm">
                      {currentStudent?.admission_number || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Class & Section:</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {currentStudent?.class?.name || (currentStudent?.class_id ? `Class ${currentStudent.class_id}` : '-')}
                      {currentStudent?.section?.name ? ` (${currentStudent.section.name})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Payment Mode:</span>
                    <span className="font-bold text-gray-900 capitalize text-sm">
                      {selectedPaymentForView.payment_method || 'Cash'}
                    </span>
                  </div>
                </div>

                {/* Items & Breakdown Table */}
                <table className="w-full text-left text-xs border border-gray-200">
                  <thead className="bg-gray-100 text-gray-700 font-semibold uppercase">
                    <tr>
                      <th className="p-3 border-b">Description</th>
                      <th className="p-3 text-right border-b font-mono">Base Fee</th>
                      <th className="p-3 text-right border-b font-mono">Discount</th>
                      <th className="p-3 text-right border-b font-mono">Late Fine</th>
                      <th className="p-3 text-right border-b font-mono">Total Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="p-3 font-medium text-gray-900">
                        {selectedPaymentForView.fee_structure?.name || 'School Fee Payment'}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-800">
                        {formatCurrency(selectedPaymentForView.amount)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-600">
                        {parseFloat(selectedPaymentForView.discount) > 0 ? `-${formatCurrency(selectedPaymentForView.discount)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono text-red-600">
                        {parseFloat(selectedPaymentForView.fine) > 0 ? `+${formatCurrency(selectedPaymentForView.fine)}` : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900 text-sm">
                        {formatCurrency(selectedPaymentForView.total_amount || selectedPaymentForView.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-bold">
                    <tr>
                      <td colSpan={4} className="p-3 text-right uppercase tracking-wider">
                        Total Amount Received:
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-extrabold text-base">
                        {formatCurrency(selectedPaymentForView.total_amount || selectedPaymentForView.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Amount in words */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  <span className="font-bold text-gray-700">Amount in Words:</span>{' '}
                  <span className="font-semibold text-gray-900 italic">
                    {numberToWords(parseFloat(selectedPaymentForView.total_amount || selectedPaymentForView.amount) || 0)}
                  </span>
                </div>

                {/* Remarks & Months Covered */}
                {selectedPaymentForView.remarks && (
                  <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs text-gray-800">
                    <span className="font-bold text-blue-900">Remarks / Coverage:</span>{' '}
                    <span>{selectedPaymentForView.remarks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-gray-500 font-mono">
                Receipt #{selectedPaymentForView.receipt_number || selectedPaymentForView.id}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForView(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFeesView;
