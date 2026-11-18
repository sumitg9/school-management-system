import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { admissionAPI } from '../../../services/api';

export default function AdmissionSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await admissionAPI.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load admission settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleClassSeatChange = (index, field, value) => {
    setSettings(prev => {
      const updated = [...(prev.eligible_classes || [])];
      updated[index] = {
        ...updated[index],
        [field]: Number(value) || 0,
      };
      return { ...prev, eligible_classes: updated };
    });
  };

  const handleDocToggle = (index) => {
    setSettings(prev => {
      const updated = [...(prev.required_documents || [])];
      updated[index] = {
        ...updated[index],
        mandatory: !updated[index].mandatory,
      };
      return { ...prev, required_documents: updated };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await admissionAPI.updateSettings(settings);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Admission settings updated and published successfully!' });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to update settings.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Unexpected error saving admission settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading admission configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xl">⚙️</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">Admission System Settings</h1>
              <p className="text-xs sm:text-sm text-slate-500">Configure public application portals, seat capacities, fees, and validation rules.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admissions/manage"
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5"
          >
            ← Back to Admissions
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition ${
            activeTab === 'general'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          🌐 General & Session
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition ${
            activeTab === 'fees'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          💳 Fees & Payments
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition ${
            activeTab === 'classes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          🏫 Classes & Seat Capacities
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition ${
            activeTab === 'documents'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          📁 Document Checklist
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl transition ${
            activeTab === 'content'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          📜 Instructions & Declaration
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: General & Session */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>🌐</span> Portal Availability & Session Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 dark:border-indigo-950 dark:bg-indigo-950/20 col-span-full flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Online Admission Applications</h3>
                  <p className="text-xs text-slate-500">Allow parents and guardians to submit online admission applications through the public portal.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="online_admissions_enabled"
                    checked={settings.online_admissions_enabled || false}
                    onChange={handleGeneralChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Academic Session</label>
                <input
                  type="text"
                  name="academic_session"
                  value={settings.academic_session || ''}
                  onChange={handleGeneralChange}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 2026-2027"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Application Number Prefix</label>
                <input
                  type="text"
                  name="application_number_prefix"
                  value={settings.application_number_prefix || 'ADM'}
                  onChange={handleGeneralChange}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase tracking-widest"
                  placeholder="e.g. ADM"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Example generated: {settings.application_number_prefix || 'ADM'}-2027-000101</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Portal Opening Date</label>
                <input
                  type="date"
                  name="opening_date"
                  value={settings.opening_date || ''}
                  onChange={handleGeneralChange}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Portal Closing Date</label>
                <input
                  type="date"
                  name="closing_date"
                  value={settings.closing_date || ''}
                  onChange={handleGeneralChange}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Fees & Payments */}
        {activeTab === 'fees' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>💳</span> Registration Fee & Payment Policy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Registration Application Fee (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs font-black text-slate-400">₹</span>
                  <input
                    type="number"
                    name="registration_fee"
                    value={settings.registration_fee ?? 500}
                    onChange={handleGeneralChange}
                    min="0"
                    step="10"
                    className="w-full pl-8 pr-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Set to 0 to provide free registration applications.</p>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="fee_mandatory"
                    checked={settings.fee_mandatory ?? true}
                    onChange={handleGeneralChange}
                    className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">Mandatory Payment before Final Submission</span>
                    <span className="text-[11px] text-slate-500">When enabled, applicants must complete online checkout or provide cash counter receipt ref.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1">Supported Payment Channels</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Applicants can checkout via Razorpay (UPI, Credit/Debit Cards, NetBanking, Wallets) or select "Cash Counter Payment" to remit at the school bursar desk.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Classes & Seat Capacities */}
        {activeTab === 'classes' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span>🏫</span> Eligible Classes & Age Thresholds
                </h2>
                <p className="text-xs text-slate-500">Configure total seats and minimum/maximum age eligibility as of June 1st of the academic year.</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Min Age (Years & Months)</th>
                    <th className="py-3 px-4">Max Age (Years & Months)</th>
                    <th className="py-3 px-4">Total Seats</th>
                    <th className="py-3 px-4">Filled / Admitted</th>
                    <th className="py-3 px-4">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(settings.eligible_classes || []).map((cls, idx) => {
                    const available = Math.max(0, (cls.seats || 0) - (cls.filled || 0));
                    return (
                      <tr key={cls.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-black text-slate-800 dark:text-white">
                          {cls.name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="3"
                              max="20"
                              value={cls.minAgeYears ?? 5}
                              onChange={(e) => handleClassSeatChange(idx, 'minAgeYears', e.target.value)}
                              className="w-14 px-2 py-1 text-center font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                            />
                            <span className="text-slate-400">Y</span>
                            <input
                              type="number"
                              min="0"
                              max="11"
                              value={cls.minAgeMonths ?? 6}
                              onChange={(e) => handleClassSeatChange(idx, 'minAgeMonths', e.target.value)}
                              className="w-12 px-2 py-1 text-center font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                            />
                            <span className="text-slate-400">M</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="3"
                              max="22"
                              value={cls.maxAgeYears ?? 7}
                              onChange={(e) => handleClassSeatChange(idx, 'maxAgeYears', e.target.value)}
                              className="w-14 px-2 py-1 text-center font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                            />
                            <span className="text-slate-400">Y</span>
                            <input
                              type="number"
                              min="0"
                              max="11"
                              value={cls.maxAgeMonths ?? 0}
                              onChange={(e) => handleClassSeatChange(idx, 'maxAgeMonths', e.target.value)}
                              className="w-12 px-2 py-1 text-center font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                            />
                            <span className="text-slate-400">M</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={cls.seats ?? 80}
                            onChange={(e) => handleClassSeatChange(idx, 'seats', e.target.value)}
                            className="w-20 px-2 py-1 font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-500">
                          {cls.filled || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            available > 10 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {available} seats left
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Documents Checklist */}
        {activeTab === 'documents' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>📁</span> Document Checklist Rules
              </h2>
              <p className="text-xs text-slate-500">Toggle which documents are mandatory vs optional for parents to submit online.</p>
            </div>

            <div className="space-y-3">
              {(settings.required_documents || []).map((doc, idx) => (
                <div key={doc.type || idx} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">{doc.name}</h4>
                    <p className="text-[11px] text-slate-500">Allowed formats: {doc.acceptedTypes} (Max 5MB)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      doc.mandatory ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {doc.mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDocToggle(idx)}
                      className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Toggle {doc.mandatory ? 'Optional' : 'Mandatory'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Content & Declarations */}
        {activeTab === 'content' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>📜</span> Instructions & Parent Declaration Terms
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Public Portal Instructions Banner</label>
                <textarea
                  name="instructions"
                  rows="3"
                  value={settings.instructions || ''}
                  onChange={handleGeneralChange}
                  className="w-full text-xs font-medium p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="Instructions displayed to applicants before beginning form..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Parent / Guardian Legal Declaration</label>
                <textarea
                  name="declaration_text"
                  rows="3"
                  value={settings.declaration_text || ''}
                  onChange={handleGeneralChange}
                  className="w-full text-xs font-medium p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  placeholder="Legal declaration applicants must accept before final submission..."
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

