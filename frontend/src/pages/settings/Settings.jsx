import { useState, useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { 
  PREDEFINED_DATE_TIME_FORMATS, 
  PREDEFINED_DATE_FORMATS, 
  PREDEFINED_TIME_FORMATS,
  formatDateTime as baseFormatDateTime,
  formatDate as baseFormatDate,
  formatTime as baseFormatTime
} from '../../utils/dateFormatter';
import { useAuth } from '../../context/AuthContext';

const SAMPLE_DATE = new Date('2026-10-31T12:15:00');

const Settings = () => {
  const { settings, updateSettings, loading: initialLoading } = useSettings();
  const { user } = useAuth();

  // Form states
  const [selectedPreset, setSelectedPreset] = useState('DD-MM-YYYY HH:mm:ss');
  const [customDateTimeFormat, setCustomDateTimeFormat] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
  const [timeFormat, setTimeFormat] = useState('HH:mm:ss');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  const [saving, setSaving] = useState(false);
  const [liveNow, setLiveNow] = useState(new Date());

  // Tick live preview every second
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
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
    };

    await updateSettings(payload);
    setSaving(false);
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Are you sure you want to reset date and time settings to default (31-10-2026 12:15:00 format)?')) {
      setSaving(true);
      await updateSettings({
        date_time_format: 'DD-MM-YYYY HH:mm:ss',
        date_format: 'DD-MM-YYYY',
        time_format: 'HH:mm:ss',
        timezone: 'Asia/Kolkata',
      });
      setSelectedPreset('DD-MM-YYYY HH:mm:ss');
      setIsCustom(false);
      setCustomDateTimeFormat('');
      setDateFormat('DD-MM-YYYY');
      setTimeFormat('HH:mm:ss');
      setTimezone('Asia/Kolkata');
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
            Configure application date & time formatting, localization, and system preferences.
          </p>
        </div>
        {!isAdmin && (
          <div className="mt-3 md:mt-0 px-4 py-2 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200">
            ℹ️ Viewing as read-only. Administrator privileges required to change settings.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <span>🌐</span> Application Timezone
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
        </div>

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

