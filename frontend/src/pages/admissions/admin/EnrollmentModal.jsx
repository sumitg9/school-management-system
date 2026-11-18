import { useState } from 'react';
import { admissionAPI } from '../../../services/api';
import { toast } from 'react-toastify';

const EnrollmentModal = ({ application, onClose, onEnrolled }) => {
  const [sectionId, setSectionId] = useState('1');
  const [sectionName, setSectionName] = useState('A');
  const [rollNumber, setRollNumber] = useState('01');
  const [admissionNumber, setAdmissionNumber] = useState(
    `SLG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!admissionNumber.trim()) {
      toast.error('Please specify an official student Admission Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await admissionAPI.enrollApplicant(application.id, {
        class_id: application.class_id,
        section_id: sectionId,
        section_name: sectionName,
        roll_number: rollNumber,
        admission_number: admissionNumber.trim(),
        admin_name: 'Super Admin',
      });

      if (res.success) {
        toast.success(`Success! Student admitted with ID: ${admissionNumber}`);
        onEnrolled(res.data.application);
        onClose();
      } else {
        toast.error(res.message || 'Enrollment conversion failed.');
      }
    } catch (err) {
      toast.error('Internal enrollment error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-200 space-y-6 animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">
              🎓
            </div>
            <div>
              <h3 className="text-base font-black text-gray-950 leading-tight">
                Official Student Enrollment
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Convert approved applicant into an active enrolled student
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Applicant Summary Pill */}
        <div className="bg-slate-50 border border-gray-200 rounded-2xl p-4 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Applicant</span>
            <span className="font-extrabold text-gray-900 text-sm">
              {application.first_name} {application.last_name}
            </span>
            <span className="text-gray-500 block font-mono text-[11px]">{application.application_number}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Admitting Grade</span>
            <span className="font-black text-blue-900 text-sm">{application.class_name || 'Class 1'}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Official Admission Number * (Auto-Generated)
            </label>
            <input
              type="text"
              required
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
              placeholder="e.g. SLG-2026-004"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-hidden uppercase tracking-wider bg-white"
            />
            <p className="text-[10px] text-gray-400 mt-1">This will be the student’s permanent institutional ID</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Section Allotment *</label>
              <select
                value={sectionName}
                onChange={(e) => {
                  setSectionName(e.target.value);
                  setSectionId(e.target.value === 'A' ? '1' : (e.target.value === 'B' ? '2' : '3'));
                }}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Class Roll Number *</label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 01"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <span>⚡</span> Atomic Enrollment Automation:
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
              <li>Creates official profile in the Student Directory.</li>
              <li>Generates student portal login credentials.</li>
              <li>Links parent contact records with parent portal access.</li>
              <li>Updates admission status to <strong>Enrolled</strong>.</li>
            </ul>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Admitting Student...</span>
                </>
              ) : (
                <>
                  <span>🎓</span>
                  <span>Confirm & Enroll Student</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnrollmentModal;

