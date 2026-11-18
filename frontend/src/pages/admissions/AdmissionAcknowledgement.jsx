import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { admissionAPI } from '../../services/api';

const AdmissionAcknowledgement = () => {
  const { appNumber } = useParams();
  const [application, setApplication] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        setLoading(true);
        const [appRes, configRes] = await Promise.all([
          admissionAPI.getById(appNumber),
          admissionAPI.getPublicConfig(),
        ]);
        if (appRes.success) setApplication(appRes.data);
        if (configRes.success) setConfig(configRes.data);
      } catch (err) {
        console.error('Failed to load acknowledgement receipt:', err);
      } finally {
        setLoading(false);
      }
    };
    if (appNumber) fetchReceiptData();
  }, [appNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-sm font-bold text-gray-600">Generating Official Acknowledgement Receipt...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 space-y-4">
        <p className="text-sm font-bold text-rose-600">No application record found for {appNumber}.</p>
        <Link to="/admissions" className="text-xs font-bold text-blue-600 hover:underline">
          Return to Admission Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 py-8 px-4 font-sans print:p-0 print:bg-white text-gray-900">
      {/* Floating Action Header (Hidden in Print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between no-print">
        <Link
          to="/admissions"
          className="text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5"
        >
          &larr; Back to Portal
        </Link>

        <div className="flex items-center space-x-2">
          <Link
            to={`/admissions/track?app=${application.application_number}`}
            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition"
          >
            Track Status
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
          >
            <span>🖨️</span> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Official A4 Document Card */}
      <div className="max-w-3xl mx-auto bg-white border border-gray-300 rounded-2xl shadow-xl p-8 sm:p-12 print:shadow-none print:border-none print:p-0 print:rounded-none relative overflow-hidden">
        {/* Background Institutional Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-4 select-none">
          <span className="text-7xl font-black rotate-[-30deg] tracking-widest uppercase">
            ADMISSION ACKNOWLEDGEMENT
          </span>
        </div>

        {/* Institution Letterhead */}
        <div className="text-center border-b-2 border-gray-900 pb-5 space-y-1 relative z-10">
          <div className="flex justify-center items-center space-x-2.5">
            <span className="text-3xl">{config?.school_logo?.replace('preset:', '') || '🏫'}</span>
            <h1 className="text-2xl font-black text-gray-950 uppercase tracking-tight">
              {config?.school_name || 'Delhi Public Academy'}
            </h1>
          </div>
          <p className="text-xs font-semibold text-gray-600">
            Affiliated to Central Board of Secondary Education • Institutional Code: DPA-SIL-01
          </p>
          <p className="text-[11px] text-gray-500">
            {config?.school_address || 'Hill Cart Road, Pradhan Nagar, Siliguri, WB 734001'} • Helpline: {config?.school_phone || '+91 353 2548900'}
          </p>
          <div className="pt-2">
            <span className="px-4 py-1 bg-gray-900 text-white text-xs font-extrabold rounded-md uppercase tracking-wider">
              ONLINE ADMISSION APPLICATION ACKNOWLEDGEMENT • SESSION {application.academic_session}
            </span>
          </div>
        </div>

        {/* Application Number & Barcode Strip */}
        <div className="py-4 my-4 bg-slate-50 border border-gray-200 rounded-xl px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 text-xs">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Application Number</span>
            <span className="text-lg font-black font-mono text-blue-900">{application.application_number}</span>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Submission Timestamp</span>
            <span className="font-extrabold text-gray-800">{application.submitted_at || new Date().toLocaleString('en-IN')}</span>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-gray-500 block text-[10px] uppercase font-bold">Application Status</span>
            <span className="font-extrabold text-emerald-700 uppercase">{application.status.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* Applicant Profile Table */}
        <div className="space-y-4 my-6 text-xs relative z-10">
          <h3 className="font-black text-gray-900 border-b border-gray-200 pb-1 text-xs uppercase tracking-wider">
            1. Student Information
          </h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300 w-1/4">Candidate Full Name</td>
                <td className="p-2.5 font-extrabold text-gray-950 border border-gray-300 w-1/4">
                  {application.first_name} {application.last_name}
                </td>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300 w-1/4">Applying For Class</td>
                <td className="p-2.5 font-extrabold text-blue-900 border border-gray-300 w-1/4">
                  {application.class_name} (Section {application.preferred_section})
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Date of Birth</td>
                <td className="p-2.5 font-semibold border border-gray-300">{application.date_of_birth}</td>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Gender / Blood Group</td>
                <td className="p-2.5 font-semibold border border-gray-300 capitalize">{application.gender} • {application.blood_group || 'N/A'}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Nationality</td>
                <td className="p-2.5 font-semibold border border-gray-300">{application.nationality}</td>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Mother Tongue</td>
                <td className="p-2.5 font-semibold border border-gray-300">{application.mother_tongue || 'N/A'}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Birth Certificate No.</td>
                <td className="p-2.5 font-mono border border-gray-300" colSpan="3">{application.birth_certificate_number || 'Attached in Dossier'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Parent & Contact Table */}
        <div className="space-y-4 my-6 text-xs relative z-10">
          <h3 className="font-black text-gray-900 border-b border-gray-200 pb-1 text-xs uppercase tracking-wider">
            2. Parent & Contact Details
          </h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300 w-1/4">Father’s Name</td>
                <td className="p-2.5 font-semibold border border-gray-300 w-1/4">{application.guardians?.father_name || 'N/A'}</td>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300 w-1/4">Father’s Mobile</td>
                <td className="p-2.5 font-semibold border border-gray-300 w-1/4">{application.guardians?.father_phone || 'N/A'}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Mother’s Name</td>
                <td className="p-2.5 font-semibold border border-gray-300">{application.guardians?.mother_name || 'N/A'}</td>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Mother’s Mobile</td>
                <td className="p-2.5 font-semibold border border-gray-300">{application.guardians?.mother_phone || 'N/A'}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Permanent Address</td>
                <td className="p-2.5 font-medium border border-gray-300" colSpan="3">
                  {application.permanent_address || 'As registered in system'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Registration Fee Section */}
        <div className="space-y-4 my-6 text-xs relative z-10">
          <h3 className="font-black text-gray-900 border-b border-gray-200 pb-1 text-xs uppercase tracking-wider">
            3. Registration Fee Transaction Receipt
          </h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300 w-1/4">Amount Paid</td>
                <td className="p-2.5 font-extrabold text-emerald-800 border border-gray-300 w-1/4">
                  ₹{application.payment_amount || 500}.00
                </td>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300 w-1/4">Payment Mode</td>
                <td className="p-2.5 font-semibold border border-gray-300 w-1/4">{application.payment_method || 'Online'}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Transaction Ref.</td>
                <td className="p-2.5 font-mono text-gray-800 border border-gray-300">{application.payment_reference || 'UPI_REF_998822'}</td>
                <td className="p-2.5 font-bold bg-gray-50 border border-gray-300">Transaction Status</td>
                <td className="p-2.5 font-extrabold text-emerald-700 border border-gray-300 uppercase">
                  {application.payment_status}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verification Checklist */}
        <div className="my-6 text-xs space-y-2 relative z-10">
          <h3 className="font-black text-gray-900 border-b border-gray-200 pb-1 text-xs uppercase tracking-wider">
            4. Attached Documents Checklist
          </h3>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            {(application.documents || []).map((doc, idx) => (
              <div key={idx} className="flex items-center space-x-1.5 text-gray-700 min-w-0">
                <span className="text-emerald-600 font-bold flex-shrink-0">☑</span>
                <span className="truncate min-w-0 flex-1 font-mono text-[10px]" title={doc.file_name}>{doc.file_name}</span>
                <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">({doc.document_type.replace(/_/g, ' ')})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signatures & Seal */}
        <div className="pt-16 mt-8 border-t border-gray-200 grid grid-cols-2 gap-8 text-xs relative z-10">
          <div className="text-center space-y-1">
            <div className="w-40 border-b border-gray-400 mx-auto pb-6"></div>
            <p className="font-bold text-gray-800">Signature of Parent / Guardian</p>
            <p className="text-[10px] text-gray-500">Date: {new Date().toISOString().substring(0, 10)}</p>
          </div>

          <div className="text-center space-y-1">
            <div className="w-40 border-b border-gray-400 mx-auto pb-6"></div>
            <p className="font-bold text-gray-800">For Admissions Committee</p>
            <p className="text-[10px] text-gray-500">Delhi Public Academy Registry</p>
          </div>
        </div>

        {/* Notice Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-500 space-y-0.5">
          <p>Please retain this acknowledgement slip for all future correspondences and identity verification.</p>
          <p>Track live application status anytime at: {window.location.origin}/admissions/track</p>
        </div>
      </div>
    </div>
  );
};

export default AdmissionAcknowledgement;

