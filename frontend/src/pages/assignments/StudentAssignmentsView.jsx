import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { assignmentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

const StudentAssignmentsView = () => {
  const navigate = useNavigate();
  const { formatDate } = useSettings();
  const { currentStudent, studentLoading, isParent } = useAuth();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'submitted' | 'graded' | 'overdue'
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Submission / View Modal State
  const [activeModalAssignment, setActiveModalAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch assignments for the student's assigned class & section
  const fetchStudentAssignmentsData = async () => {
    if (!currentStudent?.id) return;
    setLoading(true);
    try {
      const studentClassId = currentStudent.class_id || currentStudent.class?.id;
      const studentSectionId = currentStudent.section_id || currentStudent.section?.id;

      if (!studentClassId) {
        setAssignments([]);
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // 1. Fetch assignments for this student's class
      const [assignmentsRes, submissionsRes] = await Promise.all([
        assignmentAPI.getAll({
          class_id: studentClassId,
          per_page: 100,
        }),
        assignmentAPI.getStudentSubmissions(currentStudent.id),
      ]);

      if (assignmentsRes?.success) {
        // Strictly filter to assignments matching this student's class and (if section-specific) section
        const filtered = (assignmentsRes.data || []).filter(item => {
          const classMatches = String(item.class_id) === String(studentClassId);
          const sectionMatches = !item.section_id || !studentSectionId || String(item.section_id) === String(studentSectionId);
          return classMatches && sectionMatches;
        });

        setAssignments(filtered);
      }

      if (submissionsRes?.success) {
        setSubmissions(submissionsRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching student assignments:', err);
      toast.error('Failed to load class assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStudent?.id) {
      fetchStudentAssignmentsData();
    } else if (!studentLoading) {
      setLoading(false);
    }
  }, [currentStudent?.id, studentLoading]);

  // Combine assignments with this student's submission records
  const studentAssignmentItems = useMemo(() => {
    const subMap = {};
    submissions.forEach(sub => {
      subMap[sub.assignment_id] = sub;
    });

    const now = new Date();

    return assignments.map(a => {
      const sub = subMap[a.id] || null;
      const dueDate = new Date(a.due_date);
      // set due date to end of day for deadline comparison
      dueDate.setHours(23, 59, 59, 999);

      const isSubmitted = !!sub && ['submitted', 'graded', 'late'].includes(sub.status);
      const isGraded = sub?.status === 'graded';
      const isOverdue = !isSubmitted && now > dueDate;
      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'pending';
      if (isGraded) {
        status = 'graded';
      } else if (isSubmitted) {
        status = 'submitted';
      } else if (isOverdue) {
        status = 'overdue';
      }

      return {
        ...a,
        submission: sub,
        isSubmitted,
        isGraded,
        isOverdue,
        daysRemaining,
        status, // 'pending' | 'submitted' | 'graded' | 'overdue'
      };
    });
  }, [assignments, submissions]);

  // Available subjects for filtering
  const availableSubjects = useMemo(() => {
    const map = new Map();
    studentAssignmentItems.forEach(item => {
      if (item.subject?.id && item.subject?.name) {
        map.set(String(item.subject.id), item.subject.name);
      } else if (item.subject_id) {
        map.set(String(item.subject_id), `Subject ${item.subject_id}`);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [studentAssignmentItems]);

  // Statistics aggregates
  const stats = useMemo(() => {
    const total = studentAssignmentItems.length;
    const pending = studentAssignmentItems.filter(i => i.status === 'pending').length;
    const submitted = studentAssignmentItems.filter(i => i.status === 'submitted').length;
    const graded = studentAssignmentItems.filter(i => i.status === 'graded').length;
    const overdue = studentAssignmentItems.filter(i => i.status === 'overdue').length;

    const completionRate = total > 0 ? Math.round(((submitted + graded) / total) * 100) : 0;

    return { total, pending, submitted, graded, overdue, completionRate };
  }, [studentAssignmentItems]);

  // Filtered items based on tab, subject, and search
  const filteredAssignments = useMemo(() => {
    return studentAssignmentItems.filter(item => {
      // Tab filter
      if (activeTab === 'pending' && item.status !== 'pending') return false;
      if (activeTab === 'submitted' && item.status !== 'submitted') return false;
      if (activeTab === 'graded' && item.status !== 'graded') return false;
      if (activeTab === 'overdue' && item.status !== 'overdue') return false;

      // Subject filter
      if (selectedSubjectId && String(item.subject_id || item.subject?.id) !== String(selectedSubjectId)) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(term);
        const matchesDesc = item.description?.toLowerCase().includes(term);
        const matchesSubject = item.subject?.name?.toLowerCase().includes(term);
        const matchesTeacher = item.teacher
          ? `${item.teacher.first_name || ''} ${item.teacher.last_name || ''}`.toLowerCase().includes(term)
          : false;

        return matchesTitle || matchesDesc || matchesSubject || matchesTeacher;
      }

      return true;
    });
  }, [studentAssignmentItems, activeTab, selectedSubjectId, searchTerm]);

  // Handle open submission or view dialog
  const handleOpenSubmissionModal = (item) => {
    setActiveModalAssignment(item);
    setSubmissionText(item.submission?.submission_text || '');
    setAttachmentUrl(item.submission?.attachment || '');
  };

  // Submit student work
  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!activeModalAssignment || !currentStudent?.id) return;
    if (!submissionText.trim() && !attachmentUrl.trim()) {
      toast.warning('Please enter submission text or attach a file URL before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignmentAPI.submit(activeModalAssignment.id, {
        student_id: currentStudent.id,
        submission_text: submissionText,
        attachment: attachmentUrl,
      });

      if (res?.success) {
        toast.success('Assignment submitted successfully! 🎉');
        setActiveModalAssignment(null);
        fetchStudentAssignmentsData();
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'graded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span>✓</span> Graded
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
            <span>📩</span> Submitted
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse shadow-2xs">
            <span>⚠️</span> Overdue
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span>⏳</span> To Do
          </span>
        );
    }
  };

  if (studentLoading || loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStudent && !studentLoading && !loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          <span className="text-4xl block mb-3">{isParent() ? '👦👧' : '👨‍🎓'}</span>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{isParent() ? 'No Linked Child Found' : 'No Student Profile Linked'}</h3>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            {isParent()
              ? 'No enrolled child has been linked to your parent account yet. Please verify your contact details or contact school administration.'
              : 'Your account is set to Student role, but no linked student profile could be loaded. Please contact the administrator.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Student Identity Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {isParent() ? "Child's Class Assignments" : 'My Class Assignments'}
                </h1>
                <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-bold">
                  {isParent() ? '🔒 Parent View' : `🔒 Class ${currentStudent?.class?.name || currentStudent?.class_id || ''} Portal`}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-mono mt-1.5">
                <span>
                  Student: <strong className="text-gray-800">{currentStudent?.first_name} {currentStudent?.last_name}</strong>
                </span>
                {currentStudent?.admission_number && (
                  <span className="border-l border-gray-200 pl-3">
                    Adm: <strong className="text-gray-800">{currentStudent.admission_number}</strong>
                  </span>
                )}
                {currentStudent?.roll_number && (
                  <span className="border-l border-gray-200 pl-3">
                    Roll: <strong className="text-gray-800">{currentStudent.roll_number}</strong>
                  </span>
                )}
                <span className="border-l border-gray-200 pl-3">
                  Class: <strong className="text-gray-800">{currentStudent?.class?.name || `Class ${currentStudent?.class_id}`}</strong>
                </span>
                {currentStudent?.section?.name && (
                  <span className="border-l border-gray-200 pl-3">
                    Section: <strong className="text-gray-800">{currentStudent.section.name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchStudentAssignmentsData}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              title="Refresh assignments"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Class Assignments */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Assignments</span>
              <span className="text-lg">📚</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-gray-900 font-mono">
                {stats.total}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Assigned for {currentStudent?.class?.name || 'Your Class'}
              </p>
            </div>
          </div>

          {/* Card 2: To Do (Pending) */}
          <div className={`rounded-2xl p-4 flex flex-col justify-between shadow-2xs border ${
            stats.pending > 0
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
              : 'bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                stats.pending > 0 ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                Pending Tasks
              </span>
              <span className="text-lg">{stats.pending > 0 ? '⏳' : '✨'}</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-black font-mono ${
                stats.pending > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {stats.pending}
              </div>
              <p className="text-[11px] text-gray-600 mt-1 font-semibold">
                {stats.pending > 0 ? 'Need completion & submission' : 'All assignments submitted! 🎉'}
              </p>
            </div>
          </div>

          {/* Card 3: Evaluated & Graded */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Graded Work</span>
              <span className="text-lg">🏆</span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {stats.graded}
              </div>
              <p className="text-[11px] text-emerald-800 mt-1">
                Evaluated with marks & feedback
              </p>
            </div>
          </div>

          {/* Card 4: Overdue Submissions */}
          <div className={`rounded-2xl p-4 flex flex-col justify-between shadow-2xs border ${
            stats.overdue > 0
              ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
              : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                stats.overdue > 0 ? 'text-red-800' : 'text-gray-500'
              }`}>
                Overdue Tasks
              </span>
              <span className="text-lg">{stats.overdue > 0 ? '⚠️' : '✅'}</span>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-black font-mono ${
                stats.overdue > 0 ? 'text-red-600' : 'text-gray-800'
              }`}>
                {stats.overdue}
              </div>
              <p className={`text-[11px] mt-1 font-semibold ${
                stats.overdue > 0 ? 'text-red-700' : 'text-emerald-600'
              }`}>
                {stats.overdue > 0 ? 'Past deadline • submit ASAP' : 'Zero overdue homework'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Filter & Assignments Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Navigation Filters Bar */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              <span>📋 All Assignments</span>
              <span className="text-[10px] bg-black/15 px-1.5 py-0.2 rounded-full font-mono">
                {stats.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span>⏳ To Do (Pending)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'pending' ? 'bg-white/20' : 'bg-amber-100 text-amber-800'
              }`}>
                {stats.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('submitted')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'submitted'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span>📩 Submitted</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'submitted' ? 'bg-white/20' : 'bg-blue-100 text-blue-800'
              }`}>
                {stats.submitted}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('graded')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'graded'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <span>🏆 Graded</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'graded' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {stats.graded}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overdue')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overdue'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
              }`}
            >
              <span>⚠️ Overdue</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'overdue' ? 'bg-white/20' : 'bg-red-100 text-red-800'
              }`}>
                {stats.overdue}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Subject Selector */}
            {availableSubjects.length > 0 && (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="input-field text-xs py-1.5 w-auto"
              >
                <option value="">All Subjects</option>
                {availableSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {/* Search Box */}
            <div className="w-full sm:w-56">
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <span className="text-4xl block mb-2">
              {activeTab === 'overdue' ? '🎉' : '📋'}
            </span>
            <p className="font-semibold text-gray-700">
              {activeTab === 'overdue'
                ? 'No overdue assignments! Great job keeping up with homework.'
                : 'No assignments match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Assignment Title</th>
                  <th className="p-3.5">Subject</th>
                  <th className="p-3.5">Teacher</th>
                  <th className="p-3.5">Due Date & Countdown</th>
                  <th className="p-3.5 text-center">Marks</th>
                  <th className="p-3.5 text-center">My Status</th>
                  <th className="p-3.5 text-center pr-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredAssignments.map(item => {
                  const isOverdue = item.status === 'overdue';
                  const isGraded = item.status === 'graded';
                  const isSubmitted = item.status === 'submitted';

                  return (
                    <tr
                      key={item.id}
                      className={`transition ${
                        isOverdue
                          ? 'bg-red-50/30 hover:bg-red-50/70'
                          : isGraded
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/50'
                          : isSubmitted
                          ? 'bg-blue-50/20 hover:bg-blue-50/50'
                          : 'hover:bg-gray-50/80'
                      }`}
                    >
                      <td className="p-3.5 pl-5 max-w-xs">
                        <button
                          type="button"
                          onClick={() => handleOpenSubmissionModal(item)}
                          className="text-left group cursor-pointer"
                        >
                          <span className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition block">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {item.description || 'No description provided'}
                          </span>
                        </button>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-semibold border border-gray-200">
                          {item.subject?.name || 'Subject'}
                        </span>
                      </td>

                      <td className="p-3.5 text-gray-700">
                        {item.teacher ? `${item.teacher.first_name} ${item.teacher.last_name}` : 'Faculty Teacher'}
                      </td>

                      <td className="p-3.5 text-gray-700">
                        <div className="font-semibold text-gray-900">{formatDate(item.due_date)}</div>
                        {isOverdue ? (
                          <span className="text-[10px] text-red-600 font-bold block">
                            Deadline passed
                          </span>
                        ) : !isSubmitted && !isGraded ? (
                          <span className={`text-[10px] font-bold block ${
                            item.daysRemaining <= 2 ? 'text-amber-600' : 'text-gray-500'
                          }`}>
                            {item.daysRemaining <= 0 ? 'Due Today' : `${item.daysRemaining} days left`}
                          </span>
                        ) : null}
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-sm">
                        {isGraded ? (
                          <div className="text-emerald-700">
                            <span>{item.submission.marks_obtained}</span>
                            <span className="text-gray-400 font-normal"> / {item.total_marks}</span>
                          </div>
                        ) : (
                          <span className="text-gray-700">{item.total_marks || 100}</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        {getStatusBadge(item.status)}
                      </td>

                      <td className="p-3.5 text-center pr-5">
                        {isGraded ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSubmissionModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-xs font-bold transition cursor-pointer"
                          >
                            <span>🏆 View Marks</span>
                          </button>
                        ) : isSubmitted ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSubmissionModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 text-xs font-bold transition cursor-pointer"
                          >
                            <span>👁️ My Submission</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenSubmissionModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                          >
                            <span>📤 Submit Work</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SUBMISSION & EVALUATION DETAILS MODAL DIALOG               */}
      {/* ========================================================= */}
      {activeModalAssignment && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 transition-all duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setActiveModalAssignment(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 text-white px-6 py-4 flex items-center justify-between shadow-md flex-shrink-0">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📝</span>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    {activeModalAssignment.title}
                  </h2>
                  <p className="text-xs text-blue-200 mt-0.5">
                    {activeModalAssignment.subject?.name || 'Subject'} • Class {currentStudent?.class?.name || currentStudent?.class_id} • Due: {formatDate(activeModalAssignment.due_date)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalAssignment(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {/* Assignment Instructions & Meta */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2.5">
                  <span className="font-bold text-gray-900 text-sm">Assignment Instructions</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Total Marks:</span>
                    <strong className="text-gray-900 font-mono text-sm">{activeModalAssignment.total_marks || 100}</strong>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {activeModalAssignment.description || 'Complete the assignment questions as directed by your subject teacher.'}
                </p>
              </div>

              {/* If Graded: Show Marks & Feedback Card */}
              {activeModalAssignment.isGraded && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      🏆 Teacher Assessment & Marks Awarded
                    </span>
                    <Badge variant="success">Graded</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-700 font-mono">
                      {activeModalAssignment.submission.marks_obtained}
                    </span>
                    <span className="text-gray-500 text-base">/ {activeModalAssignment.total_marks || 100} Marks</span>
                    <span className="ml-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
                      {Math.round(((parseFloat(activeModalAssignment.submission.marks_obtained) || 0) / (activeModalAssignment.total_marks || 100)) * 100)}%
                    </span>
                  </div>
                  {activeModalAssignment.submission.feedback && (
                    <div className="bg-white/80 border border-emerald-200 rounded-lg p-3 text-xs text-gray-800">
                      <span className="font-bold text-emerald-900 block mb-0.5">Teacher Feedback:</span>
                      <p className="italic text-gray-700">{activeModalAssignment.submission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Submission Form / Previous Submission View */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <span>📤</span>
                    <span>
                      {activeModalAssignment.isSubmitted ? 'Your Submitted Work' : 'Turn In Your Work'}
                    </span>
                  </h3>
                  {activeModalAssignment.isSubmitted && (
                    <span className="text-gray-500 font-mono text-[11px]">
                      Submitted: {formatDate(activeModalAssignment.submission?.submitted_at)}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSubmitWork} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Answer / Solution Text
                    </label>
                    <textarea
                      rows={5}
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder="Type or paste your answers, summary, or response here..."
                      className="input-field text-xs font-mono"
                      disabled={activeModalAssignment.isGraded || submitting}
                      required={!attachmentUrl}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Attachment / Drive Document Link (Optional)
                    </label>
                    <input
                      type="text"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/... or link to submitted document"
                      className="input-field text-xs"
                      disabled={activeModalAssignment.isGraded || submitting}
                    />
                  </div>

                  {/* Submission Footer Actions */}
                  <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveModalAssignment(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition cursor-pointer"
                    >
                      Close
                    </button>

                    {!activeModalAssignment.isGraded && (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : activeModalAssignment.isSubmitted ? (
                          <>
                            <span>🔄</span>
                            <span>Update Submission</span>
                          </>
                        ) : (
                          <>
                            <span>🚀</span>
                            <span>Turn In Assignment</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsView;

