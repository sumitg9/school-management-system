import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { admissionAPI } from '../../services/api';
import { validateStudentDateOfBirth, calculateAge } from '../../utils/dateFormatter';
import { toast } from 'react-toastify';

const STEPS = [
  { id: 1, name: 'Academic Choice', icon: '📚' },
  { id: 2, name: 'Student Details', icon: '👨‍🎓' },
  { id: 3, name: 'Parent / Guardian', icon: '👨‍👩‍👧' },
  { id: 4, name: 'Address Details', icon: '📍' },
  { id: 5, name: 'Previous School', icon: '🏛️' },
  { id: 6, name: 'Document Locker', icon: '📁' },
  { id: 7, name: 'Review & Submit', icon: '✅' },
];

const INITIAL_FORM = {
  // Step 1: Academic
  academic_session: '2026-2027',
  class_id: '1',
  preferred_section: 'A',
  medium_of_instruction: 'English',
  admission_category: 'General',

  // Step 2: Student Details
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: 'male',
  blood_group: 'B+',
  nationality: 'Indian',
  mother_tongue: 'Hindi',
  religion: 'Hindu',
  caste: 'General',
  birth_certificate_number: '',

  // Step 3: Parents & Guardian
  father_name: '',
  father_phone: '',
  father_email: '',
  father_occupation: '',
  mother_name: '',
  mother_phone: '',
  mother_email: '',
  mother_occupation: '',
  has_guardian: false,
  guardian_name: '',
  guardian_phone: '',
  guardian_email: '',
  guardian_relation: '',
  guardian_occupation: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: 'Father',

  // Step 4: Address
  permanent_address: '',
  permanent_city: '',
  permanent_district: '',
  permanent_state: 'West Bengal',
  permanent_postal_code: '',
  permanent_country: 'India',
  same_as_permanent: true,
  correspondence_address: '',
  correspondence_city: '',
  correspondence_district: '',
  correspondence_state: 'West Bengal',
  correspondence_postal_code: '',
  correspondence_country: 'India',

  // Step 5: Previous School
  has_previous_school: true,
  previous_school: '',
  previous_board: 'CBSE',
  previous_class: '',
  previous_percentage: '',
  transfer_certificate_number: '',
  transfer_certificate_date: '',

  // Step 6: Documents
  documents: [],

  // Step 7: Declarations
  declaration_accepted: false,
  data_consent_accepted: false,
  payment_method: 'UPI',
};

const AdmissionWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftToken = searchParams.get('draft');

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Draft Token State
  const [activeDraftToken, setActiveDraftToken] = useState(draftToken || '');
  const [draftSavedModal, setDraftSavedModal] = useState(null);

  // Age calculation and validation state
  const [dobError, setDobError] = useState('');
  const [calculatedAgeText, setCalculatedAgeText] = useState('');

  // 1. Fetch Config and Resume Draft if token present
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingConfig(true);
        const res = await admissionAPI.getPublicConfig();
        if (res.success) {
          setConfig(res.data);
          if (res.data.academic_session) {
            setFormData((prev) => ({ ...prev, academic_session: res.data.academic_session }));
          }
        }

        if (draftToken) {
          const draftRes = await admissionAPI.getDraft(draftToken);
          if (draftRes.success && draftRes.data) {
            setFormData(draftRes.data.formData || draftRes.data);
            if (draftRes.data.currentStep) {
              setCurrentStep(Number(draftRes.data.currentStep));
            }
            toast.info('Saved draft restored successfully.');
          } else {
            toast.warn('Could not locate draft matching this verification link.');
          }
        }
      } catch (err) {
        console.error('Failed to initialize admission form:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    init();
  }, [draftToken]);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // 2. Validate Student DOB against Class Eligibility
  useEffect(() => {
    if (formData.date_of_birth) {
      const age = calculateAge(formData.date_of_birth);
      if (age) {
        setCalculatedAgeText(`${age.years} years, ${age.months} months`);
      } else {
        setCalculatedAgeText('');
      }

      const err = validateStudentDateOfBirth(formData.date_of_birth, formData.class_id);
      setDobError(err || '');
    } else {
      setDobError('');
      setCalculatedAgeText('');
    }
  }, [formData.date_of_birth, formData.class_id]);

  // Handle Document Upload
  const handleFileUpload = (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`File "${file.name}" exceeds the 5MB size limit. Please upload a compressed document.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;
      setFormData((prev) => {
        const otherDocs = prev.documents.filter((d) => d.document_type !== docType);
        return {
          ...prev,
          documents: [
            ...otherDocs,
            {
              document_type: docType,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type || 'application/octet-stream',
              file_data: base64Data,
            },
          ],
        };
      });
      toast.success(`Document "${file.name}" attached successfully.`);
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (docType) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.document_type !== docType),
    }));
  };

  // Step Validation before progressing
  const validateStep = (stepNumber) => {
    if (stepNumber === 1) {
      if (!formData.class_id) {
        toast.error('Please select the applying class.');
        return false;
      }
      return true;
    }
    if (stepNumber === 2) {
      if (!formData.first_name.trim()) {
        toast.error("Please enter student's first name.");
        return false;
      }
      if (!formData.date_of_birth) {
        toast.error("Please enter student's date of birth.");
        return false;
      }
      if (dobError) {
        toast.error(dobError);
        return false;
      }
      return true;
    }
    if (stepNumber === 3) {
      if (!formData.father_name.trim() && !formData.mother_name.trim() && !formData.guardian_name.trim()) {
        toast.error('Please enter at least one parent or guardian name.');
        return false;
      }
      if (!formData.father_phone.trim() && !formData.mother_phone.trim() && !formData.guardian_phone.trim()) {
        toast.error('Please enter a valid mobile number for the parent or guardian.');
        return false;
      }
      return true;
    }
    if (stepNumber === 4) {
      if (!formData.permanent_address.trim() || !formData.permanent_city.trim()) {
        toast.error('Please fill in complete permanent address and city.');
        return false;
      }
      return true;
    }
    if (stepNumber === 6) {
      const requiredTypes = (config?.required_documents || []).filter((d) => d.mandatory).map((d) => d.type);
      const uploadedTypes = formData.documents.map((d) => d.document_type);
      const missing = requiredTypes.filter((t) => !uploadedTypes.includes(t));
      if (missing.length > 0) {
        toast.warn(`Please upload all mandatory documents (${missing.join(', ')}).`);
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 7));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Draft Feature
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const payload = {
        formData,
        currentStep,
        access_token: activeDraftToken || undefined,
        student_name: `${formData.first_name} ${formData.last_name}`.trim() || 'Unnamed Draft',
        class_id: formData.class_id,
      };
      const res = await admissionAPI.saveDraft(payload);
      if (res.success) {
        setActiveDraftToken(res.access_token);
        setDraftSavedModal({
          token: res.access_token,
          link: `${window.location.origin}/admissions/apply?draft=${res.access_token}`,
        });
        toast.success('Draft application saved!');
      }
    } catch (err) {
      toast.error('Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Final Application Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.declaration_accepted) {
      toast.error('Please accept the declaration to submit your application.');
      return;
    }
    if (!formData.data_consent_accepted) {
      toast.error('Please provide consent for processing personal information.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClassObj = (config?.eligible_classes || []).find((c) => String(c.id) === String(formData.class_id));
      const payload = {
        school_id: config?.school_id || 1,
        academic_session: formData.academic_session,
        class_id: formData.class_id,
        class_name: selectedClassObj?.name || `Class ${formData.class_id}`,
        preferred_section: formData.preferred_section,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.father_email || formData.mother_email || '',
        phone: formData.father_phone || formData.mother_phone || '',
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        blood_group: formData.blood_group,
        nationality: formData.nationality,
        mother_tongue: formData.mother_tongue,
        religion: formData.religion,
        caste: formData.caste,
        birth_certificate_number: formData.birth_certificate_number,
        permanent_address: `${formData.permanent_address}, ${formData.permanent_city}, ${formData.permanent_state} - ${formData.permanent_postal_code}`,
        correspondence_address: formData.same_as_permanent
          ? `${formData.permanent_address}, ${formData.permanent_city}, ${formData.permanent_state} - ${formData.permanent_postal_code}`
          : `${formData.correspondence_address}, ${formData.correspondence_city}, ${formData.correspondence_state} - ${formData.correspondence_postal_code}`,
        city: formData.permanent_city,
        district: formData.permanent_district,
        state: formData.permanent_state,
        postal_code: formData.permanent_postal_code,
        country: formData.permanent_country,
        previous_school: formData.has_previous_school ? formData.previous_school : 'N/A',
        previous_board: formData.has_previous_school ? formData.previous_board : 'N/A',
        previous_class: formData.has_previous_school ? formData.previous_class : 'N/A',
        previous_percentage: formData.has_previous_school ? formData.previous_percentage : 'N/A',
        transfer_certificate_number: formData.transfer_certificate_number,
        transfer_certificate_date: formData.transfer_certificate_date,
        guardians: {
          father_name: formData.father_name,
          father_phone: formData.father_phone,
          father_email: formData.father_email,
          father_occupation: formData.father_occupation,
          mother_name: formData.mother_name,
          mother_phone: formData.mother_phone,
          mother_email: formData.mother_email,
          mother_occupation: formData.mother_occupation,
          guardian_name: formData.has_guardian ? formData.guardian_name : '',
          guardian_phone: formData.has_guardian ? formData.guardian_phone : '',
          guardian_relation: formData.has_guardian ? formData.guardian_relation : '',
          guardian_occupation: formData.has_guardian ? formData.guardian_occupation : '',
          emergency_contact_name: formData.emergency_contact_name || formData.father_name || '',
          emergency_contact_phone: formData.emergency_contact_phone || formData.father_phone || '',
          emergency_contact_relation: formData.emergency_contact_relation || 'Father',
        },
        documents: formData.documents,
        draft_token: activeDraftToken,
        payment_method: formData.payment_method,
      };

      const res = await admissionAPI.submitApplication(payload);
      if (res.success && res.data) {
        toast.success(`Application submitted! Number: ${res.data.application_number}`);
        navigate(`/admissions/acknowledgement/${res.data.application_number}`);
      } else {
        toast.error(res.message || 'Submission failed. Please check form entries.');
      }
    } catch (err) {
      toast.error('An error occurred during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-gray-600">Initializing Admission Application Form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Application Header Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/admissions" className="text-2xl hover:scale-105 transition">
              {config?.school_logo?.replace('preset:', '') || '🏫'}
            </Link>
            <div>
              <h1 className="text-base font-black text-gray-950 leading-tight">
                {config?.school_name || 'Delhi Public Academy'}
              </h1>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Online Admission Application • Step {currentStep} of 7: {STEPS[currentStep - 1].name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Save incomplete application to resume later"
            >
              <span>💾</span>
              <span>{isSavingDraft ? 'Saving...' : 'Save Draft'}</span>
            </button>
            <Link
              to="/admissions"
              className="text-xs font-bold text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl transition"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {/* Step Indicator Ribbon */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs mb-8">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-2 sm:pb-0 scrollbar-none">
            {STEPS.map((st) => {
              const isDone = st.id < currentStep;
              const isCurrent = st.id === currentStep;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    if (isDone) setCurrentStep(st.id);
                  }}
                  disabled={!isDone && !isCurrent}
                  className={`flex items-center space-x-2 py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                      : 'text-gray-400 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span className="text-sm">{isDone ? '✓' : st.icon}</span>
                  <span className="hidden sm:inline">
                    {st.id}. {st.name}
                  </span>
                  <span className="sm:hidden">{st.id}</span>
                </button>
              );
            })}
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Card Content */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-sm">
          {/* ======================================================== */}
          {/* STEP 1: Academic Choice */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                  <span>📚</span> Step 1: Academic Choice & Program
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Select the academic session, grade/class you are applying for, and instruction medium.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Academic Session *</label>
                  <input
                    type="text"
                    disabled
                    value={formData.academic_session}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-extrabold text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Configured by admissions committee</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Applying for Class / Grade *</label>
                  <select
                    name="class_id"
                    value={formData.class_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    {(config?.eligible_classes || []).map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Age: {cls.minAgeYears}–{cls.maxAgeYears} yrs • {cls.seats - cls.filled} seats open)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Preferred Section (Optional)</label>
                  <select
                    name="preferred_section"
                    value={formData.preferred_section}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="Any">Any Available Section</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Medium of Instruction *</label>
                  <select
                    name="medium_of_instruction"
                    value={formData.medium_of_instruction}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="English">English Medium</option>
                    <option value="Hindi">Hindi Medium</option>
                    <option value="Bengali">Bengali Medium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Admission Category *</label>
                  <select
                    name="admission_category"
                    value={formData.admission_category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="General">General / Open Category</option>
                    <option value="OBC">OBC (Other Backward Class)</option>
                    <option value="SC">SC (Scheduled Caste)</option>
                    <option value="ST">ST (Scheduled Tribe)</option>
                    <option value="EWS">EWS / Economically Weaker Section</option>
                    <option value="Staff Child">Staff / Faculty Ward</option>
                    <option value="Sibling">Sibling / Alumni Quota</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: Student Details */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                  <span>👨‍🎓</span> Step 2: Student Personal Information
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Accurate demographic information as per the official birth certificate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="e.g. Aarav"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Last Name / Surname</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="e.g. Sharma"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Date of Birth * {calculatedAgeText && <span className="text-blue-600 font-extrabold">({calculatedAgeText})</span>}
                  </label>
                  <input
                    type="date"
                    required
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    max={new Date().toISOString().substring(0, 10)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  {dobError && (
                    <p className="text-xs text-rose-600 font-semibold mt-1.5">{dobError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Blood Group</label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Nationality *</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    placeholder="e.g. Indian"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Mother Tongue</label>
                  <input
                    type="text"
                    name="mother_tongue"
                    value={formData.mother_tongue}
                    onChange={handleChange}
                    placeholder="e.g. Hindi / Bengali / English"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Birth Certificate Registration No.</label>
                  <input
                    type="text"
                    name="birth_certificate_number"
                    value={formData.birth_certificate_number}
                    onChange={handleChange}
                    placeholder="e.g. WB/SLG/2020/99881"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: Parent & Guardian Details */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                  <span>👨‍👩‍👧</span> Step 3: Parent & Guardian Information
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Primary and emergency contacts for school communication and portal access.
                </p>
              </div>

              {/* Father Details */}
              <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                  <span>👨</span> Father’s Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Father’s Full Name *</label>
                    <input
                      type="text"
                      name="father_name"
                      value={formData.father_name}
                      onChange={handleChange}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number *</label>
                    <input
                      type="tel"
                      name="father_phone"
                      value={formData.father_phone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      name="father_email"
                      value={formData.father_email}
                      onChange={handleChange}
                      placeholder="e.g. rajesh@example.com"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Occupation / Designation</label>
                    <input
                      type="text"
                      name="father_occupation"
                      value={formData.father_occupation}
                      onChange={handleChange}
                      placeholder="e.g. Civil Engineer"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Mother Details */}
              <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                  <span>👩</span> Mother’s Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mother’s Full Name</label>
                    <input
                      type="text"
                      name="mother_name"
                      value={formData.mother_name}
                      onChange={handleChange}
                      placeholder="e.g. Pooja Sharma"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      name="mother_phone"
                      value={formData.mother_phone}
                      onChange={handleChange}
                      placeholder="e.g. +91 98765 88990"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      name="mother_email"
                      value={formData.mother_email}
                      onChange={handleChange}
                      placeholder="e.g. pooja@example.com"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Occupation / Profession</label>
                    <input
                      type="text"
                      name="mother_occupation"
                      value={formData.mother_occupation}
                      onChange={handleChange}
                      placeholder="e.g. Teacher / Homemaker"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <span>🚨</span> Designated Emergency Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleChange}
                      placeholder="Defaults to Father"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleChange}
                      placeholder="Defaults to Father Phone"
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Relationship</label>
                    <select
                      name="emergency_contact_relation"
                      value={formData.emergency_contact_relation}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Uncle">Uncle</option>
                      <option value="Grandparent">Grandparent</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: Address Details */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                  <span>📍</span> Step 4: Residential & Postal Address
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Permanent family domicile and communication correspondence address.
                </p>
              </div>

              {/* Permanent Address */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                  Permanent Domicile Address
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Address Line *</label>
                    <input
                      type="text"
                      required
                      name="permanent_address"
                      value={formData.permanent_address}
                      onChange={handleChange}
                      placeholder="House / Flat No., Building, Street Name"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">City / Village *</label>
                    <input
                      type="text"
                      required
                      name="permanent_city"
                      value={formData.permanent_city}
                      onChange={handleChange}
                      placeholder="e.g. Siliguri"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">District</label>
                    <input
                      type="text"
                      name="permanent_district"
                      value={formData.permanent_district}
                      onChange={handleChange}
                      placeholder="e.g. Darjeeling"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
                    <input
                      type="text"
                      name="permanent_state"
                      value={formData.permanent_state}
                      onChange={handleChange}
                      placeholder="e.g. West Bengal"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">PIN / Postal Code *</label>
                    <input
                      type="text"
                      name="permanent_postal_code"
                      value={formData.permanent_postal_code}
                      onChange={handleChange}
                      placeholder="e.g. 734001"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Same as Permanent Checkbox */}
              <div className="pt-2">
                <label className="inline-flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="same_as_permanent"
                    checked={formData.same_as_permanent}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Correspondence address is identical to permanent domicile address
                  </span>
                </label>
              </div>

              {/* Correspondence Address if Different */}
              {!formData.same_as_permanent && (
                <div className="space-y-4 pt-4 border-t border-gray-100 animate-fadeIn">
                  <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                    Current Correspondence Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Address Line *</label>
                      <input
                        type="text"
                        name="correspondence_address"
                        value={formData.correspondence_address}
                        onChange={handleChange}
                        placeholder="House / Flat No., Building, Street Name"
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">City / Village *</label>
                      <input
                        type="text"
                        name="correspondence_city"
                        value={formData.correspondence_city}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">PIN / Postal Code *</label>
                      <input
                        type="text"
                        name="correspondence_postal_code"
                        value={formData.correspondence_postal_code}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: Previous Academic Information */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                  <span>🏛️</span> Step 5: Previous Schooling & Academic History
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Details of the last school attended and Transfer Certificate credentials (if applicable).
                </p>
              </div>

              <div className="space-y-3">
                <label className="inline-flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_previous_school"
                    checked={formData.has_previous_school}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-gray-800">
                    Child previously attended a recognized play school, kindergarten, or school
                  </span>
                </label>
              </div>

              {formData.has_previous_school ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Previous School Name *</label>
                    <input
                      type="text"
                      name="previous_school"
                      value={formData.previous_school}
                      onChange={handleChange}
                      placeholder="e.g. St. Xavier’s High School"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Previous Board / Affiliation</label>
                    <select
                      name="previous_board"
                      value={formData.previous_board}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                    >
                      <option value="CBSE">CBSE (Central Board)</option>
                      <option value="ICSE">ICSE / CISCE</option>
                      <option value="State Board">State Board</option>
                      <option value="IB">International Baccalaureate (IB)</option>
                      <option value="Montessori">Pre-School / Montessori</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Last Class Completed</label>
                    <input
                      type="text"
                      name="previous_class"
                      value={formData.previous_class}
                      onChange={handleChange}
                      placeholder="e.g. Class 5 / UKG"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Percentage / Marks / Grade</label>
                    <input
                      type="text"
                      name="previous_percentage"
                      value={formData.previous_percentage}
                      onChange={handleChange}
                      placeholder="e.g. 92.4% or Grade A"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Transfer Certificate (TC) Number</label>
                    <input
                      type="text"
                      name="transfer_certificate_number"
                      value={formData.transfer_certificate_number}
                      onChange={handleChange}
                      placeholder="e.g. TC-2026-9901"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-hidden font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600">
                  First-time schooling selected. No prior academic marksheet or Transfer Certificate required.
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 6: Document Locker */}
          {/* ======================================================== */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                  <span>📁</span> Step 6: Secure Document Locker
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Upload clear scanned copies or photographs (JPG, PNG, PDF up to 5MB each).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(config?.required_documents || []).map((doc) => {
                  const uploaded = formData.documents.find((d) => d.document_type === doc.type);
                  return (
                    <div
                      key={doc.type}
                      className={`border rounded-2xl p-4.5 space-y-3 transition ${
                        uploaded ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-900">{doc.name}</h4>
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                doc.mandatory ? 'bg-rose-100 text-rose-800' : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {doc.mandatory ? 'Mandatory' : 'Optional'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 font-mono">PDF, JPG, PNG (Max 5MB)</p>
                        </div>
                        {uploaded && <span className="text-emerald-600 text-base font-bold">✓ Uploaded</span>}
                      </div>

                      {uploaded ? (
                        <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl text-xs gap-2 overflow-hidden">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <span className="flex-shrink-0">📄</span>
                            <span className="font-semibold text-gray-800 truncate" title={uploaded.file_name}>{uploaded.file_name}</span>
                            <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 whitespace-nowrap">
                              ({(uploaded.file_size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDocument(doc.type)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 rounded cursor-pointer flex-shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <label className="w-full py-3 px-4 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl flex items-center justify-center space-x-2 text-xs font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 transition cursor-pointer">
                            <span>📤</span>
                            <span>Choose Document to Upload</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => handleFileUpload(doc.type, e)}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 7: Review & Final Declaration */}
          {/* ======================================================== */}
          {currentStep === 7 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-xl font-black text-gray-950 flex items-center gap-2">
                  <span>✅</span> Step 7: Final Review & Legal Declaration
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Please review all entered details carefully before final submission.
                </p>
              </div>

              {/* Review Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Academic & Personal */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                    <span className="font-bold text-gray-900">Student & Academic</span>
                    <button type="button" onClick={() => setCurrentStep(2)} className="text-blue-600 font-bold hover:underline cursor-pointer">Edit</button>
                  </div>
                  <p><span className="text-gray-500">Student:</span> <strong>{formData.first_name} {formData.last_name}</strong></p>
                  <p><span className="text-gray-500">Applying Class:</span> <strong>Class {formData.class_id} (Sec {formData.preferred_section})</strong></p>
                  <p><span className="text-gray-500">Date of Birth:</span> <strong>{formData.date_of_birth} ({calculatedAgeText})</strong></p>
                  <p><span className="text-gray-500">Gender / Blood:</span> <strong>{formData.gender} • {formData.blood_group}</strong></p>
                </div>

                {/* Parents & Contacts */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                    <span className="font-bold text-gray-900">Parents & Contacts</span>
                    <button type="button" onClick={() => setCurrentStep(3)} className="text-blue-600 font-bold hover:underline cursor-pointer">Edit</button>
                  </div>
                  <p><span className="text-gray-500">Father:</span> <strong>{formData.father_name || 'N/A'} ({formData.father_phone})</strong></p>
                  <p><span className="text-gray-500">Mother:</span> <strong>{formData.mother_name || 'N/A'}</strong></p>
                  <p><span className="text-gray-500">City / State:</span> <strong>{formData.permanent_city}, {formData.permanent_state}</strong></p>
                  <p><span className="text-gray-500">Documents Attached:</span> <strong>{formData.documents.length} Files</strong></p>
                </div>
              </div>

              {/* Registration Fee Summary */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-widest block">Application Fee Summary</span>
                  <div className="text-2xl font-black mt-0.5">₹{config?.registration_fee || 500}.00</div>
                  <p className="text-[11px] text-blue-200 mt-1">One-time non-refundable online admission registration fee</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="px-3.5 py-2 bg-white text-gray-900 font-bold text-xs rounded-xl shadow-xs outline-hidden"
                  >
                    <option value="UPI">Pay via UPI (GPay/PhonePe/Paytm)</option>
                    <option value="Debit Card">Debit / Credit Card</option>
                    <option value="Net Banking">Internet Banking</option>
                    <option value="Pay at Counter">Pay Cash at School Desk</option>
                  </select>
                </div>
              </div>

              {/* Declarations Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="declaration_accepted"
                    checked={formData.declaration_accepted}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    <strong>Parent Declaration:</strong> {config?.declaration_text || 'I hereby declare that all information furnished in this admission application is true, complete, and accurate.'}
                  </span>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="data_consent_accepted"
                    checked={formData.data_consent_accepted}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    <strong>Data Processing Consent:</strong> I authorize {config?.school_name} to process and store this student admission data solely for institutional evaluation, enrollment, and contact purposes.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-100 mt-8">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                &larr; Back
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="hidden sm:inline-flex px-5 py-2.5 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
              </button>

              {currentStep < 7 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Continue &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.declaration_accepted || !formData.data_consent_accepted}
                  className="px-9 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Submit Application Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Draft Saved Modal with Link */}
      {draftSavedModal && (
        <div className="fixed inset-0 z-50 bg-gray-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-scaleUp">
            <div className="flex items-center space-x-2 text-emerald-600">
              <span className="text-2xl">💾</span>
              <h4 className="text-base font-extrabold text-gray-900">Application Draft Saved!</h4>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Your application has been safely saved. You can resume at this exact step at any time using your private draft link or code below:
            </p>

            <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Your Draft Code</span>
              <div className="text-xs font-mono font-bold text-gray-900 select-all break-all bg-white p-2 border border-gray-200 rounded-lg">
                {draftSavedModal.token}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(draftSavedModal.link);
                  toast.success('Resume link copied to clipboard!');
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                📋 Copy Link
              </button>
              <button
                type="button"
                onClick={() => setDraftSavedModal(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionWizard;

