import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { assignmentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const AssignmentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatDate } = useSettings();
  const {
    isStudent,
    isTeacher,
    currentTeacher,
    user,
    isClassAssignedToTeacher,
    isSectionAssignedToTeacher,
    currentStudent,
    hasPermission,
  } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Student Submission state
  const [submission, setSubmission] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [id, currentStudent?.id]);

  const fetchAssignment = async () => {
    setLoading(true);
    try {
      const response = await assignmentAPI.getById(id);
      if (response.success) {
        if (isTeacher()) {
          const a = response.data;
          const tId = currentTeacher?.id ? String(currentTeacher.id) : null;
          const uId = user?.id ? String(user.id) : null;
          const byMe = (tId && String(a.teacher_id) === tId) || (uId && String(a.created_by) === uId);
          const classOk = a.class_id ? isClassAssignedToTeacher(a.class_id) : false;
          const secOk = a.section_id ? isSectionAssignedToTeacher(a.section_id) : false;
          if (!byMe && !classOk && !secOk) {
            toast.error("You don't have permission to view this assignment.");
            navigate('/assignments');
            return;
          }
        }
        setAssignment(response.data);

        // If student, also fetch their submission
        if (isStudent() && currentStudent?.id) {
          try {
            const subRes = await assignmentAPI.getStudentSubmissions(currentStudent.id);
            if (subRes?.data) {
              const mySub = subRes.data.find(s => String(s.assignment_id) === String(id));
              if (mySub) {
                setSubmission(mySub);
                setSubmissionText(mySub.submission_text || '');
                setAttachmentUrl(mySub.attachment || '');
              }
            }
          } catch (err) {
            console.warn('Could not load submission:', err);
          }
        }
      }
    } catch (error) {
      toast.error('Failed to fetch assignment details');
      navigate('/assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!currentStudent?.id) return;
    if (!submissionText.trim() && !attachmentUrl.trim()) {
      toast.warning('Please enter submission text or attach a file URL.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignmentAPI.submit(id, {
        student_id: currentStudent.id,
        submission_text: submissionText,
        attachment: attachmentUrl,
      });

      if (res?.success) {
        toast.success('Assignment submitted successfully! 🎉');
        fetchAssignment();
      } else {
        toast.error('Failed to submit assignment');
      }
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Error submitting assignment: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    if (due < today) return 'danger';
    if (due.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Assignment not found</p>
        </div>
      </div>
    );
  }

  // Strict class scoping for students: ensure assignment belongs to this student's class
  const studentClassId = currentStudent?.class_id || currentStudent?.class?.id;
  const studentSectionId = currentStudent?.section_id || currentStudent?.section?.id;

  const isClassMatch = !studentClassId || String(assignment.class_id) === String(studentClassId);
  const isSectionMatch = !assignment.section_id || !studentSectionId || String(assignment.section_id) === String(studentSectionId);

  if (isStudent() && (!isClassMatch || !isSectionMatch)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            You can only access homework assignments assigned to your own class ({currentStudent?.class?.name || 'Your Class'}).
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/assignments')}
              className="btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
            >
              ← Back to My Assignments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/assignments')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assignment Details</h1>
              <p className="text-gray-600 mt-1">View assignment information</p>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isStudent() && hasPermission('grade-assignments') && (
              <button
                onClick={() => navigate(`/assignments/${id}/submissions`)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>View Submissions</span>
              </button>
            )}

            {!isStudent() && hasPermission('create-assignments') && (
              <button
                onClick={() => navigate(`/assignments/${id}/edit`)}
                className="btn-primary flex items-center space-x-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Header Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-600 font-bold text-3xl">📝</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{assignment.title}</h2>
                <p className="text-gray-600 mt-1">
                  {assignment.class?.name} - {assignment.section?.name} | {assignment.subject?.name}
                </p>
              </div>
              <Badge variant={getStatusVariant(assignment.due_date)}>
                {new Date(assignment.due_date) < new Date() ? 'Overdue' : 'Active'}
              </Badge>
            </div>
            <p className="text-gray-600 mt-3">{assignment.description}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Marks</p>
              <p className="text-3xl font-bold text-gray-900">{assignment.total_marks || 0}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💯</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Due Date</p>
              <p className="text-xl font-bold text-gray-900">
                {formatDate(assignment.due_date)}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Days Remaining</p>
              <p className="text-2xl font-bold text-orange-600">
                {Math.ceil((new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Title:</span>
              <span className="font-medium text-gray-900">{assignment.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Class:</span>
              <span className="font-medium text-gray-900">{assignment.class?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Section:</span>
              <span className="font-medium text-gray-900">{assignment.section?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subject:</span>
              <span className="font-medium text-gray-900">{assignment.subject?.name || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-600 mb-1">Description:</span>
              <span className="font-medium text-gray-900">{assignment.description || '-'}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Marks:</span>
              <span className="font-medium text-gray-900">{assignment.total_marks || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium text-gray-900">
                {formatDate(assignment.due_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge variant={getStatusVariant(assignment.due_date)}>
                {new Date(assignment.due_date) < new Date() ? 'Overdue' : 'Active'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Student Submission Card */}
      {isStudent() && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>📤</span>
                <span>{submission ? 'Your Submitted Work' : 'Submit Your Homework'}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {submission
                  ? `Turned in on ${formatDate(submission.submitted_at)}`
                  : `Please submit your answer before the deadline (${formatDate(assignment.due_date)})`}
              </p>
            </div>
            <div>
              {submission?.status === 'graded' ? (
                <Badge variant="success">Graded</Badge>
              ) : submission ? (
                <Badge variant="primary">Submitted</Badge>
              ) : (
                <Badge variant="warning">Not Submitted</Badge>
              )}
            </div>
          </div>

          {/* If Graded: Show Marks & Feedback */}
          {submission?.status === 'graded' && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-4.5 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                🏆 Evaluation Results
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700 font-mono">
                  {submission.marks_obtained}
                </span>
                <span className="text-gray-500 text-sm">/ {assignment.total_marks || 100} Marks</span>
                <span className="ml-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                  {Math.round(((parseFloat(submission.marks_obtained) || 0) / (assignment.total_marks || 100)) * 100)}%
                </span>
              </div>
              {submission.feedback && (
                <div className="bg-white/80 border border-emerald-200 rounded-lg p-3 text-xs text-gray-800 mt-2">
                  <span className="font-bold text-emerald-900 block mb-0.5">Teacher Feedback:</span>
                  <p className="italic text-gray-700">{submission.feedback}</p>
                </div>
              )}
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmitWork} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Your Answer / Submission Text
              </label>
              <textarea
                rows={5}
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Type or paste your answers, summary, or response here..."
                className="input-field text-xs font-mono"
                disabled={submission?.status === 'graded' || submitting}
                required={!attachmentUrl}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Attachment / Google Drive File Link (Optional)
              </label>
              <input
                type="text"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://drive.google.com/file/... or link to submitted document"
                className="input-field text-xs"
                disabled={submission?.status === 'graded' || submitting}
              />
            </div>

            {submission?.status !== 'graded' && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : submission ? (
                    <>
                      <span>🔄</span>
                      <span>Update My Submission</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Turn In Assignment</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetail;

