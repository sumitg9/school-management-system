import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { communicationAPI, classAPI, studentAPI, teacherAPI } from '../../services/api';
import { toast } from 'react-toastify';

const CATEGORIES = [
  'All',
  'Academic',
  'PTM Request',
  'Attendance',
  'Behavior',
  'Homework',
  'General',
];

const QUICK_REPLIES = {
  parent: [
    'Thank you for the update!',
    'Meeting appointment confirmed.',
    'We will review this at home with our child.',
    'Please let me know if an in-person meeting is needed.',
    'Understood, thank you for your support.',
  ],
  teacher: [
    'Thank you for the prompt response.',
    'Looking forward to our parent-teacher discussion.',
    'Student has shown steady improvement this week.',
    'Please check the homework assignments tab.',
    'Feel free to reach out anytime during school hours.',
  ],
};

const Communication = () => {
  const {
    user,
    isParent,
    isTeacher,
    isAdmin,
    parentChildren,
    activeChild,
    filterTeacherClasses,
    filterTeacherStudents,
  } = useAuth();
  const { confirmAction } = useConfirm();

  // Active user identity
  const userRole = isParent() ? 'parent' : isTeacher() ? 'teacher' : 'admin';
  const userEmail = user?.email || '';

  // Thread list state
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [loadingThreads, setLoadingThreads] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all', 'active', 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [childFilter, setChildFilter] = useState(activeChild?.id ? String(activeChild.id) : 'all');

  // Active thread messages & composer state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatMessagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // New Conversation Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isPTMModalOpen, setIsPTMModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [newThreadData, setNewThreadData] = useState({
    student_id: '',
    student_name: '',
    student_class: '',
    parent_email: '',
    parent_name: '',
    parent_phone: '',
    teacher_email: '',
    teacher_name: '',
    teacher_subject: '',
    subject: '',
    category: 'Academic',
    priority: 'normal',
    initial_message: '',
  });

  // PTM Request Form State
  const [ptmData, setPtmData] = useState({
    date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    time: '03:30 PM',
    mode: 'In-Person (Staff Room / Lab)',
    agenda: 'Quarterly academic review and student progress discussion',
  });

  // Load threads
  const loadThreads = useCallback(async () => {
    try {
      setLoadingThreads(true);
      const res = await communicationAPI.getThreads({
        userRole,
        userEmail,
        childName: isParent() && activeChild ? `${activeChild.first_name} ${activeChild.last_name}` : null,
        category: selectedCategory,
        status: selectedStatus,
        search: searchQuery,
      });

      if (res.success) {
        setThreads(res.data);
        // Automatically select the first thread if none is selected or current was removed
        if (res.data.length > 0) {
          if (!selectedThreadId || !res.data.some(t => t.id === selectedThreadId)) {
            setSelectedThreadId(res.data[0].id);
          }
        } else {
          setSelectedThreadId(null);
        }
      }
    } catch (err) {
      toast.error('Failed to load conversations');
      console.error(err);
    } finally {
      setLoadingThreads(false);
    }
  }, [userRole, userEmail, selectedCategory, selectedStatus, searchQuery, activeChild, selectedThreadId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load messages for selected thread
  const loadMessages = useCallback(async (threadId) => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    try {
      setLoadingMessages(true);
      const res = await communicationAPI.getThreadMessages(threadId);
      if (res.success) {
        setMessages(res.data);
        // Mark thread as read for current viewer
        await communicationAPI.markThreadRead(threadId, userRole);
      }
    } catch (err) {
      toast.error('Failed to load thread messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedThreadId) {
      loadMessages(selectedThreadId);
    }
  }, [selectedThreadId, loadMessages]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Active selected thread object
  const activeThread = useMemo(() => {
    return threads.find(t => t.id === selectedThreadId) || null;
  }, [threads, selectedThreadId]);

  // Pre-load reference lists for the "New Conversation" modal
  const loadReferenceData = async () => {
    try {
      // 1. Classes
      const classRes = await classAPI.getAll({ per_page: 100 });
      if (classRes.success) {
        setClasses(filterTeacherClasses ? filterTeacherClasses(classRes.data) : classRes.data);
      }

      // 2. Teachers
      const teacherRes = await teacherAPI.getAll({ per_page: 100 });
      if (teacherRes.success) {
        setAvailableTeachers(teacherRes.data);
      }

      // 3. Students
      const studentRes = await studentAPI.getAll({ per_page: 200 });
      if (studentRes.success) {
        setAvailableStudents(filterTeacherStudents ? filterTeacherStudents(studentRes.data) : studentRes.data);
      }
    } catch (err) {
      console.error('Failed to load communication reference data', err);
    }
  };

  // Open New Conversation Modal
  const handleOpenNewModal = () => {
    loadReferenceData();

    if (isParent()) {
      // Parent defaults to active child and first available teacher
      const initialChild = activeChild || (parentChildren && parentChildren[0]);
      setNewThreadData({
        student_id: initialChild?.id || '',
        student_name: initialChild ? `${initialChild.first_name} ${initialChild.last_name}` : '',
        student_class: initialChild?.class?.name || (initialChild?.class_id ? `Class ${initialChild.class_id}` : 'Class 7-A'),
        parent_email: user?.email || 'suresh.sharma@gmail.com',
        parent_name: user?.name || 'Suresh Sharma',
        parent_phone: user?.phone || '9876543210',
        teacher_email: 'rajesh.kumar@school.com',
        teacher_name: 'Rajesh Kumar',
        teacher_subject: 'Mathematics',
        subject: '',
        category: 'Academic',
        priority: 'normal',
        initial_message: '',
      });
    } else if (isTeacher()) {
      // Teacher defaults
      setNewThreadData({
        student_id: '',
        student_name: '',
        student_class: '',
        parent_email: '',
        parent_name: '',
        parent_phone: '',
        teacher_email: user?.email || 'rajesh.kumar@school.com',
        teacher_name: user?.name || 'Rajesh Kumar',
        teacher_subject: 'Mathematics',
        subject: '',
        category: 'Academic',
        priority: 'normal',
        initial_message: '',
      });
    } else {
      // Admin
      setNewThreadData({
        student_id: '',
        student_name: '',
        student_class: '',
        parent_email: '',
        parent_name: '',
        parent_phone: '',
        teacher_email: '',
        teacher_name: '',
        teacher_subject: '',
        subject: '',
        category: 'General',
        priority: 'normal',
        initial_message: '',
      });
    }

    setIsNewModalOpen(true);
  };

  // Submit New Conversation
  const handleCreateThreadSubmit = async (e) => {
    e.preventDefault();
    if (!newThreadData.subject.trim()) {
      toast.error('Please enter a conversation topic or subject');
      return;
    }
    if (!newThreadData.initial_message.trim()) {
      toast.error('Please provide an initial message');
      return;
    }

    try {
      const res = await communicationAPI.createThread({
        ...newThreadData,
        sender_id: userEmail,
        sender_name: user?.name || (isParent() ? 'Parent' : 'Faculty'),
        sender_role: userRole,
      });

      if (res.success) {
        toast.success('Conversation started successfully!');
        setIsNewModalOpen(false);
        await loadThreads();
        setSelectedThreadId(res.data.id);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  /*
   * MODERN WEB GUIDANCE: IME-Safe Enter-To-Submit Handler
   * Native isComposing check paired with event.keyCode === 229 fallback catches
   * out-of-order confirming Enter keystrokes from Input Method Editors (CJK keyboards),
   * preventing premature submission while typing conversion candidates.
   */
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Block submission if user is actively composing characters in an IME
      if (e.isComposing || e.keyCode === 229) {
        return;
      }
      handleSendMessage(e);
    }
  };

  // Send message in existing thread
  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedThreadId || !newMessageText.trim() || sendingMessage) return;

    const messageContent = newMessageText.trim();
    setNewMessageText('');

    try {
      setSendingMessage(true);
      const res = await communicationAPI.sendMessage(selectedThreadId, {
        sender_id: userEmail,
        sender_name: user?.name || (isParent() ? 'Parent' : 'Teacher'),
        sender_role: userRole,
        content: messageContent,
      });

      if (res.success) {
        setMessages(prev => [...prev, res.data]);
        // Update thread preview in list
        setThreads(prev =>
          prev.map(t =>
            t.id === selectedThreadId
              ? {
                  ...t,
                  last_message_at: new Date().toISOString(),
                  last_message_preview: messageContent,
                }
              : t
          )
        );
      }
    } catch (err) {
      toast.error('Failed to send message');
      setNewMessageText(messageContent); // restore draft
    } finally {
      setSendingMessage(false);
      messageInputRef.current?.focus();
    }
  };

  // Submit PTM (Parent-Teacher Meeting) Request
  const handleSendPTMRequest = async (e) => {
    e.preventDefault();
    if (!selectedThreadId) return;

    try {
      const res = await communicationAPI.sendMessage(selectedThreadId, {
        sender_id: userEmail,
        sender_name: user?.name || (isParent() ? 'Parent' : 'Faculty'),
        sender_role: userRole,
        content: `Parent-Teacher Meeting Appointment proposed for ${ptmData.date} at ${ptmData.time} (${ptmData.mode}).`,
        meeting_request: {
          date: ptmData.date,
          time: ptmData.time,
          mode: ptmData.mode,
          agenda: ptmData.agenda,
          status: 'pending',
        },
      });

      if (res.success) {
        setMessages(prev => [...prev, res.data]);
        setIsPTMModalOpen(false);
        toast.success('Parent-Teacher Meeting request proposed in chat!');
      }
    } catch (err) {
      toast.error('Failed to schedule meeting request');
    }
  };

  // Respond to meeting request (Confirm / Reschedule)
  const handleMeetingResponse = async (msgId, status) => {
    try {
      const res = await communicationAPI.respondMeeting(selectedThreadId, msgId, status);
      if (res.success) {
        setMessages(prev => prev.map(m => (m.id === msgId ? res.data : m)));
        toast.success(`Meeting appointment marked as ${status}!`);
      }
    } catch (err) {
      toast.error('Failed to update meeting status');
    }
  };

  // Toggle thread resolved / active status
  const handleToggleStatus = async () => {
    if (!activeThread) return;
    const newStatus = activeThread.status === 'resolved' ? 'active' : 'resolved';
    try {
      const res = await communicationAPI.updateThreadStatus(activeThread.id, newStatus);
      if (res.success) {
        setThreads(prev => prev.map(t => (t.id === activeThread.id ? res.data : t)));
        toast.success(`Conversation marked as ${newStatus}`);
      }
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  // Reset sample conversations
  const handleResetDefaults = () => {
    confirmAction(
      async () => {
        try {
          await communicationAPI.resetDefaults();
          toast.success('Reset communications to sample parent-teacher discussions!');
          loadThreads();
        } catch (err) {
          toast.error('Failed to reset conversations');
        }
      },
      {
        title: 'Restore Default Discussions',
        message: 'This will reset all parent-teacher message threads to realistic curated discussions. Proceed?',
        confirmText: 'Restore Discussions',
        type: 'info',
      }
    );
  };

  return (
    /* MAIN CONTAINER: Uses px-[15px] horizontal padding per user requirements */
    <div className="px-[15px] py-6 space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-3xl p-2 bg-blue-50 rounded-2xl text-blue-600 shadow-xs">💬</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isParent()
                  ? 'Teacher & School Communication'
                  : isTeacher()
                  ? 'Parent Communication Portal'
                  : 'Institutional Teacher-Parent Communications'}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                {isParent()
                  ? 'Directly message your child’s teachers, follow up on academics, and schedule Parent-Teacher Meetings.'
                  : isTeacher()
                  ? 'Coordinate directly with parents, share student progress updates, and schedule meetings.'
                  : 'Oversight and communication governance between faculty and student families.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition shadow-2xs"
            title="Restore sample discussions"
          >
            🔄 Reset Samples
          </button>
          <button
            type="button"
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
          >
            <span>+</span>
            <span>{isParent() ? 'Contact Teacher' : 'New Message'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Messenger Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Left Column: Thread List & Filters */}
        <div className="lg:col-span-5 border-r border-gray-100 flex flex-col h-full bg-gray-50/40">
          {/* Search Landmark */}
          <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
            <search className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm">
                🔍
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discussions, subjects, parents..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </search>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>Status:</span>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className={`px-2 py-0.5 rounded-md transition ${selectedStatus === 'all' ? 'bg-white shadow text-gray-900 font-bold' : 'text-gray-600'}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('active')}
                  className={`px-2 py-0.5 rounded-md transition ${selectedStatus === 'active' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-gray-600'}`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('resolved')}
                  className={`px-2 py-0.5 rounded-md transition ${selectedStatus === 'resolved' ? 'bg-white shadow text-gray-700 font-bold' : 'text-gray-600'}`}
                >
                  Resolved
                </button>
              </div>
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2 space-y-1">
            {loadingThreads ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="text-xs">Loading conversations...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-xs font-medium text-gray-600">No discussions found</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'Try adjusting your search or category filter.'
                    : 'Start a new conversation thread to communicate.'}
                </p>
              </div>
            ) : (
              threads.map(thread => {
                const isSelected = thread.id === selectedThreadId;
                const unreadCount = isParent() ? thread.unread_for_parent : thread.unread_for_teacher;
                const otherPartyName = isParent() ? thread.teacher_name : thread.parent_name;
                const otherPartySubtitle = isParent() ? `${thread.teacher_subject} Faculty` : `Parent of ${thread.student_name}`;

                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-blue-50/90 border border-blue-200 shadow-2xs'
                        : 'hover:bg-gray-100/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {otherPartyName?.charAt(0) || '👤'}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 leading-tight">
                            {otherPartyName}
                          </h4>
                          <span className="text-[10px] text-gray-500">
                            {otherPartySubtitle}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] text-gray-400">
                          {new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {unreadCount > 0 && (
                          <span className="block mt-0.5 ml-auto w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold text-center leading-4">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-200 text-gray-700">
                          {thread.student_class}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-800 truncate">
                          {thread.subject}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-1">
                        {thread.last_message_preview}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">
                        Student: <strong className="text-gray-700">{thread.student_name}</strong>
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          thread.status === 'resolved'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {thread.status === 'resolved' ? 'Resolved' : 'Active'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Workspace */}
        <div className="lg:col-span-7 flex flex-col h-full bg-white">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    {(isParent() ? activeThread.teacher_name : activeThread.parent_name)?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900">
                        {isParent() ? activeThread.teacher_name : activeThread.parent_name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {isParent() ? `${activeThread.teacher_subject} Teacher` : 'Parent'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>Student: <strong>{activeThread.student_name}</strong> ({activeThread.student_class})</span>
                      <span>•</span>
                      <span>📞 {isParent() ? activeThread.teacher_email : activeThread.parent_phone || activeThread.parent_email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPTMModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-2xs"
                    title="Propose Parent-Teacher Meeting time slot"
                  >
                    📅 Schedule PTM
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      activeThread.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {activeThread.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                  </button>
                </div>
              </div>

              {/* Subject Banner */}
              <div className="px-4 py-2 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                <span>
                  <strong>Topic:</strong> {activeThread.subject}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-blue-200 text-blue-800">
                  {activeThread.category}
                </span>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                {loadingMessages ? (
                  <div className="p-8 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-xs">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-xs">No messages in this discussion yet.</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isCurrentUser = msg.sender_id === userEmail || msg.sender_role === userRole;
                    const isMeetingCard = !!msg.meeting_request;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1 px-1">
                          <span className="font-semibold text-gray-700">{msg.sender_name}</span>
                          <span>•</span>
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Normal bubble */}
                        {!isMeetingCard ? (
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                              isCurrentUser
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ) : (
                          /* PTM Meeting Invitation Card */
                          <div className="max-w-[88%] w-full rounded-2xl border-2 border-indigo-200 bg-white p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-900">
                                <span>📅</span> Parent-Teacher Meeting (PTM) Request
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                  msg.meeting_request.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {msg.meeting_request.status === 'confirmed' ? '✓ Confirmed' : 'Pending Confirmation'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400 block text-[10px]">Proposed Date:</span>
                                <span className="font-bold text-gray-800">📅 {msg.meeting_request.date}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[10px]">Time Slot:</span>
                                <span className="font-bold text-gray-800">⏰ {msg.meeting_request.time}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-400 block text-[10px]">Meeting Venue / Mode:</span>
                                <span className="font-medium text-gray-800">📍 {msg.meeting_request.mode}</span>
                              </div>
                              {msg.meeting_request.agenda && (
                                <div className="col-span-2">
                                  <span className="text-gray-400 block text-[10px]">Discussion Agenda:</span>
                                  <span className="text-gray-700 italic">{msg.meeting_request.agenda}</span>
                                </div>
                              )}
                            </div>

                            {/* Accept / Confirm Actions if pending */}
                            {msg.meeting_request.status !== 'confirmed' && (
                              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleMeetingResponse(msg.id, 'confirmed')}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition"
                                >
                                  ✓ Confirm Appointment
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Quick Reply Pills */}
              <div className="px-4 py-2 border-t border-gray-100 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] text-gray-400 flex-shrink-0">Quick reply:</span>
                {(QUICK_REPLIES[userRole] || QUICK_REPLIES.teacher).map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewMessageText(reply)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition whitespace-nowrap"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Message Composer (Modern Web Guidance Compliant IME-Safe Enter) */}
              <div className="p-4 border-t border-gray-100 bg-white">
                <form id="chat-form" onSubmit={handleSendMessage} className="space-y-2">
                  <div className="relative">
                    <label htmlFor="chat-message-input" className="sr-only">
                      Type your message to {isParent() ? activeThread.teacher_name : activeThread.parent_name}
                    </label>
                    <textarea
                      id="chat-message-input"
                      ref={messageInputRef}
                      rows={2}
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder={`Write message to ${isParent() ? activeThread.teacher_name : activeThread.parent_name}... (Press Enter to send, Shift+Enter for newline)`}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      Press <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-200">Shift+Enter</kbd> for newline
                    </span>

                    <button
                      type="submit"
                      id="send-button"
                      disabled={!newMessageText.trim() || sendingMessage}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-xl transition shadow-2xs cursor-pointer"
                    >
                      <span>{sendingMessage ? 'Sending...' : 'Send Message'}</span>
                      <span>✈️</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <span className="text-5xl block mb-3">💬</span>
              <h3 className="text-base font-bold text-gray-800">Select a discussion thread</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Choose a conversation from the left panel to read teacher updates, reply, or schedule a parent-teacher appointment.
              </p>
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
              >
                + Start New Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Modal: New Conversation Dialog */}
      {isNewModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-conversation-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsNewModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 id="new-conversation-title" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>💬</span>
                <span>{isParent() ? 'Contact Student’s Teacher' : 'Start Parent Discussion'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThreadSubmit} className="mt-4 space-y-4">
              {/* Student Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Student / Ward *
                </label>
                {isParent() ? (
                  <select
                    value={newThreadData.student_id}
                    onChange={(e) => {
                      const child = parentChildren?.find(c => String(c.id) === String(e.target.value));
                      if (child) {
                        setNewThreadData(prev => ({
                          ...prev,
                          student_id: child.id,
                          student_name: `${child.first_name} ${child.last_name}`,
                          student_class: child.class?.name || `Class ${child.class_id}`,
                        }));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {parentChildren && parentChildren.length > 0 ? (
                      parentChildren.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name} ({c.class?.name || `Class ${c.class_id}`})
                        </option>
                      ))
                    ) : (
                      <option value="1">Aarav Sharma (Class 7-A)</option>
                    )}
                  </select>
                ) : (
                  <select
                    value={newThreadData.student_id}
                    onChange={(e) => {
                      const student = availableStudents.find(s => String(s.id) === String(e.target.value));
                      if (student) {
                        setNewThreadData(prev => ({
                          ...prev,
                          student_id: student.id,
                          student_name: `${student.first_name} ${student.last_name}`,
                          student_class: student.class?.name || `Class ${student.class_id}`,
                          parent_name: student.father_name || student.mother_name || 'Parent',
                          parent_phone: student.parent_phone || student.emergency_contact || '',
                          parent_email: student.email || `${student.first_name.toLowerCase()}.parent@gmail.com`,
                        }));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Student from Class --</option>
                    {availableStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.class?.name || `Class ${s.class_id}`}) - Parent: {s.father_name || s.mother_name || 'Family'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Teacher Selection (if Parent) or Parent Info (if Teacher) */}
              {isParent() ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Faculty / Teacher *
                  </label>
                  <select
                    value={newThreadData.teacher_email}
                    onChange={(e) => {
                      const teacher = availableTeachers.find(t => t.email === e.target.value);
                      if (teacher) {
                        setNewThreadData(prev => ({
                          ...prev,
                          teacher_email: teacher.email,
                          teacher_name: `${teacher.first_name} ${teacher.last_name}`,
                          teacher_subject: teacher.subject || 'Faculty',
                        }));
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="rajesh.kumar@school.com">Rajesh Kumar (Mathematics)</option>
                    <option value="priya.sharma@school.com">Priya Sharma (Science & Biology)</option>
                    <option value="anjali.gupta@school.com">Anjali Gupta (English Literature)</option>
                    <option value="amit.patel@school.com">Amit Patel (Sports & Physical Ed)</option>
                    {availableTeachers.map(t => (
                      <option key={t.id} value={t.email}>
                        {t.first_name} {t.last_name} ({t.subject || 'Teacher'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Parent Contact Name:</span>
                    <span className="text-xs font-bold text-gray-900">{newThreadData.parent_name || 'Will auto-fill'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Verified Contact Phone:</span>
                    <span className="text-xs font-bold text-gray-900">{newThreadData.parent_phone || 'Will auto-fill'}</span>
                  </div>
                </div>
              )}

              {/* Topic / Subject & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subject / Discussion Topic *
                  </label>
                  <input
                    type="text"
                    value={newThreadData.subject}
                    onChange={(e) => setNewThreadData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="e.g. Science Fair Guidance or Term 2 Exam Review"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newThreadData.category}
                    onChange={(e) => setNewThreadData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.slice(1).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newThreadData.priority}
                    onChange={(e) => setNewThreadData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">🟢 Normal</option>
                    <option value="important">🟡 Important</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  rows={4}
                  value={newThreadData.initial_message}
                  onChange={(e) => setNewThreadData(prev => ({ ...prev, initial_message: e.target.value }))}
                  placeholder="Type your message or question..."
                  required
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition"
                >
                  Start Conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accessible Modal: PTM Meeting Scheduler */}
      {isPTMModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ptm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsPTMModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 id="ptm-modal-title" className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>📅</span>
                <span>Propose Parent-Teacher Meeting</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsPTMModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendPTMRequest} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Meeting Date *
                  </label>
                  <input
                    type="date"
                    value={ptmData.date}
                    onChange={(e) => setPtmData(prev => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Preferred Time Slot *
                  </label>
                  <select
                    value={ptmData.time}
                    onChange={(e) => setPtmData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                    <option value="04:15 PM">04:15 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Meeting Venue / Format *
                </label>
                <select
                  value={ptmData.mode}
                  onChange={(e) => setPtmData(prev => ({ ...prev, mode: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="In-Person (Faculty Room 204)">In-Person (Faculty Room 204)</option>
                  <option value="In-Person (Principal Conference Hall)">In-Person (Principal Conference Hall)</option>
                  <option value="Virtual Video Call (Google Meet)">Virtual Video Call (Google Meet)</option>
                  <option value="Telephone Consultation">Telephone Consultation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Meeting Agenda / Goal
                </label>
                <textarea
                  rows={2}
                  value={ptmData.agenda}
                  onChange={(e) => setPtmData(prev => ({ ...prev, agenda: e.target.value }))}
                  placeholder="e.g. Science project discussion, behavioral observation, exam review"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPTMModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition"
                >
                  Send PTM Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communication;
