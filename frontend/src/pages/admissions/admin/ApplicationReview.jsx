import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { admissionAPI } from '../../../services/api';
import EnrollmentModal from './EnrollmentModal';
import { toast } from 'react-toastify';

const ApplicationReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('student');
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Status Action Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusActionType, setStatusActionType] = useState('approved');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Document Verification State
  const [selectedDocPreview, setSelectedDocPreview] = useState(null);

  // Document Correction Request Modal
  const [correctionModalDoc, setCorrectionModalDoc] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await admissionAPI.getById(id);
      if (res.success && res.data) {
        setApplication(res.data);
      } else {
        toast.error('Application not found.');
      }
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchApplication();
  }, [id]);

  const handleUpdateStatus = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await admissionAPI.updateStatus(application.id, {
        status: statusActionType,
        remarks: statusRemarks,
        admin_remarks: statusRemarks,
        rejection_reason: statusActionType === 'rejected' ? statusRemarks : undefined,
        admin_name: 'Admissions Officer',
      });

      if (res.success) {
        setApplication(res.data);
        setShowStatusModal(false);
        setStatusRemarks('');
        toast.success(`Application updated to ${statusActionType.replace(/_/g, ' ')}.`);
      } else {
        toast.error(res.message || 'Status update failed.');
      }
    } catch (err) {
      toast.error('Internal update error.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleVerifyDocument = async (docId, status, notes = '') => {
    try {
      const res = await admissionAPI.verifyDocument(application.id, docId, { status, notes });
      if (res.success) {
        toast.success(`Document marked as ${status}.`);
        fetchApplication();
      }
    } catch (err) {
      toast.error('Document verification failed.');
    }
  };

  const handleConfirmCorrection = async (e) => {
    e.preventDefault();
    if (!correctionModalDoc) return;
    if (!correctionReason.trim()) {
      toast.warn('Please provide instructions for the applicant.');
      return;
    }
    try {
      setIsSubmittingCorrection(true);
      await handleVerifyDocument(correctionModalDoc.id, 'rejected', correctionReason.trim());
      setCorrectionModalDoc(null);
      setCorrectionReason('');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm font-bold text-gray-500">
        Loading Applicant Dossier...
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-rose-600">Application not found.</p>
        <Link to="/admissions/manage" className="text-xs font-bold text-blue-600 hover:underline">
          &larr; Back to Admissions Management
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* Top Breadcrumb & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 mb-1">
            <Link to="/admissions/manage" className="hover:text-blue-600 transition">
              Admissions
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-mono">{application.application_number}</span>
          </div>

          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-black text-gray-950 tracking-tight">
              {application.first_name} {application.last_name}
            </h1>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                application.status === 'enrolled'
                  ? 'bg-emerald-100 text-emerald-800'
                  : application.status === 'approved'
                  ? 'bg-blue-100 text-blue-800'
                  : application.status === 'documents_pending'
                  ? 'bg-amber-100 text-amber-800'
                  : application.status === 'rejected'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              ● {application.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {application.status === 'approved' && (
            <button
              type="button"
              onClick={() => setShowEnrollModal(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>🎓</span> Enroll Student
            </button>
          )}

          {application.status !== 'enrolled' && (
            <>
              {application.status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusActionType('approved');
                    setShowStatusModal(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>✓</span> Approve
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setStatusActionType('documents_pending');
                  setShowStatusModal(true);
                }}
                className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>⚠️</span> Request Correction
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusActionType('waitlisted');
                  setShowStatusModal(true);
                }}
                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Waitlist
              </button>

              {application.status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusActionType('rejected');
                    setShowStatusModal(true);
                  }}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
                >
                  Reject
                </button>
              )}
            </>
          )}

          <Link
            to={`/admissions/acknowledgement/${application.application_number}`}
            target="_blank"
            className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5"
          >
            <span>🖨️</span> Acknowledgement
          </Link>
        </div>
      </div>

      {/* Highlights Strip */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-gray-400 font-bold uppercase text-[10px] block">Target Grade</span>
          <span className="text-sm font-black text-gray-950">{application.class_name || 'Class 1'}</span>
          <span className="text-gray-500 block">Preferred Sec {application.preferred_section}</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold uppercase text-[10px] block">Date of Birth</span>
          <span className="text-sm font-black text-gray-950">{application.date_of_birth}</span>
          <span className="text-gray-500 block capitalize">{application.gender} • {application.blood_group}</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold uppercase text-[10px] block">Primary Phone</span>
          <span className="text-sm font-black text-gray-950">{application.phone || application.guardians?.father_phone || 'N/A'}</span>
          <span className="text-gray-500 block truncate">{application.email || 'N/A'}</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold uppercase text-[10px] block">Fee Status</span>
          <span className="text-sm font-black text-emerald-700">₹{application.payment_amount || 500} Paid</span>
          <span className="text-gray-500 block font-mono text-[10px]">{application.payment_method}</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 space-x-2 overflow-x-auto scrollbar-none">
        {[
          { key: 'student', label: 'Student Profile', icon: '👨‍🎓' },
          { key: 'guardians', label: 'Parents & Guardians', icon: '👨‍👩‍👧' },
          { key: 'address', label: 'Address & Domicile', icon: '📍' },
          { key: 'academic', label: 'Previous Schooling', icon: '🏛️' },
          { key: 'documents', label: `Documents (${application.documents?.length || 0})`, icon: '📁' },
          { key: 'timeline', label: 'Audit Timeline', icon: '⏱️' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Tab 1: Student Profile */}
        {activeTab === 'student' && (
          <div className="space-y-6 text-xs">
            <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">
              Student Demographic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">First Name</span>
                <span className="text-sm font-extrabold text-gray-900">{application.first_name}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Last Name</span>
                <span className="text-sm font-extrabold text-gray-900">{application.last_name || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Date of Birth</span>
                <span className="text-sm font-extrabold text-gray-900">{application.date_of_birth}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Gender</span>
                <span className="text-sm font-bold text-gray-900 capitalize">{application.gender}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Blood Group</span>
                <span className="text-sm font-bold text-gray-900">{application.blood_group || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Nationality</span>
                <span className="text-sm font-bold text-gray-900">{application.nationality || 'Indian'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Mother Tongue</span>
                <span className="text-sm font-bold text-gray-900">{application.mother_tongue || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Religion & Caste</span>
                <span className="text-sm font-bold text-gray-900">{application.religion || '—'} ({application.caste || 'General'})</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Birth Certificate Registration</span>
                <span className="text-sm font-bold font-mono text-gray-900">{application.birth_certificate_number || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Parents & Guardians */}
        {activeTab === 'guardians' && (
          <div className="space-y-6 text-xs">
            <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">
              Parent & Guardian Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Father */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-xs font-black text-blue-900 uppercase">Father Information</span>
                <p><span className="text-gray-500">Name:</span> <strong>{application.guardians?.father_name || 'N/A'}</strong></p>
                <p><span className="text-gray-500">Phone:</span> <strong>{application.guardians?.father_phone || 'N/A'}</strong></p>
                <p><span className="text-gray-500">Email:</span> <strong>{application.guardians?.father_email || 'N/A'}</strong></p>
                <p><span className="text-gray-500">Occupation:</span> <strong>{application.guardians?.father_occupation || 'N/A'}</strong></p>
              </div>

              {/* Mother */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-xs font-black text-indigo-900 uppercase">Mother Information</span>
                <p><span className="text-gray-500">Name:</span> <strong>{application.guardians?.mother_name || 'N/A'}</strong></p>
                <p><span className="text-gray-500">Phone:</span> <strong>{application.guardians?.mother_phone || 'N/A'}</strong></p>
                <p><span className="text-gray-500">Email:</span> <strong>{application.guardians?.mother_email || 'N/A'}</strong></p>
                <p><span className="text-gray-500">Occupation:</span> <strong>{application.guardians?.mother_occupation || 'N/A'}</strong></p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Address & Domicile */}
        {activeTab === 'address' && (
          <div className="space-y-6 text-xs">
            <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">
              Residential Address Details
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-1.5">
                <span className="text-xs font-extrabold text-blue-900 uppercase block">Permanent Domicile Address</span>
                <p className="text-sm font-bold text-gray-900">{application.permanent_address || '—'}</p>
                <p className="text-gray-600">
                  {application.city}, {application.district ? `${application.district}, ` : ''}{application.state} - {application.postal_code}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-1.5">
                <span className="text-xs font-extrabold text-blue-900 uppercase block">Correspondence Address</span>
                <p className="text-sm font-bold text-gray-900">{application.correspondence_address || application.permanent_address || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Previous Academic */}
        {activeTab === 'academic' && (
          <div className="space-y-6 text-xs">
            <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">
              Previous School & Transfer Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Previous School Name</span>
                <span className="text-sm font-bold text-gray-900">{application.previous_school || 'First-time Schooling'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Affiliated Board</span>
                <span className="text-sm font-bold text-gray-900">{application.previous_board || '—'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Last Class Completed</span>
                <span className="text-sm font-bold text-gray-900">{application.previous_class || '—'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Score / Percentage</span>
                <span className="text-sm font-bold text-gray-900">{application.previous_percentage || '—'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-1 sm:col-span-2">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Transfer Certificate Details</span>
                <span className="text-sm font-mono font-bold text-gray-900">
                  {application.transfer_certificate_number ? `TC No: ${application.transfer_certificate_number} (Issued: ${application.transfer_certificate_date || 'N/A'})` : 'No TC attached'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Document Verification Locker */}
        {activeTab === 'documents' && (
          <div className="space-y-6 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-extrabold text-gray-900">
                Uploaded Applicant Documents
              </h3>
              <span className="text-xs text-gray-500 font-semibold">
                Click Verify or Request Correction per document
              </span>
            </div>

            <div className="space-y-3">
              {(application.documents || []).map((doc) => {
                const isVerified = doc.verification_status === 'verified';
                const isRejected = doc.verification_status === 'rejected';

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {doc.document_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase flex-shrink-0 ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.verification_status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-mono break-all leading-relaxed" title={doc.file_name}>
                        <span className="font-medium text-gray-800">{doc.file_name}</span>
                        <span className="text-gray-400 whitespace-nowrap ml-2">• {(doc.file_size / 1024).toFixed(0)} KB</span>
                        {doc.file_url && (
                          <button
                            type="button"
                            onClick={() => setSelectedDocPreview(doc)}
                            className="ml-2.5 text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>👁️</span> Preview
                          </button>
                        )}
                      </p>
                      {doc.verification_notes && (
                        <p className="text-xs text-rose-700 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200 break-words">
                          <strong>Note:</strong> {doc.verification_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-center">
                      <button
                        type="button"
                        onClick={() => handleVerifyDocument(doc.id, 'verified', 'Verified by committee')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex-shrink-0 ${
                          isVerified
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        ✓ Mark Verified
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCorrectionModalDoc(doc);
                          setCorrectionReason(doc.verification_notes || 'Image is blurry or unreadable. Please upload a clear high-resolution scanned copy or PDF.');
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex-shrink-0 ${
                          isRejected
                            ? 'bg-rose-600 text-white'
                            : 'bg-white border border-gray-300 hover:bg-rose-50 text-rose-700'
                        }`}
                      >
                        ✕ Request Correction
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 6: Audit Timeline Log */}
        {activeTab === 'timeline' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">
              Chronological Audit Trail & Status History
            </h3>

            <div className="space-y-3">
              {(application.status_history || []).map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-gray-900 uppercase tracking-wide">
                      {log.from_status ? `${log.from_status} → ${log.to_status}` : log.to_status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">{log.created_at}</span>
                  </div>
                  <p className="text-gray-700">{log.remarks}</p>
                  <p className="text-[10px] text-gray-500 font-semibold">Updated by: {log.changed_by_name || 'Admin'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enrollment Conversion Modal */}
      {showEnrollModal && (
        <EnrollmentModal
          application={application}
          onClose={() => setShowEnrollModal(false)}
          onEnrolled={(updatedApp) => {
            setApplication(updatedApp);
          }}
        />
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-base font-extrabold text-gray-900 capitalize">
                Update Status to: {statusActionType.replace(/_/g, ' ')}
              </h4>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Provide an administrative note or remarks. This will be recorded in the status timeline and made visible to the applicant.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Remarks / Reason *</label>
              <textarea
                rows="3"
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder="e.g. All academic criteria and birth certificate verified. Application approved."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              ></textarea>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="min-w-0 flex-1 mr-4">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {selectedDocPreview.document_type.replace(/_/g, ' ').toUpperCase()} Preview
                </h3>
                <p className="text-xs text-gray-500 font-mono truncate">{selectedDocPreview.file_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocPreview(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-2xl p-4">
              {selectedDocPreview.file_url ? (
                selectedDocPreview.mime_type?.startsWith('image/') || selectedDocPreview.file_url?.startsWith('data:image/') ? (
                  <img
                    src={selectedDocPreview.file_url}
                    alt={selectedDocPreview.file_name}
                    className="max-h-[50vh] max-w-full rounded-xl object-contain shadow-sm"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <span className="text-4xl">📄</span>
                    <p className="text-xs text-gray-600 font-medium font-mono break-all">{selectedDocPreview.file_name}</p>
                    <a
                      href={selectedDocPreview.file_url}
                      download={selectedDocPreview.file_name}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      Open / Download File
                    </a>
                  </div>
                )
              ) : (
                <div className="text-center p-6 space-y-2">
                  <span className="text-3xl">📄</span>
                  <p className="text-xs text-gray-500 font-mono break-all">{selectedDocPreview.file_name}</p>
                  <p className="text-xs text-gray-400">File stored securely in private admission repository.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDocPreview(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Correction Request Dialog Modal */}
      {correctionModalDoc && (
        <div className="fixed inset-0 z-50 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-scaleUp">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl text-xl">⚠️</span>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Request Document Correction</h3>
                  <p className="text-xs text-gray-500">Provide instructions for the applicant to re-upload.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCorrectionModalDoc(null);
                  setCorrectionReason('');
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Document Details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  {correctionModalDoc.document_type.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {correctionModalDoc.verification_status}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono break-all">{correctionModalDoc.file_name}</p>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">Quick Reason Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Image is blurry or unreadable. Please upload a clear high-res scan or PDF.',
                  'Official registration seal or signature is missing or cut off.',
                  'Incorrect document uploaded. Please upload the requested certificate.',
                  'Document has expired. Please upload a valid current certificate.',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCorrectionReason(preset)}
                    className="text-[11px] font-medium bg-gray-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-gray-200 px-2.5 py-1 rounded-lg transition text-left cursor-pointer"
                  >
                    {idx === 0 && '📷 '}
                    {idx === 1 && '🏛️ '}
                    {idx === 2 && '📄 '}
                    {idx === 3 && '⏳ '}
                    {preset.length > 40 ? preset.substring(0, 38) + '...' : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <form onSubmit={handleConfirmCorrection} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Applicant Instructions (shown on tracking portal) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Explain why this document was rejected and what the applicant needs to upload..."
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-hidden font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setCorrectionModalDoc(null);
                    setCorrectionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection || !correctionReason.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingCorrection ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>✕</span>
                      <span>Request Correction</span>
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

export default ApplicationReview;

