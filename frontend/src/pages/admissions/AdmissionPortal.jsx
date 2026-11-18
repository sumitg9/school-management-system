import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admissionAPI } from '../../services/api';
import { calculateAge } from '../../utils/dateFormatter';
import { useAuth } from '../../context/AuthContext';

const AdmissionPortal = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isSuperAdmin, isAdmin } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumeToken, setResumeToken] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Quick Age & Eligibility Checker State
  const [calcDob, setCalcDob] = useState('');
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await admissionAPI.getPublicConfig();
        if (res.success) {
          setConfig(res.data);
        }
      } catch (err) {
        console.error('Failed to load admission public config:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleAgeCheck = (e) => {
    e.preventDefault();
    if (!calcDob) return;
    const age = calculateAge(calcDob);
    if (!age) return;

    // Match against eligible classes
    const eligibleClasses = (config?.eligible_classes || []).filter((cls) => {
      const minMonths = (cls.minAgeYears || 5) * 12 + (cls.minAgeMonths || 0);
      const maxMonths = (cls.maxAgeYears || 18) * 12 + (cls.maxAgeMonths || 0);
      return age.totalMonths >= minMonths && age.totalMonths <= maxMonths;
    });

    setCalcResult({
      ageString: `${age.years} years, ${age.months} months`,
      eligibleClasses,
    });
  };

  const handleResumeDraft = async (e) => {
    e.preventDefault();
    if (!resumeToken.trim()) {
      setResumeError('Please enter a valid draft verification code or link.');
      return;
    }
    const cleanToken = resumeToken.trim();
    const res = await admissionAPI.getDraft(cleanToken);
    if (res.success) {
      navigate(`/admissions/apply?draft=${cleanToken}`);
    } else {
      setResumeError(res.message || 'No saved draft found matching this token.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-gray-600">Loading Admission Portal...</p>
        </div>
      </div>
    );
  }

  const isOpen = config?.online_admissions_enabled;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans">
      {/* Top Universal School Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">{config?.school_logo?.replace('preset:', '') || '🏫'}</span>
            <div>
              <h1 className="text-lg font-black text-gray-950 tracking-tight leading-tight">
                {config?.school_name || 'Delhi Public Academy'}
              </h1>
              <p className="text-xs font-semibold text-blue-600 tracking-wide uppercase">
                Online Admissions & Enrollment Portal • Session {config?.academic_session || '2026-2027'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/admissions/track"
              className="text-xs font-bold text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition hidden sm:inline-flex items-center gap-1.5"
            >
              <span>🔍</span> Track Application
            </Link>
            <button
              type="button"
              onClick={() => setShowResumeModal(true)}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>📂</span> Resume Draft
            </button>
            {isAuthenticated ? (
              <Link
                to="/admissions/manage"
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
              >
                <span>⚙️</span> Manage Admissions
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition inline-flex items-center gap-1.5"
              >
                <span>🔐</span> Staff / Parent Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Admission Banner */}
      <section className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20">
            <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span>{isOpen ? 'Admissions Open for Session ' + config?.academic_session : 'Admissions Currently Closed'}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            Welcome to {config?.school_name}
            <span className="block text-blue-300 font-extrabold text-2xl sm:text-3xl mt-2">
              Shape Your Child’s Future With World-Class Education
            </span>
          </h2>

          <p className="text-sm sm:text-base text-blue-100/90 max-w-2xl mx-auto leading-relaxed">
            Apply online from the comfort of your home. Complete our straightforward step-by-step application form, upload required documents, and track application milestones in real time.
          </p>

          {/* Call to Actions */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            {isOpen ? (
              <Link
                to="/admissions/apply"
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-950/30 transition transform hover:-translate-y-0.5 inline-flex items-center gap-2"
              >
                <span>✍️</span> Apply Now for Admission
              </Link>
            ) : (
              <button
                disabled
                className="px-8 py-4 bg-gray-500 text-gray-200 font-bold text-base rounded-2xl cursor-not-allowed"
              >
                Admissions Closed
              </button>
            )}

            <Link
              to="/admissions/track"
              className="px-6 py-4 bg-white/15 hover:bg-white/25 text-white font-bold text-base rounded-2xl backdrop-blur-md border border-white/20 transition inline-flex items-center gap-2"
            >
              <span>🔍</span> Track Application Status
            </Link>
          </div>

          {/* Highlights summary */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4">
              <span className="text-2xl block mb-1">📅</span>
              <p className="text-[11px] text-blue-200 uppercase font-bold">Academic Session</p>
              <p className="text-sm font-extrabold">{config?.academic_session || '2026-2027'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4">
              <span className="text-2xl block mb-1">🏛️</span>
              <p className="text-[11px] text-blue-200 uppercase font-bold">Affiliation</p>
              <p className="text-sm font-extrabold">{config?.school_curriculum || 'CBSE'} Board</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4">
              <span className="text-2xl block mb-1">💳</span>
              <p className="text-[11px] text-blue-200 uppercase font-bold">Registration Fee</p>
              <p className="text-sm font-extrabold">₹{config?.registration_fee || 500}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4">
              <span className="text-2xl block mb-1">⚡</span>
              <p className="text-[11px] text-blue-200 uppercase font-bold">Processing Time</p>
              <p className="text-sm font-extrabold">3 - 5 Working Days</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Info Sections */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 space-y-12">
        {/* Instructions & Guidelines Alert */}
        <div className="bg-blue-50 border-l-4 border-blue-600 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <span>ℹ️</span> Important Instructions for Applicants
            </h3>
            <p className="text-xs text-blue-900 leading-relaxed max-w-4xl">
              {config?.instructions ||
                'Please ensure that all student demographic details and parent mobile contacts are entered accurately. Applications can be saved as draft at any stage and resumed later.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowResumeModal(true)}
            className="text-xs font-bold text-blue-700 bg-white border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-100 transition whitespace-nowrap cursor-pointer"
          >
            Resume Incomplete Draft
          </button>
        </div>

        {/* 2-Column: Eligibility Checker & Required Documents */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Quick Age & Class Eligibility Calculator */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>🧮</span> Age & Class Eligibility Calculator
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Enter student date of birth to instantly determine which classes your child is eligible for under {config?.school_curriculum || 'CBSE'} guidelines.
              </p>
            </div>

            <form onSubmit={handleAgeCheck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Student Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={calcDob}
                  onChange={(e) => setCalcDob(e.target.value)}
                  max={new Date().toISOString().substring(0, 10)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🔍</span> Check Eligible Classes
              </button>
            </form>

            {calcResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">Calculated Age:</span>
                  <span className="font-extrabold text-emerald-950">{calcResult.ageString}</span>
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-xs font-bold text-emerald-900 block mb-1.5">Eligible Classes:</span>
                  {calcResult.eligibleClasses.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {calcResult.eligibleClasses.map((cls) => (
                        <span key={cls.id} className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg shadow-2xs">
                          {cls.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 font-medium">
                      Child age does not match pre-configured age brackets. You may still apply under discretionary approval.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Required Documents Checklist */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <span>📑</span> Required Documents Checklist
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Have digital copies (PDF, JPG, PNG under 5MB) ready before starting the application.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                {config?.required_documents?.length || 6} Items
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(config?.required_documents || []).map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex items-start space-x-3 hover:bg-slate-100/70 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${doc.mandatory ? 'bg-rose-100 text-rose-800' : 'bg-gray-200 text-gray-700'}`}>
                        {doc.mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">Max 5MB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
              <span>⚠️</span>
              <span>Documents can also be uploaded or replaced later if correction is requested by the admission committee.</span>
            </div>
          </div>
        </div>

        {/* 7-Step Admission Journey Flow */}
        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xs space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1">
            <h3 className="text-xl font-black text-gray-950">How the Online Admission Process Works</h3>
            <p className="text-xs text-gray-500">7 seamless steps from online submission to official enrollment</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {[
              { step: '01', title: 'Fill Information', desc: 'Complete student, parent, and address details in the multi-step form.', icon: '✍️' },
              { step: '02', title: 'Upload Documents', desc: 'Securely attach student photo, birth certificate, and address proof.', icon: '📤' },
              { step: '03', title: 'Review & Pay', desc: 'Review entered details and pay the registration fee via UPI, card, or net banking.', icon: '💳' },
              { step: '04', title: 'Admission & Enroll', desc: 'Track review status online; upon approval, receive official enrollment ID.', icon: '🎓' },
            ].map((st, i) => (
              <div key={i} className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-gray-200 relative">
                <span className="text-2xl block mb-2">{st.icon}</span>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Step {st.step}</span>
                <h4 className="text-sm font-bold text-gray-900 mb-1">{st.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Classes & Quotas Table */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <span>📚</span> Available Classes & Age Brackets
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Session {config?.academic_session || '2026-2027'} admission availability</p>
            </div>
            <Link
              to="/admissions/apply"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Start Application &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-100 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-gray-600 uppercase font-bold text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Class / Grade</th>
                  <th className="py-3 px-4">Minimum Age</th>
                  <th className="py-3 px-4">Maximum Age</th>
                  <th className="py-3 px-4">Seat Capacity</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(config?.eligible_classes || []).map((cls) => {
                  const available = (cls.seats || 80) - (cls.filled || 0);
                  const isAvailable = available > 0;
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-bold text-gray-900">{cls.name}</td>
                      <td className="py-3 px-4 text-gray-600">{cls.minAgeYears} Years {cls.minAgeMonths ? `${cls.minAgeMonths} Months` : ''}</td>
                      <td className="py-3 px-4 text-gray-600">{cls.maxAgeYears} Years</td>
                      <td className="py-3 px-4 text-gray-600 font-mono">{available} Available / {cls.seats || 80} Total</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isAvailable ? 'Seats Open' : 'Waitlist Only'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Resume Draft Modal */}
      {showResumeModal && (
        <div className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📂</span>
                <h4 className="text-base font-extrabold text-gray-900">Resume Incomplete Application</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Enter the draft verification link or token provided when you previously saved your application.
            </p>

            <form onSubmit={handleResumeDraft} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Draft Token / Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. tok_draft_174000..."
                  value={resumeToken}
                  onChange={(e) => {
                    setResumeToken(e.target.value);
                    setResumeError('');
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
                {resumeError && (
                  <p className="text-xs text-rose-600 font-semibold mt-1.5">{resumeError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResumeModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                >
                  Resume Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portal Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-base">🎓</span>
            <span className="font-bold text-gray-800">{config?.school_name}</span>
            <span>• Online Admissions Portal</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>📍 {config?.school_address || 'Hill Cart Road, Siliguri'}</span>
            <span>📞 {config?.school_phone || '+91 353 2548900'}</span>
            <span>✉️ {config?.school_email || 'admissions@dpa.edu'}</span>
          </div>
          <p>© {new Date().getFullYear()} {config?.school_name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AdmissionPortal;

