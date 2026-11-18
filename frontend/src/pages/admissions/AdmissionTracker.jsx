import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { admissionAPI } from '../../services/api';
import { toast } from 'react-toastify';

const STATUS_STAGES = [
  { key: 'submitted', label: 'Application Submitted', desc: 'Received & logged in registry' },
  { key: 'under_review', label: 'Under Review', desc: 'Verification in progress' },
  { key: 'documents_pending', label: 'Documents Pending', desc: 'Action required by parent' },
  { key: 'approved', label: 'Admission Approved', desc: 'Ready for enrollment' },
  { key: 'enrolled', label: 'Officially Enrolled', desc: 'Student ID & Section assigned' },
];

const AdmissionTracker = () => {
  const [searchParams] = useSearchParams();
  const queryAppNum = searchParams.get('app') || '';

  const [applicationNumber, setApplicationNumber] = useState(queryAppNum);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Re-upload state
  const [reuploadingDocId, setReuploadingDocId] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!applicationNumber.trim()) {
      setErrorMsg('Please enter your Application Number.');
      return;
    }
    if (!dateOfBirth) {
      setErrorMsg('Please enter student Date of Birth for identity verification.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await admissionAPI.trackApplication({
        application_number: applicationNumber.trim(),
        date_of_birth: dateOfBirth,
      });

      if (res.success && res.data) {
        setApplication(res.data);
      } else {
        setErrorMsg(res.message || 'Verification failed. Please verify credentials.');
        setApplication(null);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReupload = async (docId, file) => {
    if (!file || !application) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB size limit.');
      return;
    }

    setReuploadingDocId(docId);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await admissionAPI.reuploadDocument(application.application_number, docId, {
          name: file.name,
          size: file.size,
          data: reader.result,
        });

        if (res.success && res.data) {
          setApplication(res.data);
          toast.success('Document re-uploaded successfully! Status returned to review.');
        } else {
          toast.error(res.message || 'Failed to re-upload document.');
        }
      } catch (err) {
        toast.error('Upload failed.');
      } finally {
        setReuploadingDocId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const getStageIndex = (status) => {
    if (status === 'draft') return 0;
    if (status === 'submitted') return 1;
    if (status === 'under_review') return 2;
    if (status === 'documents_pending') return 2;
    if (status === 'verification_completed') return 3;
    if (status === 'approved') return 4;
    if (status === 'enrolled') return 5;
    if (status === 'rejected' || status === 'waitlisted') return 4;
    return 1;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-sans">
      {/* Universal Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/admissions" className="text-2xl hover:scale-105 transition">
              🏫
            </Link>
            <div>
              <h1 className="text-base font-black text-gray-950">
                Online Admission Status Tracker
              </h1>
              <p className="text-[11px] font-semibold text-blue-600">
                Secure Real-Time Application Lifecycle Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/admissions/apply"
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition"
            >
              Start New Application
            </Link>
            <Link
              to="/admissions"
              className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl transition"
            >
              Portal Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Tracking Area */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-8">
        {/* Verification Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="text-center space-y-1.5">
              <span className="text-3xl">🔍</span>
              <h2 className="text-xl font-black text-gray-950">Track Your Admission Application</h2>
              <p className="text-xs text-gray-500">
                Enter your unique Application Number and the student’s Date of Birth to access live updates.
              </p>
            </div>

            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Application Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADM-2027-000101"
                  value={applicationNumber}
                  onChange={(e) => setApplicationNumber(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Student Date of Birth (Identity Challenge) *
                </label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Verifying & Loading Record...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Track Status Now</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Application Status Dossier (Shown after verified) */}
        {application && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Status Card */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🎓</span>
                    <div>
                      <h3 className="text-lg font-black text-gray-950">
                        {application.first_name} {application.last_name}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono">
                        Application No: <strong className="text-blue-600">{application.application_number}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                      application.status === 'enrolled'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : application.status === 'approved'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : application.status === 'documents_pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : application.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    }`}
                  >
                    ● {application.status.replace(/_/g, ' ')}
                  </span>

                  <Link
                    to={`/admissions/acknowledgement/${application.application_number}`}
                    target="_blank"
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
                  >
                    <span>🖨️</span>
                    <span>Print Receipt</span>
                  </Link>
                </div>
              </div>

              {/* Status Stepper Timeline */}
              <div className="py-2">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-4">
                  Admission Milestone Progress
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {STATUS_STAGES.map((st, idx) => {
                    const currentIdx = getStageIndex(application.status);
                    const isPassed = idx + 1 <= currentIdx;
                    const isCurrent = idx + 1 === currentIdx;

                    return (
                      <div
                        key={st.key}
                        className={`p-3 rounded-2xl border text-center transition ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-400 shadow-xs ring-2 ring-blue-500/20'
                            : isPassed
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-slate-50 border-gray-200 opacity-50'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold mb-1.5 ${
                            isPassed ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          {isPassed ? '✓' : idx + 1}
                        </span>
                        <h4 className="text-xs font-bold leading-tight text-gray-900">{st.label}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{st.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block text-[10px] uppercase">Applying Grade</span>
                  <span className="font-extrabold text-gray-900 text-sm">{application.class_name || 'Class 1'}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[10px] uppercase">Academic Session</span>
                  <span className="font-extrabold text-gray-900 text-sm">{application.academic_session}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[10px] uppercase">Fee Payment</span>
                  <span className="font-extrabold text-emerald-600 text-sm">₹{application.payment_amount || 500} (Paid)</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block text-[10px] uppercase">Submission Date</span>
                  <span className="font-extrabold text-gray-900 text-sm">{application.submitted_at?.substring(0, 10)}</span>
                </div>
              </div>
            </div>

            {/* Enrolled Details Banner (If status is enrolled) */}
            {application.status === 'enrolled' && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <h4 className="text-lg font-black">Congratulations! Admission Confirmed & Enrolled</h4>
                    <p className="text-xs text-emerald-100">
                      Your ward has been officially registered into our institutional student roll.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-500/50 text-xs">
                  <div className="bg-white/10 rounded-xl p-3">
                    <span className="text-emerald-200 block text-[10px] font-bold uppercase">Official Student ID</span>
                    <span className="text-base font-black font-mono">{application.enrolled_admission_number || 'SLG-2026-003'}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <span className="text-emerald-200 block text-[10px] font-bold uppercase">Class Allotted</span>
                    <span className="text-base font-black">{application.enrolled_class || application.class_name}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <span className="text-emerald-200 block text-[10px] font-bold uppercase">Portal Credentials</span>
                    <span className="text-xs font-bold">Sent to registered email</span>
                  </div>
                </div>
              </div>
            )}

            {/* Document Verification & Re-Upload Center */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-gray-950 flex items-center gap-2">
                <span>📑</span> Document Verification Status
              </h3>

              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {(application.documents || []).map((doc) => {
                  const isRejected = doc.verification_status === 'rejected';
                  const isVerified = doc.verification_status === 'verified';

                  return (
                    <div key={doc.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition overflow-hidden">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 truncate">{doc.document_type.replace(/_/g, ' ').toUpperCase()}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase flex-shrink-0 ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {doc.verification_status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono break-all leading-relaxed" title={doc.file_name}>{doc.file_name}</p>
                        {doc.verification_notes && (
                          <p className="text-xs text-rose-700 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200 break-words">
                            <strong>Committee Note:</strong> {doc.verification_notes}
                          </p>
                        )}
                      </div>

                      {isRejected && (
                        <div className="flex-shrink-0 self-start sm:self-center">
                          <label className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer">
                            <span>📤</span>
                            <span>{reuploadingDocId === doc.id ? 'Uploading...' : 'Re-upload Document'}</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              disabled={reuploadingDocId === doc.id}
                              onChange={(e) => handleReupload(doc.id, e.target.files?.[0])}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Official School Remarks / Log */}
            {application.admin_remarks && (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-xs space-y-1">
                <span className="font-extrabold text-blue-900 uppercase tracking-wide block">
                  Official Admission Office Remarks
                </span>
                <p className="text-blue-950 leading-relaxed font-medium">{application.admin_remarks}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdmissionTracker;

