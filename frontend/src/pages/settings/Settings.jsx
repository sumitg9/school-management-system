import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { 
  PREDEFINED_DATE_TIME_FORMATS, 
  PREDEFINED_DATE_FORMATS, 
  PREDEFINED_TIME_FORMATS,
  formatDateTime as baseFormatDateTime,
  formatDate as baseFormatDate,
  formatTime as baseFormatTime,
  DEFAULT_CLASS_AGE_CRITERIA,
  getMaxDateForAge
} from '../../utils/dateFormatter';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { classAPI } from '../../services/api';
import { 
  getSavedCustomFeeTypes, 
  saveCustomFeeType, 
  removeCustomFeeType, 
  STANDARD_FEE_TYPES 
} from '../../utils/feeTypes';
import { toast } from 'react-toastify';
import UserPermissionsTable from './UserPermissionsTable';

const SAMPLE_DATE = new Date('2026-10-31T12:15:00');

export const LOGO_PRESETS = [
  { id: 'grad_cap', name: 'Graduation Cap', icon: '🎓' },
  { id: 'classical', name: 'Academy Columns', icon: '🏛️' },
  { id: 'open_book', name: 'Book of Wisdom', icon: '📖' },
  { id: 'shield', name: 'Honor Shield', icon: '🛡️' },
  { id: 'tree', name: 'Knowledge Tree', icon: '🌳' },
  { id: 'torch', name: 'Enlightenment Torch', icon: '🔥' },
  { id: 'globe', name: 'Global School', icon: '🌐' },
  { id: 'star', name: 'Excellence Star', icon: '⭐' },
];

const Settings = () => {
  const { settings, updateSettings, loading: initialLoading } = useSettings();
  const { user } = useAuth();
  const confirm = useConfirm();

  // Active navigation tab: 'all' | 'school_profile' | 'age_criteria' | 'fee_rules' | 'user_permissions' | 'localization'
  const [activeTab, setActiveTab] = useState('all');

  // Form states - School Identity & Branding
  const [schoolName, setSchoolName] = useState('Delhi Public Academy');
  const [schoolTagline, setSchoolTagline] = useState('Empowering Minds, Shaping Futures');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('accounts@school.edu');
  const [schoolPhone, setSchoolPhone] = useState('+91 98765 43210');
  const [schoolAddress, setSchoolAddress] = useState('Knowledge Park, Institutional Area, New Delhi');
  const [schoolAffiliation, setSchoolAffiliation] = useState('Affiliated to CBSE / State Board • Reg. No: SMS-EDU-2024-9988');
  const [schoolWebsite, setSchoolWebsite] = useState('www.school.edu');

  // Form states - Localization
  const [selectedPreset, setSelectedPreset] = useState('DD-MM-YYYY HH:mm:ss');
  const [customDateTimeFormat, setCustomDateTimeFormat] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
  const [timeFormat, setTimeFormat] = useState('HH:mm:ss');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Form states - Age criteria
  const [studentMinAgeYears, setStudentMinAgeYears] = useState(2);
  const [studentMinAgeMonths, setStudentMinAgeMonths] = useState(6);
  const [teacherMinAgeYears, setTeacherMinAgeYears] = useState(20);
  const [staffMinAgeYears, setStaffMinAgeYears] = useState(18);
  const [classAgeCriteria, setClassAgeCriteria] = useState(DEFAULT_CLASS_AGE_CRITERIA);

  // Form states - Fee Rules & Late Fine
  const [feeLateFineEnabled, setFeeLateFineEnabled] = useState(true);
  const [feeLateFineType, setFeeLateFineType] = useState('fixed_per_month');
  const [feeLateFineAmount, setFeeLateFineAmount] = useState(100);
  const [feeDueDayOfMonth, setFeeDueDayOfMonth] = useState(10);
  const [feeGracePeriodDays, setFeeGracePeriodDays] = useState(0);
  const [feeLateFineMaxCap, setFeeLateFineMaxCap] = useState(1000);

  // Class criteria helpers
  const [availableClasses, setAvailableClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassYears, setNewClassYears] = useState(3);
  const [newClassMonths, setNewClassMonths] = useState(0);

  // Custom Fee Types
  const [customFeeTypes, setCustomFeeTypes] = useState(() => getSavedCustomFeeTypes());
  const [newFeeTypeName, setNewFeeTypeName] = useState('');

  const [saving, setSaving] = useState(false);
  const [liveNow, setLiveNow] = useState(new Date());

  // Tick live preview every second
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch school classes for quick assignment
  useEffect(() => {
    const loadSchoolClasses = async () => {
      try {
        const res = await classAPI.getAll({ per_page: 'all' });
        if (res && res.data) {
          setAvailableClasses(res.data);
        }
      } catch (err) {
        console.warn('Could not load classes for age criteria settings:', err);
      }
    };
    loadSchoolClasses();
  }, []);

  // Sync with context settings on mount / change
  useEffect(() => {
    if (settings) {
      const currentDT = settings.date_time_format || 'DD-MM-YYYY HH:mm:ss';
      const matched = PREDEFINED_DATE_TIME_FORMATS.find(p => p.value === currentDT);
      if (matched) {
        setSelectedPreset(currentDT);
        setIsCustom(false);
        setCustomDateTimeFormat('');
      } else {
        setSelectedPreset('custom');
        setIsCustom(true);
        setCustomDateTimeFormat(currentDT);
      }

      setDateFormat(settings.date_format || 'DD-MM-YYYY');
      setTimeFormat(settings.time_format || 'HH:mm:ss');
      setTimezone(settings.timezone || 'Asia/Kolkata');
      setCurrency(settings.currency || 'INR');
      setCurrencySymbol(settings.currency_symbol || '₹');

      setStudentMinAgeYears(settings.student_min_age_years !== undefined ? parseInt(settings.student_min_age_years, 10) : 2);
      setStudentMinAgeMonths(settings.student_min_age_months !== undefined ? parseInt(settings.student_min_age_months, 10) : 6);
      setTeacherMinAgeYears(settings.teacher_min_age_years !== undefined ? parseInt(settings.teacher_min_age_years, 10) : 20);
      setStaffMinAgeYears(settings.staff_min_age_years !== undefined ? parseInt(settings.staff_min_age_years, 10) : 18);

      let criteria = settings.class_age_criteria;
      if (typeof criteria === 'string') {
        try {
          criteria = JSON.parse(criteria);
        } catch {
          criteria = DEFAULT_CLASS_AGE_CRITERIA;
        }
      }
      setClassAgeCriteria(criteria && typeof criteria === 'object' ? criteria : DEFAULT_CLASS_AGE_CRITERIA);

      // Fee Rules & Late Fine
      setFeeLateFineEnabled(settings.fee_late_fine_enabled !== undefined ? !!settings.fee_late_fine_enabled : true);
      setFeeLateFineType(settings.fee_late_fine_type || 'fixed_per_month');
      setFeeLateFineAmount(settings.fee_late_fine_amount !== undefined ? settings.fee_late_fine_amount : 100);
      setFeeDueDayOfMonth(settings.fee_due_day_of_month !== undefined ? settings.fee_due_day_of_month : 10);
      setFeeGracePeriodDays(settings.fee_grace_period_days !== undefined ? settings.fee_grace_period_days : 0);
      setFeeLateFineMaxCap(settings.fee_late_fine_max_cap !== undefined ? settings.fee_late_fine_max_cap : 1000);

      // School Profile & Branding
      setSchoolName(settings.school_name !== undefined ? settings.school_name : 'Delhi Public Academy');
      setSchoolTagline(settings.school_tagline !== undefined ? settings.school_tagline : 'Empowering Minds, Shaping Futures');
      setSchoolLogo(settings.school_logo !== undefined ? settings.school_logo : '');
      setSchoolEmail(settings.school_email !== undefined ? settings.school_email : 'accounts@school.edu');
      setSchoolPhone(settings.school_phone !== undefined ? settings.school_phone : '+91 98765 43210');
      setSchoolAddress(settings.school_address !== undefined ? settings.school_address : 'Knowledge Park, Institutional Area, New Delhi');
      setSchoolAffiliation(settings.school_affiliation !== undefined ? settings.school_affiliation : 'Affiliated to CBSE / State Board • Reg. No: SMS-EDU-2024-9988');
      setSchoolWebsite(settings.school_website !== undefined ? settings.school_website : 'www.school.edu');
    }
  }, [settings]);

  // Compute active date-time format for live preview
  const activeDateTimeFormat = isCustom 
    ? (customDateTimeFormat || 'DD-MM-YYYY HH:mm:ss')
    : selectedPreset;

  const handlePresetSelect = (fmt) => {
    setSelectedPreset(fmt);
    setIsCustom(false);
  };

  const handleCustomSelect = () => {
    setIsCustom(true);
    setSelectedPreset('custom');
    if (!customDateTimeFormat) {
      setCustomDateTimeFormat(selectedPreset !== 'custom' ? selectedPreset : 'DD-MM-YYYY HH:mm:ss');
    }
  };

  // Class age criteria handlers
  const handleClassAgeChange = (className, field, value) => {
    setClassAgeCriteria(prev => ({
      ...prev,
      [className]: {
        ...prev[className],
        [field]: parseInt(value, 10) || 0,
      },
    }));
  };

  const handleRemoveClassCriteria = (className) => {
    setClassAgeCriteria(prev => {
      const next = { ...prev };
      delete next[className];
      return next;
    });
  };

  const handleAddClassCriteria = () => {
    const trimmed = (newClassName || '').trim();
    if (!trimmed) return;
    setClassAgeCriteria(prev => ({
      ...prev,
      [trimmed]: {
        min_years: parseInt(newClassYears, 10) || 0,
        min_months: parseInt(newClassMonths, 10) || 0,
      },
    }));
    setNewClassName('');
    setNewClassYears(3);
    setNewClassMonths(0);
  };

  const handleAddFeeTypeFromSettings = () => {
    if (!newFeeTypeName.trim()) return;
    const created = saveCustomFeeType(newFeeTypeName.trim());
    if (created) {
      setCustomFeeTypes(getSavedCustomFeeTypes());
      setNewFeeTypeName('');
      toast.success(`Custom fee type "${created.label}" added!`);
    }
  };

  const handleRemoveFeeTypeFromSettings = (id) => {
    const updated = removeCustomFeeType(id);
    setCustomFeeTypes(updated);
  };

  const handleLoadStandardCriteria = () => {
    setClassAgeCriteria(DEFAULT_CLASS_AGE_CRITERIA);
  };

  const handleImportClassesFromSchool = () => {
    if (!availableClasses || availableClasses.length === 0) return;
    setClassAgeCriteria(prev => {
      const updated = { ...prev };
      availableClasses.forEach(cls => {
        if (!updated[cls.name]) {
          // Detect class number if present
          const numMatch = cls.name.match(/\d+/);
          if (numMatch) {
            const classNum = parseInt(numMatch[0], 10);
            updated[cls.name] = { min_years: Math.max(4 + classNum, 2), min_months: 6 };
          } else {
            updated[cls.name] = { min_years: 2, min_months: 6 };
          }
        }
      });
      return updated;
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, SVG, WEBP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSchoolLogo(reader.result);
      toast.success('School logo uploaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Failed to read logo image');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const finalDateTimeFormat = isCustom 
      ? (customDateTimeFormat.trim() || 'DD-MM-YYYY HH:mm:ss') 
      : selectedPreset;

    const payload = {
      school_name: schoolName.trim() || 'Delhi Public Academy',
      school_tagline: schoolTagline.trim(),
      school_logo: schoolLogo,
      school_email: schoolEmail.trim(),
      school_phone: schoolPhone.trim(),
      school_address: schoolAddress.trim(),
      school_affiliation: schoolAffiliation.trim(),
      school_website: schoolWebsite.trim(),
      date_time_format: finalDateTimeFormat,
      date_format: dateFormat,
      time_format: timeFormat,
      timezone: timezone,
      currency: currency,
      currency_symbol: currencySymbol,
      student_min_age_years: parseInt(studentMinAgeYears, 10),
      student_min_age_months: parseInt(studentMinAgeMonths, 10),
      teacher_min_age_years: parseInt(teacherMinAgeYears, 10),
      staff_min_age_years: parseInt(staffMinAgeYears, 10),
      class_age_criteria: classAgeCriteria,
      fee_late_fine_enabled: feeLateFineEnabled,
      fee_late_fine_type: feeLateFineType,
      fee_late_fine_amount: parseFloat(feeLateFineAmount) || 0,
      fee_due_day_of_month: parseInt(feeDueDayOfMonth, 10) || 10,
      fee_grace_period_days: parseInt(feeGracePeriodDays, 10) || 0,
      fee_late_fine_max_cap: parseFloat(feeLateFineMaxCap) || 0,
    };

    await updateSettings(payload);
    setSaving(false);
  };

  const handleResetDefaults = async () => {
    const isConfirmed = await confirm({
      title: 'Reset System Settings',
      message: 'Are you sure you want to reset all localization, school branding, date/time, age criteria, and fee fine settings to default values?',
      confirmText: 'Reset to Defaults',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (isConfirmed) {
      setSaving(true);
      await updateSettings({
        school_name: 'Delhi Public Academy',
        school_tagline: 'Empowering Minds, Shaping Futures',
        school_logo: '',
        school_email: 'accounts@school.edu',
        school_phone: '+91 98765 43210',
        school_address: 'Knowledge Park, Institutional Area, New Delhi',
        school_affiliation: 'Affiliated to CBSE / State Board • Reg. No: SMS-EDU-2024-9988',
        school_website: 'www.school.edu',
        date_time_format: 'DD-MM-YYYY HH:mm:ss',
        date_format: 'DD-MM-YYYY',
        time_format: 'HH:mm:ss',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        currency_symbol: '₹',
        student_min_age_years: 2,
        student_min_age_months: 6,
        teacher_min_age_years: 20,
        staff_min_age_years: 18,
        class_age_criteria: DEFAULT_CLASS_AGE_CRITERIA,
        fee_late_fine_enabled: true,
        fee_late_fine_type: 'fixed_per_month',
        fee_late_fine_amount: 100,
        fee_due_day_of_month: 10,
        fee_grace_period_days: 0,
        fee_late_fine_max_cap: 1000,
      });
      setSchoolName('Delhi Public Academy');
      setSchoolTagline('Empowering Minds, Shaping Futures');
      setSchoolLogo('');
      setSchoolEmail('accounts@school.edu');
      setSchoolPhone('+91 98765 43210');
      setSchoolAddress('Knowledge Park, Institutional Area, New Delhi');
      setSchoolAffiliation('Affiliated to CBSE / State Board • Reg. No: SMS-EDU-2024-9988');
      setSchoolWebsite('www.school.edu');
      setSelectedPreset('DD-MM-YYYY HH:mm:ss');
      setIsCustom(false);
      setCustomDateTimeFormat('');
      setDateFormat('DD-MM-YYYY');
      setTimeFormat('HH:mm:ss');
      setTimezone('Asia/Kolkata');
      setCurrency('INR');
      setCurrencySymbol('₹');
      setStudentMinAgeYears(2);
      setStudentMinAgeMonths(6);
      setTeacherMinAgeYears(20);
      setStaffMinAgeYears(18);
      setClassAgeCriteria(DEFAULT_CLASS_AGE_CRITERIA);
      setFeeLateFineEnabled(true);
      setFeeLateFineType('fixed_per_month');
      setFeeLateFineAmount(100);
      setFeeDueDayOfMonth(10);
      setFeeGracePeriodDays(0);
      setFeeLateFineMaxCap(1000);
      setSaving(false);
    }
  };

  const isAdmin = user?.roles?.some(r => r === 'admin' || r === 'super-admin');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span>⚙️</span> System Settings
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure application localization, date & time formatting, and student & staff age criteria.
          </p>
        </div>
        {!isAdmin && (
          <div className="mt-3 md:mt-0 px-4 py-2 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200">
            ℹ️ Viewing as read-only. Administrator privileges required to change settings.
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          📋 All Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('school_profile')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'school_profile'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>🏫</span> School Profile & Branding
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-bold">
            Identity
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('age_criteria')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'age_criteria'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>👶</span> Age Criteria & Eligibility
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">
            Custom
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fee_rules')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'fee_rules'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>💳</span> Fee Rules & Late Fine
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('user_permissions')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'user_permissions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>🛡️</span> User Roles & Permissions
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">
            8 Roles
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('localization')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'localization'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>🌐</span> Localization & Formats
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 0: SCHOOL PROFILE & BRAND IDENTITY */}
        {(activeTab === 'all' || activeTab === 'school_profile') && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>🏫</span> School Profile & Brand Identity
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your institution name, brand emblem/logo, tagline, and official contact coordinates.
                    These will be dynamically reflected across the sidebar, login page, browser title, and fee receipts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Live Platform Identity
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Form Controls */}
                <div className="lg:col-span-7 space-y-5">
                  {/* School Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      School / Institution Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="e.g. Delhi Public Academy"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Displayed on the navigation header, login screen, student reports, and official invoices.
                    </p>
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Motto / Tagline
                    </label>
                    <input
                      type="text"
                      value={schoolTagline}
                      onChange={(e) => setSchoolTagline(e.target.value)}
                      placeholder="e.g. Empowering Minds, Shaping Futures"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Subheading displayed beneath the school name in the sidebar and auth pages.
                    </p>
                  </div>

                  {/* School Logo Section */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-gray-800">
                        School Logo / Emblem
                      </label>
                      {schoolLogo && (
                        <button
                          type="button"
                          onClick={() => setSchoolLogo('')}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Reset to Default Emblem
                        </button>
                      )}
                    </div>

                    {/* Logo Presets */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        1. Select a Quick Academic Emblem Preset:
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {LOGO_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setSchoolLogo(preset.value)}
                            title={preset.name}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xl transition-all ${
                              schoolLogo === preset.value
                                ? 'border-blue-600 bg-blue-100 ring-2 ring-blue-500 shadow-sm scale-105'
                                : 'border-gray-200 bg-white hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            <span>{preset.symbol}</span>
                            <span className="text-[10px] text-gray-600 mt-1 truncate max-w-full font-medium">
                              {preset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Logo Upload & Direct URL */}
                    <div className="pt-2 border-t border-gray-200 space-y-3">
                      <p className="text-xs font-medium text-gray-600">
                        2. Or Upload a Custom Image / Provide Image URL:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Upload Logo (PNG, JPG, SVG, WebP &lt; 2MB)
                          </label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            onChange={handleLogoUpload}
                            className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg p-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Direct Image URL
                          </label>
                          <input
                            type="url"
                            value={schoolLogo.startsWith('data:') || schoolLogo.startsWith('preset:') ? '' : schoolLogo}
                            onChange={(e) => setSchoolLogo(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Institutional & Receipt Details */}
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/70 space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                      <span>🧾</span> Official Institutional Details (For Receipts & Documents)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Official School Email
                        </label>
                        <input
                          type="email"
                          value={schoolEmail}
                          onChange={(e) => setSchoolEmail(e.target.value)}
                          placeholder="accounts@school.edu"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Official Contact Phone
                        </label>
                        <input
                          type="text"
                          value={schoolPhone}
                          onChange={(e) => setSchoolPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Affiliation / Registration Details
                        </label>
                        <input
                          type="text"
                          value={schoolAffiliation}
                          onChange={(e) => setSchoolAffiliation(e.target.value)}
                          placeholder="Affiliated to CBSE • Reg. No: SMS-EDU-2024-9988"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Official Website
                        </label>
                        <input
                          type="text"
                          value={schoolWebsite}
                          onChange={(e) => setSchoolWebsite(e.target.value)}
                          placeholder="www.school.edu"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Campus Address
                      </label>
                      <textarea
                        rows={2}
                        value={schoolAddress}
                        onChange={(e) => setSchoolAddress(e.target.value)}
                        placeholder="Knowledge Park, Institutional Area, New Delhi - 110001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Previews */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-5 text-white shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <span>👁️</span> Live Sidebar Header Preview
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        App Shell
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow overflow-hidden">
                        {schoolLogo ? (
                          schoolLogo.startsWith('preset:') ? (
                            <span>{schoolLogo.replace('preset:', '')}</span>
                          ) : (
                            <img
                              src={schoolLogo}
                              alt="Logo"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.parentElement.innerHTML = '<span>🏫</span>';
                              }}
                            />
                          )
                        ) : (
                          <span>🏫</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">
                          {schoolName || 'School Name'}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {schoolTagline || 'School Management System'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Fee Receipt Preview */}
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                        <span>🧾</span> Official Receipt Header Preview
                      </span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                        Print / PDF
                      </span>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center space-y-1.5">
                      <div className="mx-auto h-12 w-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-2xl mb-1 shadow-sm overflow-hidden">
                        {schoolLogo ? (
                          schoolLogo.startsWith('preset:') ? (
                            <span>{schoolLogo.replace('preset:', '')}</span>
                          ) : (
                            <img
                              src={schoolLogo}
                              alt="Logo"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.parentElement.innerHTML = '<span>🏫</span>';
                              }}
                            />
                          )
                        ) : (
                          <span>🏫</span>
                        )}
                      </div>
                      <h4 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">
                        {schoolName || 'SCHOOL NAME'}
                      </h4>
                      {schoolAffiliation && (
                        <p className="text-[11px] text-blue-800 font-semibold">
                          {schoolAffiliation}
                        </p>
                      )}
                      {schoolAddress && (
                        <p className="text-[10px] text-gray-500">
                          {schoolAddress}
                        </p>
                      )}
                      {(schoolEmail || schoolPhone || schoolWebsite) && (
                        <p className="text-[10px] text-gray-400">
                          {[
                            schoolPhone && `Phone: ${schoolPhone}`,
                            schoolEmail && `Email: ${schoolEmail}`,
                            schoolWebsite && schoolWebsite
                          ].filter(Boolean).join(' | ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Browser Tab Preview */}
                  <div className="bg-gray-100 rounded-xl p-3 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Browser Tab Title
                    </span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-t-lg border-t border-x border-gray-300 max-w-xs shadow-sm">
                      <span className="text-xs">
                        {schoolLogo && schoolLogo.startsWith('preset:') ? schoolLogo.replace('preset:', '') : '🏫'}
                      </span>
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {schoolName || 'SMS'} - School Management System
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 1: AGE CRITERIA SETTINGS */}
        {(activeTab === 'all' || activeTab === 'age_criteria') && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>👶</span> Age Criteria & Eligibility Settings
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Set minimum age limits for students (default & class-wise), teachers, and non-teaching staff.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                    Active & Enforced
                  </span>
                </div>
              </div>

              {/* General Minimum Age Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Student Default Age */}
                <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                        <span>🎓</span> Student Default Min Age
                      </span>
                      <span className="text-xs bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                        Baseline
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mb-4">
                      Fallback criteria when class-specific criteria is not defined. (Minimum 2 years 6 months recommended)
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Years</label>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={studentMinAgeYears}
                          onChange={(e) => setStudentMinAgeYears(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Months</label>
                        <select
                          value={studentMinAgeMonths}
                          onChange={(e) => setStudentMinAgeMonths(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => (
                            <option key={m} value={m}>{m} Month{m !== 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-blue-200 text-xs text-blue-900 space-y-1">
                    <p className="font-semibold">
                      Effective Min Age: <span className="text-blue-800 font-bold">{studentMinAgeYears} Yrs {studentMinAgeMonths} Mos</span>
                    </p>
                    <p className="text-gray-600">
                      Cutoff DOB: <span className="font-mono font-bold text-blue-700">{getMaxDateForAge(studentMinAgeYears, studentMinAgeMonths)}</span>
                    </p>
                  </div>
                </div>

                {/* Teacher Minimum Age */}
                <div className="bg-emerald-50/60 rounded-xl p-5 border border-emerald-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                        <span>👨‍🏫</span> Teacher Minimum Age
                      </span>
                      <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Faculty
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mb-4">
                      Applied to teacher registration and profile forms across the system.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum Years</label>
                      <input
                        type="number"
                        min="15"
                        max="65"
                        value={teacherMinAgeYears}
                        onChange={(e) => setTeacherMinAgeYears(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <p className="font-semibold">
                      Effective Min Age: <span className="text-emerald-800 font-bold">{teacherMinAgeYears} Years</span>
                    </p>
                    <p className="text-gray-600">
                      Cutoff DOB: <span className="font-mono font-bold text-emerald-700">{getMaxDateForAge(teacherMinAgeYears, 0)}</span>
                    </p>
                  </div>
                </div>

                {/* Other Staff Minimum Age */}
                <div className="bg-purple-50/60 rounded-xl p-5 border border-purple-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                        <span>🧑‍💼</span> Staff Minimum Age
                      </span>
                      <span className="text-xs bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                        Staff
                      </span>
                    </div>
                    <p className="text-xs text-purple-700 mb-4">
                      Applied to administrative, non-teaching, and support staff members.
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum Years</label>
                      <input
                        type="number"
                        min="15"
                        max="65"
                        value={staffMinAgeYears}
                        onChange={(e) => setStaffMinAgeYears(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-purple-200 text-xs text-purple-900 space-y-1">
                    <p className="font-semibold">
                      Effective Min Age: <span className="text-purple-800 font-bold">{staffMinAgeYears} Years</span>
                    </p>
                    <p className="text-gray-600">
                      Cutoff DOB: <span className="font-mono font-bold text-purple-700">{getMaxDateForAge(staffMinAgeYears, 0)}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Class-Wise Student Criteria Table */}
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>🏫</span> Class-Wise Student Minimum Age Requirements
                    </h3>
                    <p className="text-xs text-gray-500">
                      When a student is enrolled in a specific class, these age thresholds take precedence over the general default.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleLoadStandardCriteria}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition flex items-center gap-1.5"
                    >
                      <span>⚡</span> Load Standard Standards
                    </button>
                    {availableClasses.length > 0 && (
                      <button
                        type="button"
                        onClick={handleImportClassesFromSchool}
                        className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition flex items-center gap-1.5"
                      >
                        <span>📥</span> Import School Classes ({availableClasses.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Interactive Criteria Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 text-xs font-semibold uppercase tracking-wider border-b">
                      <tr>
                        <th className="py-3 px-4">Class / Grade</th>
                        <th className="py-3 px-4">Minimum Years</th>
                        <th className="py-3 px-4">Minimum Months</th>
                        <th className="py-3 px-4">Effective Requirement</th>
                        <th className="py-3 px-4">Cutoff Birthdate (Born On/Before)</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {Object.entries(classAgeCriteria).map(([clsName, criteria]) => {
                        const years = parseInt(criteria.min_years ?? 2, 10);
                        const months = parseInt(criteria.min_months ?? 0, 10);
                        const cutoff = getMaxDateForAge(years, months);
                        return (
                          <tr key={clsName} className="hover:bg-blue-50/30 transition">
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {clsName}
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                max="25"
                                value={years}
                                onChange={(e) => handleClassAgeChange(clsName, 'min_years', e.target.value)}
                                className="w-24 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-semibold"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={months}
                                onChange={(e) => handleClassAgeChange(clsName, 'min_months', e.target.value)}
                                className="w-32 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => (
                                  <option key={m} value={m}>{m} Month{m !== 1 ? 's' : ''}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {years} Yrs {months > 0 ? `${months} Mos` : ''}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-gray-700">
                              <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {cutoff}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveClassCriteria(clsName)}
                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                                title={`Remove ${clsName} age criteria`}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Custom Class Criteria */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col md:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Add Custom Class / Grade
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Playgroup, Grade 11 Science, Prep"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Min Years</label>
                    <input
                      type="number"
                      min="0"
                      max="25"
                      value={newClassYears}
                      onChange={(e) => setNewClassYears(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Min Months</label>
                    <select
                      value={newClassMonths}
                      onChange={(e) => setNewClassMonths(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(m => (
                        <option key={m} value={m}>{m} Month{m !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full md:w-auto self-end">
                    <button
                      type="button"
                      onClick={handleAddClassCriteria}
                      disabled={!newClassName.trim()}
                      className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      + Add Class
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: FEE RULES & LATE FINE SETTINGS */}
        {(activeTab === 'all' || activeTab === 'fee_rules') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>💳</span> Fee Payment Rules & Late Fine Policy
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure monthly fee due dates, overdue grace periods, and automatic late fine calculations.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  feeLateFineEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {feeLateFineEnabled ? '✓ Late Fine Active' : '✕ Late Fine Disabled'}
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label htmlFor="feeLateFineToggle" className="text-sm font-bold text-gray-900 cursor-pointer">
                  Enable Automatic Late Fine for Overdue Fee Months
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, overdue months selected in the Fee Collection screen automatically incur this penalty.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="feeLateFineToggle"
                  type="checkbox"
                  checked={feeLateFineEnabled}
                  onChange={(e) => setFeeLateFineEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Settings Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${!feeLateFineEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              {/* Calculation Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Late Fine Calculation Method
                </label>
                <select
                  value={feeLateFineType}
                  onChange={(e) => setFeeLateFineType(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="fixed_per_month">Fixed Amount Per Overdue Month (₹)</option>
                  <option value="percentage">Percentage of Monthly Fee (% per month)</option>
                  <option value="daily">Daily Late Fine (₹ per day overdue)</option>
                </select>
                <p className="text-[11px] text-gray-500">
                  {feeLateFineType === 'fixed_per_month' && 'Applies a flat fine for each month past its due date.'}
                  {feeLateFineType === 'percentage' && 'Calculates fine as a percentage of 1 month base fee.'}
                  {feeLateFineType === 'daily' && 'Multiplies days elapsed past due date by the daily rate.'}
                </p>
              </div>

              {/* Amount / Rate */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  {feeLateFineType === 'percentage' ? 'Fine Percentage (%)' : `Fine Rate (${currencySymbol})`}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold text-sm">
                    {feeLateFineType === 'percentage' ? '%' : currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step={feeLateFineType === 'percentage' ? '0.1' : '1'}
                    value={feeLateFineAmount}
                    onChange={(e) => setFeeLateFineAmount(e.target.value)}
                    className="input-field text-sm pl-8 font-semibold"
                    placeholder="100"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  {feeLateFineType === 'percentage' ? 'e.g. 5% = ₹100 on ₹2000 fee' : 'e.g. ₹100/mo or ₹5/day'}
                </p>
              </div>

              {/* Due Day of Month */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Monthly Fee Due Day
                </label>
                <select
                  value={feeDueDayOfMonth}
                  onChange={(e) => setFeeDueDayOfMonth(parseInt(e.target.value, 10))}
                  className="input-field text-sm"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500">
                  Day of the month by which monthly fee must be paid without penalty.
                </p>
              </div>

              {/* Grace Period */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Grace Period (Days After Due Date)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={feeGracePeriodDays}
                    onChange={(e) => setFeeGracePeriodDays(parseInt(e.target.value, 10) || 0)}
                    className="input-field text-sm"
                    placeholder="0"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-xs">
                    days
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Extra days allowed before late fine kicks in (0 = immediate fine after due day).
                </p>
              </div>

              {/* Maximum Fine Cap */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Maximum Late Fine Cap ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={feeLateFineMaxCap}
                    onChange={(e) => setFeeLateFineMaxCap(e.target.value)}
                    className="input-field text-sm pl-8"
                    placeholder="1000"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Maximum fine ceiling (enter 0 for unlimited / no maximum cap).
                </p>
              </div>
            </div>

            {/* Live Interactive Simulation Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
                <span>💡</span>
                <span>Live Rule Simulation & Preview</span>
              </div>
              <p className="text-gray-700 leading-relaxed">
                If a student has <strong>3 overdue months</strong> (with monthly fee of <strong>{currencySymbol}2,000</strong>):
              </p>
              <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-lg border border-blue-100 font-mono text-xs">
                <span>Due deadline: <strong className="text-gray-900">{feeDueDayOfMonth}th of month</strong> (+{feeGracePeriodDays} days grace)</span>
                <span>•</span>
                <span>Calculated Late Fine: <strong className="text-red-600 font-bold">
                  {feeLateFineEnabled ? (
                    feeLateFineType === 'percentage'
                      ? `${currencySymbol}${Math.min(feeLateFineMaxCap > 0 ? feeLateFineMaxCap : Infinity, Math.round(3 * 2000 * ((parseFloat(feeLateFineAmount) || 0) / 100)))}`
                      : feeLateFineType === 'daily'
                      ? `${currencySymbol}${Math.min(feeLateFineMaxCap > 0 ? feeLateFineMaxCap : Infinity, Math.round(3 * 15 * (parseFloat(feeLateFineAmount) || 0)))} (assuming 15 days/mo)`
                      : `${currencySymbol}${Math.min(feeLateFineMaxCap > 0 ? feeLateFineMaxCap : Infinity, Math.round(3 * (parseFloat(feeLateFineAmount) || 0)))}`
                  ) : `${currencySymbol}0 (Disabled)`}
                </strong></span>
                {feeLateFineMaxCap > 0 && <span>(Cap: {currencySymbol}{feeLateFineMaxCap})</span>}
              </div>
            </div>
          </div>
        )}

        {/* SECTION: USER ROLES & PERMISSIONS */}
        {(activeTab === 'all' || activeTab === 'user_permissions') && (
          <UserPermissionsTable />
        )}

        {/* SECTION 2: LOCALIZATION & FORMATS */}
        {(activeTab === 'all' || activeTab === 'localization') && (
          <div className="space-y-6">
            {/* Live Preview Card */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl shadow-xl text-white p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 text-9xl select-none">
                🕒
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-semibold tracking-wider bg-white/20 px-3 py-1 rounded-full">
                    Live Format Preview
                  </span>
                  <span className="text-xs text-blue-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Live System Clock
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-2 border-t border-white/20">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-blue-200 font-medium">Sample Date & Time (User Example):</p>
                    <p className="text-2xl font-mono font-bold mt-1 tracking-wide text-white">
                      {baseFormatDateTime(SAMPLE_DATE, activeDateTimeFormat)}
                    </p>
                    <p className="text-xs text-blue-300 mt-1">From raw: 2026-10-31 12:15:00</p>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-blue-200 font-medium">Current Real-Time Clock:</p>
                    <p className="text-2xl font-mono font-bold mt-1 tracking-wide text-white">
                      {baseFormatDateTime(liveNow, activeDateTimeFormat)}
                    </p>
                    <p className="text-xs text-blue-300 mt-1">
                      Active Format Pattern: <code className="bg-black/30 px-2 py-0.5 rounded font-mono text-xs">{activeDateTimeFormat}</code>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Time Format Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>📅</span> Global Date & Time Format
                  </h2>
                  <p className="text-sm text-gray-500">
                    Select one of the pre-defined format templates or specify a custom format string.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  Applied Globally
                </span>
              </div>

              {/* Predefined Formats Grid */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Pre-defined Formats (Select one):
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PREDEFINED_DATE_TIME_FORMATS.map((preset) => {
                    const isSelected = !isCustom && selectedPreset === preset.value;
                    const previewText = baseFormatDateTime(SAMPLE_DATE, preset.value);
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handlePresetSelect(preset.value)}
                        className={`cursor-pointer rounded-xl p-4 border-2 transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                              {preset.description}
                            </span>
                            <input
                              type="radio"
                              name="dateTimePreset"
                              checked={isSelected}
                              onChange={() => handlePresetSelect(preset.value)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                          </div>
                          <p className="text-base font-bold text-gray-900 font-mono mt-1">
                            {previewText}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500 font-mono">
                          Pattern: {preset.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Format Option */}
              <div className="pt-4 border-t border-gray-100">
                <div
                  onClick={handleCustomSelect}
                  className={`rounded-xl p-5 border-2 transition cursor-pointer ${
                    isCustom
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✏️</span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Custom Date & Time Format</h3>
                        <p className="text-xs text-gray-500">
                          Input your desired format pattern using standard formatting tokens
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="dateTimePreset"
                      checked={isCustom}
                      onChange={handleCustomSelect}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {isCustom && (
                    <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Custom Format String:
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={customDateTimeFormat}
                            onChange={(e) => setCustomDateTimeFormat(e.target.value)}
                            placeholder="e.g. DD-MM-YYYY HH:mm:ss"
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <div className="bg-white px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-mono font-bold text-blue-800">
                            Preview: {baseFormatDateTime(SAMPLE_DATE, customDateTimeFormat || 'DD-MM-YYYY HH:mm:ss')}
                          </div>
                        </div>
                      </div>

                      {/* Token Reference Guide */}
                      <div className="bg-white/80 p-3 rounded-lg border border-blue-100 text-xs text-gray-600 space-y-1">
                        <p className="font-semibold text-gray-700">Supported Format Tokens:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                          <div><code className="text-blue-700 font-bold">DD</code> : Day (01-31)</div>
                          <div><code className="text-blue-700 font-bold">MM</code> : Month (01-12)</div>
                          <div><code className="text-blue-700 font-bold">MMM</code> : Month (Oct)</div>
                          <div><code className="text-blue-700 font-bold">YYYY</code> : Year (2026)</div>
                          <div><code className="text-blue-700 font-bold">HH</code> : 24-hr (00-23)</div>
                          <div><code className="text-blue-700 font-bold">hh</code> : 12-hr (01-12)</div>
                          <div><code className="text-blue-700 font-bold">mm</code> : Minutes (00-59)</div>
                          <div><code className="text-blue-700 font-bold">ss</code> : Seconds (00-59)</div>
                          <div><code className="text-blue-700 font-bold">A</code> : AM/PM</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Localization Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date-only Format */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>📆</span> Date Only Format
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Used in tables for DOB, Admission date, etc.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PREDEFINED_DATE_FORMATS.map((fmt) => (
                      <option key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs font-mono text-gray-700">
                  Preview: <span className="font-bold text-blue-600">{baseFormatDate(SAMPLE_DATE, dateFormat)}</span>
                </div>
              </div>

              {/* Time-only Format */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>⏰</span> Time Only Format
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Used for class timetables, attendance punches, etc.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Format</label>
                  <select
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PREDEFINED_TIME_FORMATS.map((fmt) => (
                      <option key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs font-mono text-gray-700">
                  Preview: <span className="font-bold text-blue-600">{baseFormatTime(SAMPLE_DATE, timeFormat)}</span>
                </div>
              </div>

              {/* Timezone */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>🌐</span> Timezone
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Standard timezone for school operations
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                    <option value="UTC">UTC (Universal Time Coordinated)</option>
                    <option value="America/New_York">America/New York (EST/EDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
                  </select>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs text-gray-700">
                  Current Zone: <span className="font-semibold text-blue-600">{timezone}</span>
                </div>
              </div>

              {/* Currency Configuration */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">₹</span> Currency
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    System currency for fees & payroll
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCurrency(val);
                      setCurrencySymbol(val === 'INR' ? '₹' : val === 'USD' ? '$' : '₹');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="INR">INR - Indian Rupee (₹)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                  </select>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-lg text-xs font-mono text-gray-700">
                  Preview: <span className="font-bold text-emerald-600">{currencySymbol} 50,000.00</span>
                </div>
              </div>
            </div>

            {/* Custom Fee Types Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>🏷️</span> Fee Types Management
                  </h3>
                  <p className="text-xs text-gray-500">
                    Add custom fee categories if not available in the default dropdown.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                  {customFeeTypes.length} Custom Added
                </span>
              </div>

              {/* Standard Fee Types summary */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Built-in Standard Types:</p>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_FEE_TYPES.map(t => (
                    <span key={t.id} className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 text-gray-700 font-medium border border-gray-200">
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Fee Types list */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Active Custom Fee Types:</p>
                {customFeeTypes.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No custom fee types added yet. You can add them here or directly in the Fee Structure form.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customFeeTypes.map(t => (
                      <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                        <span>{t.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeeTypeFromSettings(t.id)}
                          className="text-blue-500 hover:text-red-600 font-bold ml-1 cursor-pointer"
                          title={`Remove ${t.label}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Custom Fee Type Input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newFeeTypeName}
                  onChange={(e) => setNewFeeTypeName(e.target.value)}
                  placeholder="e.g. Computer Lab Fee, Robotics Club, Annual Magazine"
                  className="input-field text-sm flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeeTypeFromSettings();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddFeeTypeFromSettings}
                  disabled={!newFeeTypeName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  + Add Fee Type
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving || !isAdmin}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Reset to Defaults
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={saving || !isAdmin}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Saving Settings...
                </>
              ) : (
                <>
                  <span>💾</span> Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
