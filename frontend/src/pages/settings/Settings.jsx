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

const SAMPLE_DATE = new Date('2026-10-31T12:15:00');

const Settings = () => {
  const { settings, updateSettings, loading: initialLoading } = useSettings();
  const { user } = useAuth();
  const confirm = useConfirm();

  // Active navigation tab: 'all' | 'localization' | 'age_criteria'
  const [activeTab, setActiveTab] = useState('all');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const finalDateTimeFormat = isCustom 
      ? (customDateTimeFormat.trim() || 'DD-MM-YYYY HH:mm:ss') 
      : selectedPreset;

    const payload = {
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
    };

    await updateSettings(payload);
    setSaving(false);
  };

  const handleResetDefaults = async () => {
    const isConfirmed = await confirm({
      title: 'Reset System Settings',
      message: 'Are you sure you want to reset all localization, date/time, and age criteria settings to default values?',
      confirmText: 'Reset to Defaults',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (isConfirmed) {
      setSaving(true);
      await updateSettings({
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
      });
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
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          📋 All Settings
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
