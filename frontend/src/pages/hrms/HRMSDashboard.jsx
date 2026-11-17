import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { hrmsAPI } from '../../services/api';

const DEPARTMENTS = [
  'All Departments',
  'Science & STEM',
  'Mathematics',
  'Languages & Literature',
  'Physical Education & Sports',
  'Administration',
  'Finance & Accounts',
  'IT & Facilities',
  'Library & Media',
  'Facility & Transport',
];

const LEAVE_TYPES = [
  'Casual Leave (CL)',
  'Sick / Medical Leave (SL)',
  'Earned Leave (EL)',
  'Duty Leave (DL)',
  'Maternity / Paternity Leave',
];

const numberToWords = (num) => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + ' ' : '';
  return str.trim() ? str.trim() + ' Rupees Only' : 'Zero Rupees';
};

export default function HRMSDashboard() {
  const { user, activeRole, hasPermission } = useAuth();
  const { activeSchoolId, currentSchool } = useSchool();
  const currentRole = activeRole || user?.roles?.[0] || user?.role || 'admin';
  const isTeacher = currentRole === 'teacher';
  const canManage = (hasPermission('manage-hrms') || currentRole === 'admin' || currentRole === 'super-admin' || currentRole === 'finance') && !isTeacher;

  // Navigation tab
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'leaves' | 'attendance' | 'payroll' | 'departments'

  // Data states
  const [staffList, setStaffList] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [payrollList, setPayrollList] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showBankAccount, setShowBankAccount] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all');
  const [payrollMonth, setPayrollMonth] = useState('11');
  const [payrollYear, setPayrollYear] = useState('2026');

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedCompensationStaff, setSelectedCompensationStaff] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Mask bank account number helper
  const maskAccount = (num) => {
    if (!num) return '•••• •••• 1024';
    if (showBankAccount) return num;
    const s = String(num);
    if (s.length <= 4) return s;
    return '•••• •••• ' + s.slice(-4);
  };

  // Compensation Form
  const [compensationForm, setCompensationForm] = useState({
    basicSalary: 50000,
    da: 10000,
    hra: 12500,
    conveyance: 3500,
    pf: 6000,
    esi: 0,
    tax: 2500,
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifsc: 'HDFC0001420',
  });

  const handleOpenCompensationModal = (staff) => {
    const basic = staff.basicSalary || 50000;
    const da = staff.allowances?.da !== undefined ? staff.allowances.da : Math.round(basic * 0.20);
    const hra = staff.allowances?.hra !== undefined ? staff.allowances.hra : Math.round(basic * 0.25);
    const conveyance = staff.allowances?.conveyance !== undefined ? staff.allowances.conveyance : 3500;
    const pf = staff.deductions?.pf !== undefined ? staff.deductions.pf : Math.round(basic * 0.12);
    const esi = staff.deductions?.esi !== undefined ? staff.deductions.esi : 0;
    const tax = staff.deductions?.tax !== undefined ? staff.deductions.tax : 2500;

    setSelectedCompensationStaff(staff);
    setCompensationForm({
      basicSalary: basic,
      da,
      hra,
      conveyance,
      pf,
      esi,
      tax,
      bankName: staff.bankDetails?.bankName || 'HDFC Bank',
      accountNumber: staff.bankDetails?.accountNumber || '',
      ifsc: staff.bankDetails?.ifsc || 'HDFC0001420',
    });
  };

  const handleAutoCalculateRates = (basicAmount) => {
    const basic = parseFloat(basicAmount) || 0;
    const da = Math.round(basic * 0.20);
    const hra = Math.round(basic * 0.25);
    const conveyance = 3500;
    const gross = basic + da + hra + conveyance;
    const pf = Math.round(basic * 0.12);
    const esi = basic < 50000 ? Math.round(gross * 0.0075) : 0;
    const tax = basic > 60000 ? 4500 : (basic > 50000 ? 2800 : 1800);

    setCompensationForm((prev) => ({
      ...prev,
      basicSalary: basic,
      da,
      hra,
      conveyance,
      pf,
      esi,
      tax,
    }));
  };

  const handleSaveCompensation = async (e) => {
    e.preventDefault();
    if (!selectedCompensationStaff) return;
    try {
      await hrmsAPI.updateCompensation(selectedCompensationStaff.id, {
        basicSalary: compensationForm.basicSalary,
        allowances: {
          da: compensationForm.da,
          hra: compensationForm.hra,
          conveyance: compensationForm.conveyance,
        },
        deductions: {
          pf: compensationForm.pf,
          esi: compensationForm.esi,
          tax: compensationForm.tax,
        },
        bankDetails: {
          bankName: compensationForm.bankName,
          accountNumber: compensationForm.accountNumber,
          ifsc: compensationForm.ifsc,
        },
      });

      showToast(`Salary structure & compensation updated for ${selectedCompensationStaff.name}.`);
      setSelectedCompensationStaff(null);
      loadStaff();
      loadPayroll();
    } catch (err) {
      console.error(err);
      alert('Failed to update compensation.');
    }
  };

  // Staff Form
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Science & STEM',
    designation: '',
    role: 'teacher',
    qualification: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'Full-Time',
    basicSalary: 50000,
    shift: 'General (08:00 AM - 03:30 PM)',
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifsc: 'HDFC0001420',
  });

  // Leave Form
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Casual Leave (CL)',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    daysCount: 1,
    reason: '',
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Loaders
  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await hrmsAPI.getStaff({
        department: selectedDept === 'All Departments' ? undefined : selectedDept,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search,
        school_id: activeSchoolId,
      });
      if (res && res.success) {
        setStaffList(res.data || []);
      }
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaves = async () => {
    try {
      const res = await hrmsAPI.getLeaves({
        status: leaveStatusFilter === 'all' ? undefined : leaveStatusFilter,
        school_id: activeSchoolId,
      });
      if (res && res.success) {
        setLeavesList(res.data || []);
      }
    } catch (err) {
      console.error('Error loading leaves:', err);
    }
  };

  const loadAttendance = async (dateStr) => {
    try {
      const res = await hrmsAPI.getDailyAttendance(dateStr, { school_id: activeSchoolId });
      if (res && res.success) {
        setAttendanceData(res.data || []);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  };

  const loadPayroll = async () => {
    try {
      const res = await hrmsAPI.getPayroll({
        month: payrollMonth,
        year: payrollYear,
        school_id: activeSchoolId,
      });
      if (res && res.success) {
        setPayrollList(res.data || []);
      }
    } catch (err) {
      console.error('Error loading payroll:', err);
    }
  };

  useEffect(() => {
    loadStaff();
    loadLeaves();
    loadAttendance(attendanceDate);
    loadPayroll();

    const handleHrmsUpdated = () => {
      loadStaff();
      loadLeaves();
      loadAttendance(attendanceDate);
      loadPayroll();
    };

    window.addEventListener('sms:hrms-updated', handleHrmsUpdated);
    window.addEventListener('sms:school-switched', handleHrmsUpdated);
    window.addEventListener('sms:role-switched', handleHrmsUpdated);
    return () => {
      window.removeEventListener('sms:hrms-updated', handleHrmsUpdated);
      window.removeEventListener('sms:school-switched', handleHrmsUpdated);
      window.removeEventListener('sms:role-switched', handleHrmsUpdated);
    };
  }, [activeSchoolId, currentRole, activeRole, selectedDept, selectedStatus, search, leaveStatusFilter, payrollMonth, payrollYear, attendanceDate]);

  // Handle Add Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      alert('Please provide name and email address.');
      return;
    }
    try {
      await hrmsAPI.createStaff({
        ...staffForm,
        school_id: activeSchoolId === 'all' ? 1 : activeSchoolId,
      });
      showToast(`Staff member ${staffForm.name} onboarded successfully.`);
      setShowAddStaffModal(false);
      setStaffForm({
        name: '',
        email: '',
        phone: '',
        department: 'Science & STEM',
        designation: '',
        role: 'teacher',
        qualification: '',
        joiningDate: new Date().toISOString().split('T')[0],
        employmentType: 'Full-Time',
        basicSalary: 50000,
        shift: 'General (08:00 AM - 03:30 PM)',
        bankName: 'HDFC Bank',
        accountNumber: '',
        ifsc: 'HDFC0001420',
      });
      loadStaff();
    } catch (err) {
      console.error(err);
      alert('Failed to onboard staff.');
    }
  };

  // Handle Apply Leave
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      alert('Please specify the reason for leave.');
      return;
    }
    try {
      const targetEmpId = isTeacher ? (myStaff?.id || 'EMP-101') : (leaveForm.employeeId || staffList[0]?.id);
      await hrmsAPI.applyLeave({
        ...leaveForm,
        employeeId: targetEmpId,
        school_id: activeSchoolId === 'all' ? 1 : activeSchoolId,
      });
      showToast('Leave application submitted for approval.');
      setShowLeaveModal(false);
      setLeaveForm({
        employeeId: '',
        leaveType: 'Casual Leave (CL)',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        daysCount: 1,
        reason: '',
      });
      loadLeaves();
    } catch (err) {
      console.error(err);
      alert('Failed to submit leave.');
    }
  };

  // Leave Approval Action
  const handleReviewLeave = async (leaveId, status) => {
    const reviewerNotes = status === 'approved' ? 'Approved by Academic Council' : 'Not feasible due to exam invigilation schedule';
    try {
      await hrmsAPI.updateLeaveStatus(leaveId, {
        status,
        reviewedBy: user?.name || 'Administrator',
        reviewNotes: reviewerNotes,
      });
      showToast(`Leave application marked as ${status}.`);
      loadLeaves();
    } catch (err) {
      console.error(err);
    }
  };

  // Attendance Toggle
  const handleAttendanceChange = (empId, newStatus) => {
    setAttendanceData((prev) =>
      prev.map((item) =>
        item.employeeId === empId
          ? {
              ...item,
              status: newStatus,
              checkIn: newStatus === 'absent' || newStatus === 'on-leave' ? '-' : (item.checkIn === '-' ? '08:00 AM' : item.checkIn),
              checkOut: newStatus === 'absent' || newStatus === 'on-leave' ? '-' : (item.checkOut === '-' ? '03:30 PM' : item.checkOut),
            }
          : item
      )
    );
  };

  const handleSaveAttendance = async () => {
    try {
      await hrmsAPI.saveDailyAttendance(attendanceDate, attendanceData);
      showToast(`Staff attendance for ${attendanceDate} saved successfully.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllPresent = () => {
    setAttendanceData((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'present',
        checkIn: item.checkIn === '-' ? '07:55 AM' : item.checkIn,
        checkOut: '03:30 PM',
      }))
    );
    showToast('All staff marked Present for today.');
  };

  // Payroll Action
  const handleDisbursePayroll = async (payrollId) => {
    try {
      await hrmsAPI.updatePayrollStatus(payrollId, 'paid');
      showToast('Salary payment disbursed and recorded.');
      loadPayroll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all HRMS records (staff, leaves, payroll) to demo defaults?')) {
      await hrmsAPI.resetDefaults();
      showToast('HRMS system reset to standard school demo data.');
      loadStaff();
      loadLeaves();
      loadAttendance(attendanceDate);
      loadPayroll();
    }
  };

  // Staff resolution for personalized views
  const myStaff = staffList.find(
    (s) =>
      (s.email && user?.email && s.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
      (user?.teacher_id && s.id === user.teacher_id) ||
      (user?.id && s.userId === user.id)
  ) || staffList[0] || null;

  const myAttendanceRecord = attendanceData.find(
    (a) => a.employeeId === myStaff?.id || (myStaff && a.employeeName === myStaff.name)
  ) || attendanceData[0] || null;

  const myPayrollRecord = payrollList.find(
    (p) => p.employeeId === myStaff?.id || (myStaff && p.employeeName === myStaff.name)
  ) || payrollList[0] || null;

  // Personal faculty compensation figures
  const staffBasic = myStaff?.basicSalary || 50000;
  const staffDA = myStaff?.allowances?.da !== undefined ? myStaff.allowances.da : Math.round(staffBasic * 0.20);
  const staffHRA = myStaff?.allowances?.hra !== undefined ? myStaff.allowances.hra : Math.round(staffBasic * 0.25);
  const staffConveyance = myStaff?.allowances?.conveyance !== undefined ? myStaff.allowances.conveyance : 3500;
  const staffGross = staffBasic + staffDA + staffHRA + staffConveyance;
  const staffPF = myStaff?.deductions?.pf !== undefined ? myStaff.deductions.pf : Math.round(staffBasic * 0.12);
  const staffESI = myStaff?.deductions?.esi !== undefined ? myStaff.deductions.esi : 0;
  const staffTax = myStaff?.deductions?.tax !== undefined ? myStaff.deductions.tax : 2500;
  const staffTotalDeductions = staffPF + staffESI + staffTax;
  const staffNetPay = staffGross - staffTotalDeductions;

  // Institutional Metrics (for administrators)
  const totalStaff = staffList.length;
  const presentCount = attendanceData.filter((a) => a.status === 'present').length;
  const attendanceRate = attendanceData.length > 0 ? Math.round((presentCount / attendanceData.length) * 100) : 95;
  const pendingLeaves = leavesList.filter((l) => l.status === 'pending').length;
  const totalPayrollAmount = payrollList.reduce((acc, p) => acc + (p.netSalary || 0), 0);

  return (
    <div className="px-[15px] py-6 w-full space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700"
        >
          <span>ℹ️</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl">{isTeacher ? '👨‍🏫' : '👔'}</span>
            <h1 className="text-2xl font-black tracking-tight">
              {isTeacher ? 'Faculty Self-Service Portal (HRMS)' : 'Human Resource Management System (HRMS)'}
            </h1>
            {currentSchool && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs flex items-center gap-1.5 shadow-xs">
                <span>📍</span>
                <span>{currentSchool.shortName || currentSchool.name}</span>
              </span>
            )}
            {isTeacher && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 shadow-xs">
                <span>🔒</span>
                <span>Personal & Confidential View</span>
              </span>
            )}
          </div>
          <p className="text-sm text-blue-200">
            {isTeacher
              ? 'Personal faculty employment profile, 7th Pay Commission salary breakdown, leave requests, daily attendance, and monthly payslips.'
              : 'Faculty & staff directory, leave administration, daily staff attendance, payroll register, and payslips.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManage && (
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition flex items-center space-x-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
            >
              <span>➕</span>
              <span>Onboard Staff</span>
            </button>
          )}

          <button
            onClick={() => {
              if (isTeacher && myStaff) {
                setLeaveForm((prev) => ({ ...prev, employeeId: myStaff.id }));
              }
              setShowLeaveModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition flex items-center space-x-1.5"
          >
            <span>📝</span>
            <span>Apply for Leave</span>
          </button>

          {!isTeacher && (
            <button
              onClick={handleResetDefaults}
              className="bg-white/10 hover:bg-white/20 text-blue-200 text-xs font-medium px-3 py-2 rounded-xl backdrop-blur-xs transition"
              title="Reset HRMS demo data"
            >
              🔄 Reset Demo Data
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      {isTeacher ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center text-xl text-blue-700 flex-shrink-0">
              👤
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Faculty ID</p>
              <p className="text-lg font-black text-gray-900 truncate">{myStaff?.id || 'EMP-101'}</p>
              <p className="text-[11px] text-gray-400 truncate">{myStaff?.designation || 'Faculty Member'}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-emerald-100 rounded-lg flex items-center justify-center text-xl text-emerald-700 flex-shrink-0">
              🕒
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Attendance</p>
              <p className="text-lg font-black text-emerald-700 capitalize">
                {myAttendanceRecord?.status || 'Present'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                In: {myAttendanceRecord?.checkIn || '07:55 AM'} ({myStaff?.shift ? 'General' : 'General Shift'})
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-amber-100 rounded-lg flex items-center justify-center text-xl text-amber-700 flex-shrink-0">
              📝
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Leave Balance</p>
              <p className="text-lg font-black text-amber-600">
                {myStaff?.leaveBalance?.casual?.remaining ?? 8} CL Remaining
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                {myStaff?.leaveBalance?.medical?.remaining ?? 5} SL • {myStaff?.leaveBalance?.earned?.remaining ?? 10} EL Available
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center text-xl text-purple-700 flex-shrink-0">
              💵
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Take-Home</p>
              <p className="text-lg font-black text-purple-700">
                ₹{(myPayrollRecord?.netSalary || staffNetPay).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-gray-400 truncate">
                Disbursed to {myStaff?.bankDetails?.bankName || 'HDFC Bank'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center text-xl text-blue-700 flex-shrink-0">
              👥
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Headcount</p>
              <p className="text-xl font-black text-gray-900">{totalStaff} Staff</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-emerald-100 rounded-lg flex items-center justify-center text-xl text-emerald-700 flex-shrink-0">
              🕒
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Attendance</p>
              <p className="text-xl font-black text-emerald-700">{attendanceRate}% Present</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-amber-100 rounded-lg flex items-center justify-center text-xl text-amber-700 flex-shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Leaves</p>
              <p className="text-xl font-black text-amber-600">{pendingLeaves} Requests</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
            <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center text-xl text-purple-700 flex-shrink-0">
              💵
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Payroll</p>
              <p className="text-xl font-black text-purple-700">₹{(totalPayrollAmount / 100000).toFixed(2)} Lakhs</p>
            </div>
          </div>
        </div>
      )}

      {/* Module Tabs Header */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-1.5 text-xs font-bold">
        {(isTeacher
          ? [
              { id: 'directory', label: 'My Profile & Compensation', icon: '👤' },
              { id: 'leaves', label: `My Leaves (${leavesList.length})`, icon: '📝' },
              { id: 'attendance', label: 'My Attendance Logs', icon: '🕒' },
              { id: 'payroll', label: 'My Salary Slips', icon: '💵' },
              { id: 'departments', label: 'Department Org Structure', icon: '🏢' },
            ]
          : [
              { id: 'directory', label: 'Faculty & Staff Directory', icon: '👥' },
              { id: 'leaves', label: `Leave Management (${pendingLeaves})`, icon: '📝' },
              { id: 'attendance', label: 'Staff Attendance Register', icon: '🕒' },
              { id: 'payroll', label: 'Payroll & Salary Slips', icon: '💵' },
              { id: 'departments', label: 'Department Org Structure', icon: '🏢' },
            ]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: FACULTY & STAFF DIRECTORY (ADMIN) / MY PROFILE & COMPENSATION (TEACHER) */}
      {activeTab === 'directory' && (
        isTeacher ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Faculty Employment Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-xs rounded-2xl flex items-center justify-center text-3xl font-black border border-white/30 shadow-inner">
                    {myStaff?.name?.charAt(0) || '👨‍🏫'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-black">{myStaff?.name || user?.name || 'Faculty Member'}</h2>
                      <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold border border-white/30">
                        {myStaff?.id || 'EMP-101'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-200 font-medium mt-0.5">
                      {myStaff?.designation || 'Teacher'} • {myStaff?.department || 'Academics'}
                    </p>
                    <p className="text-[11px] text-blue-300 mt-1 flex items-center space-x-3">
                      <span>📧 {myStaff?.email || user?.email}</span>
                      <span>📞 {myStaff?.phone || '+91 98765 00000'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (myPayrollRecord) setSelectedPayslip(myPayrollRecord);
                      else if (payrollList.length > 0) setSelectedPayslip(payrollList[0]);
                      else showToast('Payslip generation in progress.');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    <span>📄</span>
                    <span>View Latest Payslip</span>
                  </button>
                  <button
                    onClick={() => {
                      setLeaveForm((prev) => ({ ...prev, employeeId: myStaff?.id || 'EMP-101' }));
                      setShowLeaveModal(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs px-4 py-2 rounded-xl border border-white/30 transition flex items-center space-x-1.5"
                  >
                    <span>📝</span>
                    <span>Apply for Leave</span>
                  </button>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50/50 border-b border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-semibold block text-[11px]">Employment Type</span>
                  <strong className="text-gray-800 text-sm">{myStaff?.employmentType || 'Full-Time Permanent'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[11px]">Academic Qualification</span>
                  <strong className="text-gray-800 text-sm">{myStaff?.qualification || 'M.Sc, B.Ed'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[11px]">Joining Date</span>
                  <strong className="text-gray-800 text-sm">{myStaff?.joiningDate || '2023-06-15'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold block text-[11px]">Work Shift</span>
                  <strong className="text-gray-800 text-sm">{myStaff?.shift || 'General (08:00 AM - 03:30 PM)'}</strong>
                </div>
              </div>

              {/* Annual Leave Entitlement Summary */}
              <div className="p-6 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <span>🗓️</span>
                    <span>Annual Leave Entitlement (Academic Year 2026-2027)</span>
                  </h4>
                  <span className="text-[11px] text-gray-500">Subject to School Leave Rules</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-900">Casual Leave (CL)</p>
                    <p className="text-xl font-black text-emerald-700 my-0.5">
                      {myStaff?.leaveBalance?.casual?.remaining ?? 8}{' '}
                      <span className="text-xs font-normal text-emerald-600">/ {myStaff?.leaveBalance?.casual?.total ?? 12} days</span>
                    </p>
                    <p className="text-[10px] text-emerald-600">Short notice & emergency leave</p>
                  </div>
                  <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-900">Medical / Sick Leave (SL)</p>
                    <p className="text-xl font-black text-blue-700 my-0.5">
                      {myStaff?.leaveBalance?.medical?.remaining ?? 5}{' '}
                      <span className="text-xs font-normal text-blue-600">/ {myStaff?.leaveBalance?.medical?.total ?? 8} days</span>
                    </p>
                    <p className="text-[10px] text-blue-600">Doctor certificate required &gt; 2 days</p>
                  </div>
                  <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-purple-900">Earned Leave (EL)</p>
                    <p className="text-xl font-black text-purple-700 my-0.5">
                      {myStaff?.leaveBalance?.earned?.remaining ?? 10}{' '}
                      <span className="text-xs font-normal text-purple-600">/ {myStaff?.leaveBalance?.earned?.total ?? 15} days</span>
                    </p>
                    <p className="text-[10px] text-purple-600">Annual cumulative earned leave</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Indian 7th Pay Commission Salary Structure Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                <div>
                  <h3 className="text-sm font-black text-gray-900 flex items-center space-x-2">
                    <span>💵</span>
                    <span>My Salary Structure & Allowances Breakdown</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Structured as per Indian 7th Central Pay Commission guidelines and CBSE institutional norms.
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full self-start sm:self-auto">
                  ✓ Active & Verified Pay Band
                </span>
              </div>

              {/* 3-Column Compensation Table */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Column 1: Earnings & Allowances */}
                <div className="bg-emerald-50/40 rounded-xl border border-emerald-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center space-x-1">
                      <span>🟢</span>
                      <span>Earnings (Allowances)</span>
                    </h4>
                    <span className="text-[11px] font-bold text-emerald-700">Monthly</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Monthly Pay:</span>
                      <strong className="text-gray-900">₹{staffBasic.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dearness Allowance (DA 20%):</span>
                      <strong className="text-gray-900">₹{staffDA.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">House Rent Allowance (HRA 25%):</span>
                      <strong className="text-gray-900">₹{staffHRA.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Conveyance Allowance:</span>
                      <strong className="text-gray-900">₹{staffConveyance.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="pt-2 border-t border-emerald-200 flex justify-between font-bold text-emerald-900 text-sm">
                      <span>Gross Salary:</span>
                      <span>₹{staffGross.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Deductions */}
                <div className="bg-rose-50/40 rounded-xl border border-rose-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                    <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center space-x-1">
                      <span>🔴</span>
                      <span>Statutory Deductions</span>
                    </h4>
                    <span className="text-[11px] font-bold text-rose-700">Monthly</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provident Fund (EPF 12%):</span>
                      <strong className="text-rose-700">-₹{staffPF.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ESI Health Contribution:</span>
                      <strong className="text-rose-700">-₹{staffESI.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Professional Tax & TDS:</span>
                      <strong className="text-rose-700">-₹{staffTax.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="pt-2 border-t border-rose-200 flex justify-between font-bold text-rose-900 text-sm">
                      <span>Total Deductions:</span>
                      <span>-₹{staffTotalDeductions.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Net Take-Home & Bank Details */}
                <div className="bg-blue-50/40 rounded-xl border border-blue-200 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                      <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center space-x-1">
                        <span>🏦</span>
                        <span>Net Take-Home Pay</span>
                      </h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Disbursal</span>
                    </div>
                    <div className="pt-3 space-y-1">
                      <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Net Monthly Take-Home</p>
                      <p className="text-2xl font-black text-blue-900">
                        ₹{staffNetPay.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-gray-500 italic leading-snug">
                        {numberToWords(staffNetPay)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Disbursal Bank:</span>
                      <strong className="text-gray-800">{myStaff?.bankDetails?.bankName || 'HDFC Bank'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Account No:</span>
                      <div className="flex items-center space-x-1.5">
                        <strong className="text-gray-800 font-mono text-[11px]">
                          {maskAccount(myStaff?.bankDetails?.accountNumber)}
                        </strong>
                        <button
                          type="button"
                          onClick={() => setShowBankAccount(!showBankAccount)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold px-1 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition"
                          title={showBankAccount ? 'Hide Account Number' : 'Show Account Number'}
                        >
                          {showBankAccount ? '🙈 Hide' : '👁️ Show'}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IFSC Code:</span>
                      <strong className="text-gray-800 font-mono text-[11px]">{myStaff?.bankDetails?.ifsc || 'HDFC0001420'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Footer Notice */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center space-x-1.5">
                  <span>🔒</span>
                  <span>This compensation schedule is strictly confidential and protected under organizational data privacy policy.</span>
                </span>
                <span className="text-[11px] text-gray-400">School ID: {currentSchool?.shortName || activeSchoolId}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff by name, emp id, designation..."
                  className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="on-leave">On Leave</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((staff) => (
                <div
                  key={staff.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-indigo-700 text-white rounded-xl flex items-center justify-center font-bold text-base shadow-xs">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 leading-tight">
                            {staff.name}
                          </h3>
                          <p className="text-[11px] text-gray-500 font-medium">
                            {staff.designation}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                        {staff.id}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <p className="flex justify-between">
                        <span className="text-gray-400">Department:</span>
                        <strong className="text-gray-800">{staff.department}</strong>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">Qualification:</span>
                        <span className="text-gray-700 truncate max-w-[170px]" title={staff.qualification}>
                          {staff.qualification}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">Joining Date:</span>
                        <span className="text-gray-700">{staff.joiningDate}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-400">Shift:</span>
                        <span className="text-gray-700 truncate max-w-[180px]">{staff.shift}</span>
                      </p>
                    </div>

                    {/* Leave Balances Chips */}
                    <div className="flex items-center justify-between text-[11px] px-1 pt-1">
                      <span className="text-gray-500">Leaves Left:</span>
                      <div className="flex space-x-1.5">
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-100 font-semibold" title="Casual Leaves Remaining">
                          CL: {staff.leaveBalance?.casual?.remaining}
                        </span>
                        <span className="bg-blue-50 text-blue-800 px-1.5 py-0.2 rounded border border-blue-100 font-semibold" title="Medical Leaves Remaining">
                          SL: {staff.leaveBalance?.medical?.remaining}
                        </span>
                        <span className="bg-purple-50 text-purple-800 px-1.5 py-0.2 rounded border border-purple-100 font-semibold" title="Earned Leaves Remaining">
                          EL: {staff.leaveBalance?.earned?.remaining}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700">
                      Basic: ₹{staff.basicSalary?.toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedStaffDetail(staff)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-2 py-1.5 rounded-lg transition"
                      >
                        Profile
                      </button>
                      {canManage && (
                        <button
                          onClick={() => handleOpenCompensationModal(staff)}
                          className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2 py-1.5 rounded-lg border border-emerald-200 transition flex items-center space-x-1"
                          title="Manage Basic Pay, DA, HRA, and Deductions"
                        >
                          <span>💰</span>
                          <span>Salary & Pay</span>
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => {
                            const userPayslip = payrollList.find(p => p.employeeId === staff.id);
                            if (userPayslip) setSelectedPayslip(userPayslip);
                            else showToast('No payroll generated for this member yet.');
                          }}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2 py-1.5 rounded-lg border border-blue-200 transition"
                        >
                          Payslip
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* TAB 2: LEAVE MANAGEMENT & APPROVAL WORKFLOW (ADMIN) / MY LEAVES (TEACHER) */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center space-x-2 text-xs font-medium text-gray-600">
              <span className="font-bold text-gray-500">{isTeacher ? 'Filter My Leaves:' : 'Filter Status:'}</span>
              {['all', 'pending', 'approved', 'rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setLeaveStatusFilter(st)}
                  className={`capitalize px-3 py-1.5 rounded-lg border transition ${
                    leaveStatusFilter === st
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (isTeacher && myStaff) {
                  setLeaveForm((prev) => ({ ...prev, employeeId: myStaff.id }));
                }
                setShowLeaveModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center space-x-1"
            >
              <span>➕</span>
              <span>Submit Leave Request</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 divide-y divide-gray-200">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">{isTeacher ? 'Employee' : 'Applicant & Dept'}</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Duration & Dates</th>
                    <th className="px-4 py-3">Reason / Justification</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">{isTeacher ? 'Approval Info' : 'Actions / Workflow'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {leavesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        {isTeacher ? 'You have no leave records matching this filter.' : 'No leave records found matching filter.'}
                      </td>
                    </tr>
                  ) : (
                    leavesList.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-50/60 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-gray-900">{leave.employeeName}</p>
                          <p className="text-[11px] text-gray-400">{leave.department}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                            {leave.leaveType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">
                            {leave.startDate} to {leave.endDate}
                          </p>
                          <p className="text-[11px] text-blue-600 font-medium">
                            {leave.daysCount} day{leave.daysCount > 1 ? 's' : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="line-clamp-2 text-gray-700">{leave.reason}</p>
                          {leave.reviewNotes && (
                            <p className="text-[11px] text-gray-400 mt-0.5 italic">
                              Remarks: {leave.reviewNotes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              leave.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : leave.status === 'rejected'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canManage && leave.status === 'pending' ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleReviewLeave(leave.id, 'approved')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-xs transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewLeave(leave.id, 'rejected')}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-lg text-xs border border-rose-200 transition"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              {leave.reviewedBy ? `Reviewed by ${leave.reviewedBy}` : leave.status === 'pending' ? 'Pending Approval' : 'Completed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF DAILY ATTENDANCE REGISTER (ADMIN) / MY ATTENDANCE LOGS (TEACHER) */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-gray-600">Attendance Date:</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg p-2 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {canManage && (
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleMarkAllPresent}
                  className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-2 rounded-xl border border-emerald-200 transition"
                >
                  ✓ Mark All Present
                </button>
                <button
                  onClick={handleSaveAttendance}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs transition"
                >
                  Save Daily Register
                </button>
              </div>
            )}
            {isTeacher && (
              <div className="text-xs font-medium text-gray-500 flex items-center space-x-1.5">
                <span>📍</span>
                <span>Campus Biometric Register: <strong>{currentSchool?.shortName || currentSchool?.name || 'Main Campus'}</strong></span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 divide-y divide-gray-200">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Staff Name & ID</th>
                    <th className="px-4 py-3">Department & Designation</th>
                    <th className="px-4 py-3">Shift Timing</th>
                    <th className="px-4 py-3">Check-In / Out</th>
                    <th className="px-4 py-3 text-center">{isTeacher ? 'My Status' : 'Status Toggle'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {attendanceData.map((record) => (
                    <tr key={record.employeeId} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{record.employeeName}</p>
                        <p className="text-[10px] text-gray-400">{record.employeeId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{record.department}</p>
                        <p className="text-[11px] text-gray-500">{record.designation}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{record.shift}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">{record.checkIn}</span> -{' '}
                        <span className="font-medium text-gray-800">{record.checkOut}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isTeacher ? (
                          <span
                            className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold capitalize ${
                              record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : record.status === 'late'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : record.status === 'on-leave'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            <span>✓</span>
                            <span>{record.status}</span>
                          </span>
                        ) : (
                          <div className="inline-flex bg-gray-100 p-0.5 rounded-lg text-[11px]">
                            {['present', 'late', 'absent', 'on-leave'].map((st) => (
                              <button
                                key={st}
                                disabled={!canManage}
                                onClick={() => handleAttendanceChange(record.employeeId, st)}
                                className={`px-2.5 py-1 rounded-md capitalize font-semibold transition ${
                                  record.status === st
                                    ? st === 'present'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : st === 'late'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : st === 'absent'
                                      ? 'bg-red-600 text-white shadow-2xs'
                                      : 'bg-blue-600 text-white shadow-2xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                } ${!canManage ? 'cursor-default opacity-80' : ''}`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAYROLL & SALARY SLIPS (ADMIN) / MY SALARY SLIPS (TEACHER) */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-gray-600">Payroll Period:</span>
              <select
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg p-2 font-bold text-gray-800"
              >
                <option value="10">October 2026</option>
                <option value="11">November 2026</option>
                <option value="12">December 2026</option>
              </select>
              <select
                value={payrollYear}
                onChange={(e) => setPayrollYear(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg p-2 font-bold text-gray-800"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            <div className="text-xs text-gray-500 font-semibold">
              {isTeacher
                ? `Showing your personal payslip records for ${payrollMonth}/${payrollYear}`
                : `Showing ${payrollList.length} staff compensation records`}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 divide-y divide-gray-200">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Employee & ID</th>
                    <th className="px-4 py-3">Basic Pay</th>
                    <th className="px-4 py-3">DA + HRA + Allowances</th>
                    <th className="px-4 py-3">Gross Salary</th>
                    <th className="px-4 py-3">Deductions (PF+Tax)</th>
                    <th className="px-4 py-3">Net Take-Home</th>
                    <th className="px-4 py-3">Disbursement</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {payrollList.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900">{p.employeeName}</p>
                        <p className="text-[10px] text-gray-400">{p.employeeId} • {p.department}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        ₹{p.basicPay?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        ₹{(p.da + p.hra + p.conveyance)?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-700">
                        ₹{p.grossSalary?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-rose-600 font-medium">
                        -₹{p.totalDeductions?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 font-black text-emerald-700 text-sm">
                        ₹{p.netSalary?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedPayslip(p)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded-lg text-xs shadow-xs transition flex items-center space-x-1"
                          >
                            <span>📄</span>
                            <span>Payslip</span>
                          </button>
                          {canManage && (
                            <button
                              onClick={() => {
                                const targetStaff = staffList.find(s => s.id === p.employeeId);
                                if (targetStaff) handleOpenCompensationModal(targetStaff);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-lg text-xs border border-emerald-200 transition"
                              title="Edit Basic, DA, HRA, PF & Deductions"
                            >
                              ⚙️ Salary
                            </button>
                          )}
                          {canManage && p.status !== 'paid' && (
                            <button
                              onClick={() => handleDisbursePayroll(p.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs shadow-xs transition"
                            >
                              Disburse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DEPARTMENTS & FACULTY STRUCTURE */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Science & STEM', hod: 'Rajesh Kumar', count: 8, budget: '₹4.8L/mo', icon: '🔬', desc: 'Physics, Chemistry, Biology, and Advanced Robotics Labs.' },
            { name: 'Mathematics', hod: 'Vikram Malhotra', count: 6, budget: '₹3.6L/mo', icon: '📐', desc: 'Junior & Senior Mathematics, Olympiad Training Cell.' },
            { name: 'Languages & Literature', hod: 'Anjali Gupta', count: 7, budget: '₹3.9L/mo', icon: '📚', desc: 'English, Hindi, Sanskrit, and Foreign Languages.' },
            { name: 'Physical Education & Sports', hod: 'Amit Patel', count: 4, budget: '₹2.1L/mo', icon: '🏃', desc: 'Athletics, Basketball, Swimming, and Yoga.' },
            { name: 'Administration', hod: 'Dr. Sunita Rao', count: 5, budget: '₹3.8L/mo', icon: '🏛️', desc: 'Principal office, admissions, compliance, and institutional records.' },
            { name: 'Finance & Accounts', hod: 'Meenakshi Sundaram', count: 3, budget: '₹1.9L/mo', icon: '💳', desc: 'Fee collection, payroll disbursement, audit, and budgeting.' },
            { name: 'IT & Facilities', hod: 'Rohan Kulkarni', count: 4, budget: '₹2.2L/mo', icon: '💻', desc: 'Campus networking, server room, smart classrooms, biometric units.' },
            { name: 'Library & Media', hod: 'Kavita Deshmukh', count: 3, budget: '₹1.4L/mo', icon: '📖', desc: 'Central digital repository, book loans, reading halls.' },
            { name: 'Facility & Transport', hod: 'Baldev Singh', count: 8, budget: '₹3.2L/mo', icon: '🚌', desc: '14 School buses, safety escorts, campus security, and upkeep.' },
          ].map((d) => (
            <div key={d.name} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center text-2xl border border-blue-100 flex-shrink-0">
                  {d.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">{d.name}</h3>
                  <p className="text-xs text-gray-500">HOD: <strong className="text-gray-700">{d.hod}</strong></p>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{d.desc}</p>

              <div className="pt-2 border-t border-gray-100 flex justify-between text-xs font-semibold">
                <span className="text-gray-500">Faculty Count: <strong className="text-gray-800">{d.count} Members</strong></span>
                {!isTeacher && <span className="text-emerald-700">{d.budget}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ONBOARD STAFF MODAL */}
      {showAddStaffModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboard-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddStaffModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <span className="text-xl">👔</span>
                <h2 id="onboard-modal-title" className="text-base font-bold">
                  Onboard Faculty or Staff Member
                </h2>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="e.g. Dr. Ramesh Chander"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="e.g. ramesh.c@school.com"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {DEPARTMENTS.filter(d => d !== 'All Departments').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    value={staffForm.designation}
                    onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
                    placeholder="e.g. TGT Chemistry & Lab Head"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Basic Monthly Pay (₹)</label>
                  <input
                    type="number"
                    value={staffForm.basicSalary}
                    onChange={(e) => setStaffForm({ ...staffForm, basicSalary: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={staffForm.joiningDate}
                    onChange={(e) => setStaffForm({ ...staffForm, joiningDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={staffForm.qualification}
                    onChange={(e) => setStaffForm({ ...staffForm, qualification: e.target.value })}
                    placeholder="e.g. M.Sc, B.Ed"
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={staffForm.employmentType}
                    onChange={(e) => setStaffForm({ ...staffForm, employmentType: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Full-Time">Full-Time Permanent</option>
                    <option value="Part-Time">Part-Time Faculty</option>
                    <option value="Probation">Probationary (1 Year)</option>
                    <option value="Contract">Fixed Term Contract</option>
                  </select>
                </div>
              </div>

              {/* Bank Account Details */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>🏦</span>
                  <span>Bank Account Details (For Salary & Direct Disbursal)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.bankName}
                      onChange={(e) => setStaffForm({ ...staffForm, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.accountNumber}
                      onChange={(e) => setStaffForm({ ...staffForm, accountNumber: e.target.value })}
                      placeholder="e.g. 5010048291024"
                      className="w-full text-xs font-mono border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      IFSC Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.ifsc}
                      onChange={(e) => setStaffForm({ ...staffForm, ifsc: e.target.value.toUpperCase() })}
                      placeholder="e.g. HDFC0001420"
                      className="w-full text-xs font-mono uppercase border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition"
                >
                  Confirm & Onboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLY LEAVE MODAL */}
      {showLeaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowLeaveModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📝</span>
                <h2 id="leave-modal-title" className="text-base font-bold">
                  Submit Staff Leave Application
                </h2>
              </div>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Applying Staff Member</label>
                {isTeacher ? (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-2.5 text-xs font-bold text-gray-800 flex items-center justify-between">
                    <span>{myStaff?.name || user?.name || 'Faculty Member'} ({myStaff?.id || 'EMP-101'})</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Locked</span>
                  </div>
                ) : (
                  <select
                    value={leaveForm.employeeId}
                    onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.designation} - {s.department})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>{lt}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value, endDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason / Purpose *</label>
                <textarea
                  required
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Detail the circumstances, syllabus coverage arrangement, or medical condition..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF DETAILS PROFILE MODAL */}
      {selectedStaffDetail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedStaffDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 id="profile-modal-title" className="text-sm font-bold text-gray-900">
                Staff Profile: {selectedStaffDetail.name} ({selectedStaffDetail.id})
              </h2>
              <button
                onClick={() => setSelectedStaffDetail(null)}
                className="text-gray-400 hover:text-gray-700 font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center space-x-3.5 bg-blue-50/70 p-4 rounded-xl border border-blue-100">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg font-bold">
                  {selectedStaffDetail.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{selectedStaffDetail.name}</h3>
                  <p className="text-gray-600 font-medium">{selectedStaffDetail.designation} • {selectedStaffDetail.department}</p>
                  <p className="text-gray-400 text-[11px]">{selectedStaffDetail.email} | {selectedStaffDetail.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400">Qualification: </span>
                  <strong className="text-gray-800">{selectedStaffDetail.qualification}</strong>
                </div>
                <div>
                  <span className="text-gray-400">Joining Date: </span>
                  <strong className="text-gray-800">{selectedStaffDetail.joiningDate}</strong>
                </div>
                <div>
                  <span className="text-gray-400">Employment Type: </span>
                  <strong className="text-gray-800">{selectedStaffDetail.employmentType}</strong>
                </div>
                <div>
                  <span className="text-gray-400">Shift Hours: </span>
                  <strong className="text-gray-800">{selectedStaffDetail.shift}</strong>
                </div>
                <div>
                  <span className="text-gray-400">Bank Account: </span>
                  <strong className="text-gray-800">{selectedStaffDetail.bankDetails?.bankName} ({selectedStaffDetail.bankDetails?.accountNumber})</strong>
                </div>
                <div>
                  <span className="text-gray-400">IFSC Code: </span>
                  <strong className="text-gray-800">{selectedStaffDetail.bankDetails?.ifsc}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                  Annual Leave Balances (2026-2027)
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                    <p className="text-gray-500 text-[10px]">Casual Leave</p>
                    <p className="text-base font-black text-emerald-700">
                      {selectedStaffDetail.leaveBalance?.casual?.remaining} / {selectedStaffDetail.leaveBalance?.casual?.total}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                    <p className="text-gray-500 text-[10px]">Medical Leave</p>
                    <p className="text-base font-black text-blue-700">
                      {selectedStaffDetail.leaveBalance?.medical?.remaining} / {selectedStaffDetail.leaveBalance?.medical?.total}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                    <p className="text-gray-500 text-[10px]">Earned Leave</p>
                    <p className="text-base font-black text-purple-700">
                      {selectedStaffDetail.leaveBalance?.earned?.remaining} / {selectedStaffDetail.leaveBalance?.earned?.total}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                <button
                  onClick={() => setSelectedStaffDetail(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE COMPENSATION & SALARY STRUCTURE MODAL */}
      {selectedCompensationStaff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="comp-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedCompensationStaff(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 id="comp-modal-title" className="text-base font-bold flex items-center space-x-2">
                  <span>💰</span>
                  <span>Manage Salary Structure: {selectedCompensationStaff.name}</span>
                </h2>
                <p className="text-xs text-emerald-200">
                  {selectedCompensationStaff.id} • {selectedCompensationStaff.designation} ({selectedCompensationStaff.department})
                </p>
              </div>
              <button
                onClick={() => setSelectedCompensationStaff(null)}
                className="text-white/70 hover:text-white text-lg font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompensation} className="p-6 space-y-5">
              {/* Auto Calculator Quick Pill */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Standard 7th Pay Commission Calculator</h4>
                  <p className="text-[11px] text-emerald-700">Auto-sets DA to 20%, HRA to 25%, and EPF to 12% of Basic Pay.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoCalculateRates(compensationForm.basicSalary)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition"
                >
                  ⚡ Auto-Calculate
                </button>
              </div>

              {/* Section 1: Earnings & Allowances */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                    1. Earnings & Monthly Allowances
                  </h3>
                  <span className="text-xs font-bold text-emerald-700">
                    Gross: ₹{(Number(compensationForm.basicSalary || 0) + Number(compensationForm.da || 0) + Number(compensationForm.hra || 0) + Number(compensationForm.conveyance || 0)).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Basic Monthly Pay (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={compensationForm.basicSalary}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompensationForm({ ...compensationForm, basicSalary: val });
                      }}
                      className="w-full text-xs font-bold border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Dearness Allowance (DA) (₹)
                    </label>
                    <input
                      type="number"
                      value={compensationForm.da}
                      onChange={(e) => setCompensationForm({ ...compensationForm, da: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-gray-400">Standard 20% of Basic = ₹{Math.round((compensationForm.basicSalary || 0) * 0.20)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      House Rent Allowance (HRA) (₹)
                    </label>
                    <input
                      type="number"
                      value={compensationForm.hra}
                      onChange={(e) => setCompensationForm({ ...compensationForm, hra: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-gray-400">Standard 25% of Basic = ₹{Math.round((compensationForm.basicSalary || 0) * 0.25)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Conveyance / Special Allowance (₹)
                    </label>
                    <input
                      type="number"
                      value={compensationForm.conveyance}
                      onChange={(e) => setCompensationForm({ ...compensationForm, conveyance: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Statutory Deductions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                    2. Statutory & Tax Deductions
                  </h3>
                  <span className="text-xs font-bold text-rose-600">
                    Total Deductions: -₹{(Number(compensationForm.pf || 0) + Number(compensationForm.esi || 0) + Number(compensationForm.tax || 0)).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Provident Fund (EPF) (₹)
                    </label>
                    <input
                      type="number"
                      value={compensationForm.pf}
                      onChange={(e) => setCompensationForm({ ...compensationForm, pf: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-gray-400">12% of Basic = ₹{Math.round((compensationForm.basicSalary || 0) * 0.12)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      ESI Contribution (₹)
                    </label>
                    <input
                      type="number"
                      value={compensationForm.esi}
                      onChange={(e) => setCompensationForm({ ...compensationForm, esi: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-gray-400">0.75% of Gross if &lt; ₹50k</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Professional Tax & TDS (₹)
                    </label>
                    <input
                      type="number"
                      value={compensationForm.tax}
                      onChange={(e) => setCompensationForm({ ...compensationForm, tax: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Net Take-Home Result Banner */}
              {(() => {
                const gross = Number(compensationForm.basicSalary || 0) + Number(compensationForm.da || 0) + Number(compensationForm.hra || 0) + Number(compensationForm.conveyance || 0);
                const deductions = Number(compensationForm.pf || 0) + Number(compensationForm.esi || 0) + Number(compensationForm.tax || 0);
                const net = gross - deductions;
                return (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        Net Monthly Take-Home Pay
                      </p>
                      <p className="text-xs text-emerald-700 font-medium">
                        {numberToWords(net)}
                      </p>
                    </div>
                    <div className="text-xl font-black text-emerald-900">
                      ₹{net.toLocaleString('en-IN')} / month
                    </div>
                  </div>
                );
              })()}

              {/* Section 3: Bank Disbursal Account */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-1">
                  3. Direct Bank Disbursal Account
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={compensationForm.bankName}
                      onChange={(e) => setCompensationForm({ ...compensationForm, bankName: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={compensationForm.accountNumber}
                      onChange={(e) => setCompensationForm({ ...compensationForm, accountNumber: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={compensationForm.ifsc}
                      onChange={(e) => setCompensationForm({ ...compensationForm, ifsc: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedCompensationStaff(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition"
                >
                  Save Salary Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SALARY SLIP (PRINTABLE MODAL) */}
      {selectedPayslip && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payslip-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPayslip(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-150 print:m-0 print:shadow-none print:w-full print:border-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-gray-600">Computerized Salary Voucher</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition flex items-center space-x-1"
                >
                  <span>🖨️</span>
                  <span>Print Payslip</span>
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="text-gray-400 hover:text-gray-700 font-bold p-1 text-sm"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official School Payslip Content */}
            <div className="p-8 space-y-6 text-xs text-gray-800">
              {/* Institution Header */}
              <div className="text-center border-b-2 border-blue-900 pb-4 space-y-1">
                <div className="flex justify-center items-center space-x-2">
                  <span className="text-2xl">🎓</span>
                  <h1 className="text-lg font-black tracking-tight text-blue-950 uppercase">
                    {currentSchool?.name || 'Twinkling Toddlers Senior Secondary School'}
                  </h1>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  Affiliated to Central Board of Secondary Education • {currentSchool?.address || 'Deshbandhu Para, Siliguri, WB'}
                </p>
                <p className="text-xs font-bold text-gray-800 pt-1 tracking-wide uppercase">
                  Pay Slip for the Month of {['October', 'November', 'December'][parseInt(selectedPayslip.month, 10) - 10] || 'November'} {selectedPayslip.year}
                </p>
              </div>

              {/* Employee & Bank Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-200">
                <div className="space-y-1">
                  <p><span className="text-gray-400">Employee ID:</span> <strong className="text-gray-900">{selectedPayslip.employeeId}</strong></p>
                  <p><span className="text-gray-400">Employee Name:</span> <strong className="text-gray-900">{selectedPayslip.employeeName}</strong></p>
                  <p><span className="text-gray-400">Designation:</span> {selectedPayslip.designation}</p>
                  <p><span className="text-gray-400">Department:</span> {selectedPayslip.department}</p>
                </div>
                <div className="space-y-1">
                  <p><span className="text-gray-400">Bank Name:</span> {selectedPayslip.bankDetails?.bankName}</p>
                  <p><span className="text-gray-400">Account No:</span> {selectedPayslip.bankDetails?.accountNumber}</p>
                  <p><span className="text-gray-400">Transaction Ref:</span> {selectedPayslip.transactionRef}</p>
                  <p><span className="text-gray-400">Working Days:</span> {selectedPayslip.workingDays} (Paid Leaves: {selectedPayslip.paidLeaves})</p>
                </div>
              </div>

              {/* Two Column Earnings vs Deductions Table */}
              <div className="grid grid-cols-2 divide-x divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                {/* Earnings */}
                <div>
                  <div className="bg-emerald-50 px-4 py-2 border-b border-gray-200 font-bold text-emerald-900">
                    Earnings (Allowances)
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="flex justify-between">
                      <span>Basic Pay:</span>
                      <strong className="text-gray-900">₹{selectedPayslip.basicPay?.toLocaleString('en-IN')}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Dearness Allowance (DA 20%):</span>
                      <span className="text-gray-700">₹{selectedPayslip.da?.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>House Rent Allowance (HRA 25%):</span>
                      <span className="text-gray-700">₹{selectedPayslip.hra?.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Conveyance & Transport Allowance:</span>
                      <span className="text-gray-700">₹{selectedPayslip.conveyance?.toLocaleString('en-IN')}</span>
                    </p>
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-blue-900">
                      <span>Gross Earnings:</span>
                      <span>₹{selectedPayslip.grossSalary?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-rose-50 px-4 py-2 border-b border-gray-200 font-bold text-rose-900">
                    Statutory & Tax Deductions
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="flex justify-between">
                      <span>Provident Fund (EPF 12%):</span>
                      <span className="text-rose-700">₹{selectedPayslip.pfDeduction?.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>ESI Health Contribution:</span>
                      <span className="text-rose-700">₹{selectedPayslip.esiDeduction?.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Professional Tax / TDS:</span>
                      <span className="text-rose-700">₹{selectedPayslip.taxDeduction?.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="flex justify-between text-transparent select-none">
                      <span>Spacer</span>
                      <span>-</span>
                    </p>
                    <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-rose-900">
                      <span>Total Deductions:</span>
                      <span>-₹{selectedPayslip.totalDeductions?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Take Home Bar */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Net Salary Payable</p>
                  <p className="text-xs text-emerald-700 italic">
                    Amount in words: {numberToWords(selectedPayslip.netSalary)}
                  </p>
                </div>
                <div className="text-2xl font-black text-emerald-900">
                  ₹{selectedPayslip.netSalary?.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Official Seal and Signature */}
              <div className="pt-8 flex justify-between items-end text-center text-[11px] text-gray-500">
                <div className="space-y-1">
                  <p className="font-bold text-gray-800">Meenakshi Sundaram</p>
                  <p className="border-t border-gray-300 pt-1 px-4">Chief Accounts Officer</p>
                </div>

                <div className="w-20 h-20 rounded-full border-2 border-blue-900/40 flex items-center justify-center text-[10px] font-bold text-blue-900/60 uppercase rotate-[-12deg]">
                  School Seal
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-gray-800">Dr. Sunita Rao</p>
                  <p className="border-t border-gray-300 pt-1 px-4">Principal & Academic Dean</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

