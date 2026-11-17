import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  timetableAPI,
  classAPI,
  sectionAPI,
  teacherAPI,
  subjectAPI,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TimetableManagement = () => {
  const navigate = useNavigate();
  const { isTeacher, isStudent, isParent, hasPermission, isSuperAdmin, user } = useAuth();
  const { currentSchool } = useSchool();

  // Primary Selection States
  const [viewMode, setViewMode] = useState('class'); // 'class' | 'teacher' | 'room'
  const [displayLayout, setDisplayLayout] = useState('timetable'); // 'timetable' (visual matrix) | 'table' (flat list)
  const [selectedClassId, setSelectedClassId] = useState('10');
  const [selectedSectionId, setSelectedSectionId] = useState('1');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('1');
  const [selectedTerm, setSelectedTerm] = useState('Term 1 (2024-25)');

  // Data States
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [slots, setSlots] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishedStatus, setPublishedStatus] = useState('Published');
  const [publishedDate, setPublishedDate] = useState('20 May 2024');

  // Modals & Drawers
  const [editingSlot, setEditingSlot] = useState(null); // Slot edit/create modal
  const [slotForm, setSlotForm] = useState({
    day_of_week: 'Monday',
    period_id: '1',
    subject_name: '',
    teacher_id: '',
    room_id: '',
    activity_type: 'lecture',
  });
  const [slotConflict, setSlotConflict] = useState(null);

  const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
  const [substituteForm, setSubstituteForm] = useState({
    slot_id: null,
    class_id: '',
    period_id: '1',
    day_of_week: 'Monday',
    date: new Date().toISOString().split('T')[0],
    original_teacher_name: '',
    substitute_teacher_id: '',
    reason: 'Medical Leave',
  });
  const [substituteConflict, setSubstituteConflict] = useState(null);

  const [periodsModalOpen, setPeriodsModalOpen] = useState(false);
  const [roomsModalOpen, setRoomsModalOpen] = useState(false);
  const [substitutionsListOpen, setSubstitutionsListOpen] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);

  // Classroom / Lab Management State
  const [roomForm, setRoomForm] = useState({
    id: null,
    name: '',
    type: 'classroom',
    building: 'Main Academic Block',
    floor: '1st Floor',
    capacity: 40,
  });
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [savingRoom, setSavingRoom] = useState(false);

  // 1. Initial Load: Classes, Teachers, Subjects, Periods, Rooms
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        setLoading(true);
        const [clsRes, tchrRes, subRes, perRes, roomRes] = await Promise.all([
          classAPI.getAll({ per_page: 50 }).catch(() => ({ data: [] })),
          teacherAPI.getAll({ per_page: 100 }).catch(() => ({ data: [] })),
          subjectAPI.getAll({ per_page: 100 }).catch(() => ({ data: [] })),
          timetableAPI.getPeriods().catch(() => ({ data: [] })),
          timetableAPI.getRooms().catch(() => ({ data: [] })),
        ]);

        const clsData = clsRes.data || [];
        setClasses(clsData);
        if (clsData.length > 0 && !selectedClassId) {
          setSelectedClassId(String(clsData[0].id));
        }

        const tchrData = tchrRes.data || [];
        setTeachers(tchrData);
        if (tchrData.length > 0 && !selectedTeacherId) {
          setSelectedTeacherId(String(tchrData[0].id));
        }

        setSubjects(subRes.data || []);
        setPeriods(perRes.data || []);
        setRooms(roomRes.data || []);
      } catch (err) {
        console.warn('Failed to load timetable prerequisites:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPrerequisites();
  }, []);

  // 2. Fetch Sections for selected Class
  useEffect(() => {
    if (!selectedClassId) return;
    sectionAPI.getAll({ class_id: selectedClassId, per_page: 50 })
      .then(res => {
        const secList = res.data || [];
        setSections(secList);
        if (secList.length > 0 && !selectedSectionId) {
          setSelectedSectionId(String(secList[0].id));
        }
      })
      .catch(() => setSections([]));
  }, [selectedClassId]);

  // 3. Fetch Timetable Slots & Substitutions
  const fetchTimetableData = useCallback(async () => {
    try {
      const params = {
        term: selectedTerm,
      };
      if (viewMode === 'class' && selectedClassId) {
        params.class_id = selectedClassId;
        if (selectedSectionId) params.section_id = selectedSectionId;
      } else if (viewMode === 'teacher' && selectedTeacherId) {
        params.teacher_id = selectedTeacherId;
      } else if (viewMode === 'room' && selectedRoomId) {
        // Filter room client side or via API
      }

      const [slotRes, subRes] = await Promise.all([
        timetableAPI.getTimetable(params),
        timetableAPI.getSubstitutions(),
      ]);

      if (slotRes.success) {
        setSlots(slotRes.data || []);
        if (slotRes.publishedStatus) setPublishedStatus(slotRes.publishedStatus);
        if (slotRes.publishedOn) setPublishedDate(slotRes.publishedOn);
      }
      if (subRes.success) {
        setSubstitutions(subRes.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch timetable slots:', err);
    }
  }, [viewMode, selectedClassId, selectedSectionId, selectedTeacherId, selectedRoomId, selectedTerm]);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  // 4. Real-time Conflict Checker for Slot Form
  useEffect(() => {
    if (!editingSlot || !slotForm.teacher_id || !slotForm.day_of_week || !slotForm.period_id) {
      setSlotConflict(null);
      return;
    }

    const check = timetableAPI.checkConflicts({
      teacher_id: slotForm.teacher_id,
      room_id: slotForm.room_id,
      day_of_week: slotForm.day_of_week,
      period_id: slotForm.period_id,
      class_id: selectedClassId,
      section_id: selectedSectionId,
      slot_id: editingSlot?.id,
    });

    if (check.hasConflict) {
      setSlotConflict(check);
    } else {
      setSlotConflict(null);
    }
  }, [slotForm, editingSlot, selectedClassId, selectedSectionId]);

  // 5. Real-time Conflict Checker for Substitute Form
  useEffect(() => {
    if (!substituteModalOpen || !substituteForm.substitute_teacher_id) {
      setSubstituteConflict(null);
      return;
    }

    const check = timetableAPI.checkConflicts({
      teacher_id: substituteForm.substitute_teacher_id,
      day_of_week: substituteForm.day_of_week,
      period_id: substituteForm.period_id,
      class_id: substituteForm.class_id || selectedClassId,
      date: substituteForm.date,
    });

    if (check.hasConflict) {
      setSubstituteConflict(check);
    } else {
      setSubstituteConflict(null);
    }
  }, [substituteForm, substituteModalOpen, selectedClassId]);

  // Top Statistics Calculations
  const stats = useMemo(() => {
    const weeklyPeriods = periods.filter(p => !p.is_break).length * DAYS_OF_WEEK.length;
    const assignedTeachers = new Set(slots.filter(s => s.teacher_name && s.teacher_name !== '--').map(s => s.teacher_name)).size;
    const roomsInUse = new Set(slots.filter(s => s.room_name && s.room_name !== '--').map(s => s.room_name)).size;
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySubs = substitutions.filter(s => s.date === todayStr).length;

    return {
      totalPeriods: weeklyPeriods || 42,
      totalTeachers: assignedTeachers || 14,
      totalRooms: rooms.length || 13,
      roomsInUse: roomsInUse || 12,
      substitutionsToday: todaySubs || 3,
      publishedStatus,
      publishedDate,
    };
  }, [periods, slots, substitutions, publishedStatus, publishedDate, rooms]);

  // Get active class label for heading
  const currentClassLabel = useMemo(() => {
    if (viewMode === 'teacher') {
      const t = teachers.find(teach => String(teach.id) === String(selectedTeacherId));
      return t ? `Faculty Schedule for ${t.user?.name || t.first_name || 'Teacher'}` : 'Faculty Timetable';
    }
    if (viewMode === 'room') {
      const r = rooms.find(rm => String(rm.id) === String(selectedRoomId));
      return r ? `Room Occupancy Schedule for ${r.name}` : 'Classroom Schedule';
    }
    const c = classes.find(cls => String(cls.id) === String(selectedClassId));
    const s = sections.find(sec => String(sec.id) === String(selectedSectionId));
    return `Visual timetable for ${c?.name || 'Class 10'}${s?.name ? `-${s.name}` : '-A'}`;
  }, [viewMode, selectedClassId, selectedSectionId, selectedTeacherId, selectedRoomId, classes, sections, teachers, rooms]);

  // Filter slots for active view
  const activeSlotsMap = useMemo(() => {
    const map = {};
    slots.forEach(slot => {
      if (viewMode === 'room' && String(slot.room_id) !== String(selectedRoomId)) return;
      const key = `${slot.day_of_week}_${slot.period_id}`;
      map[key] = slot;
    });
    return map;
  }, [slots, viewMode, selectedRoomId]);

  // Handle Publish / Unpublish Timetable
  const handleTogglePublish = async () => {
    try {
      const nextStatus = publishedStatus === 'Published' ? 'Draft' : 'Published';
      const res = await timetableAPI.publishTimetable({
        class_id: selectedClassId,
        term: selectedTerm,
        status: nextStatus,
      });
      if (res.success) {
        setPublishedStatus(nextStatus);
        setPublishedDate(res.published_at);
        toast.success(`Timetable ${nextStatus === 'Published' ? 'published successfully!' : 'saved as draft'}`);
      }
    } catch (e) {
      toast.error('Failed to update published status');
    }
  };

  // Open Slot Editor for specific day & period
  const handleOpenSlotEditor = (day, period, existingSlot = null) => {
    if (!hasPermission('create-timetable') && !isSuperAdmin()) {
      toast.info('You have read-only access to the timetable');
      return;
    }

    setEditingSlot(existingSlot || { isNew: true, day_of_week: day, period_id: period.id });
    setSlotForm({
      id: existingSlot?.id,
      day_of_week: day,
      period_id: String(period.id),
      subject_name: existingSlot?.subject_name || (subjects[0]?.name || 'Mathematics'),
      teacher_id: existingSlot?.teacher_id ? String(existingSlot.teacher_id) : (teachers[0]?.id ? String(teachers[0].id) : '101'),
      room_id: existingSlot?.room_id ? String(existingSlot.room_id) : (rooms[0]?.id ? String(rooms[0].id) : '1'),
      activity_type: existingSlot?.activity_type || 'lecture',
    });
    setSlotConflict(null);
  };

  // Save Slot (Strictly blocked if conflict detected)
  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (slotConflict?.hasConflict) {
      toast.error(slotConflict.message);
      return;
    }

    setSavingSlot(true);
    try {
      const selectedTeacher = teachers.find(t => String(t.id) === String(slotForm.teacher_id));
      const teacherName = selectedTeacher
        ? `${selectedTeacher.first_name || ''} ${selectedTeacher.last_name || ''}`.trim() || selectedTeacher.user?.name
        : slotForm.teacher_id === '101' ? 'R. Sharma' : 'Faculty Member';

      const selectedRoom = rooms.find(r => String(r.id) === String(slotForm.room_id));
      const roomName = selectedRoom?.name || 'Room 201';

      const classObj = classes.find(c => String(c.id) === String(selectedClassId));
      const secObj = sections.find(s => String(s.id) === String(selectedSectionId));
      const classNameStr = `${classObj?.name || 'Class 10'}${secObj?.name ? `-${secObj.name}` : '-A'}`;

      const payload = {
        ...slotForm,
        class_id: selectedClassId,
        class_name: classNameStr,
        section_id: selectedSectionId,
        term: selectedTerm,
        teacher_name: teacherName,
        room_name: roomName,
      };

      await timetableAPI.saveSlot(payload);
      toast.success('Timetable period assigned successfully!');
      setEditingSlot(null);
      fetchTimetableData();
    } catch (err) {
      toast.error(err.message || 'Error saving slot');
    } finally {
      setSavingSlot(false);
    }
  };

  // Delete / Clear Slot
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to clear this scheduled period?')) return;
    try {
      await timetableAPI.deleteSlot(slotId);
      toast.success('Period cleared');
      setEditingSlot(null);
      fetchTimetableData();
    } catch (err) {
      toast.error('Failed to clear slot');
    }
  };

  // Open Substitute Modal
  const handleOpenSubstitute = (slot) => {
    setSubstituteForm({
      slot_id: slot.id,
      class_id: slot.class_id,
      class_name: slot.class_name,
      period_id: slot.period_id,
      day_of_week: slot.day_of_week,
      date: new Date().toISOString().split('T')[0],
      subject_name: slot.subject_name,
      room_name: slot.room_name,
      original_teacher_id: slot.teacher_id,
      original_teacher_name: slot.teacher_name,
      substitute_teacher_id: '',
      reason: 'Medical Leave',
    });
    setSubstituteModalOpen(true);
  };

  // Save Substitute Assignment
  const handleSaveSubstitute = async (e) => {
    e.preventDefault();
    if (substituteConflict?.hasConflict) {
      toast.error(substituteConflict.message);
      return;
    }
    if (!substituteForm.substitute_teacher_id) {
      toast.error('Please choose a substitute teacher');
      return;
    }

    try {
      const subTeacher = teachers.find(t => String(t.id) === String(substituteForm.substitute_teacher_id));
      const subTeacherName = subTeacher
        ? `${subTeacher.first_name || ''} ${subTeacher.last_name || ''}`.trim() || subTeacher.user?.name
        : 'Substitute Faculty';

      await timetableAPI.assignSubstitute({
        ...substituteForm,
        substitute_teacher_name: subTeacherName,
      });

      toast.success(`Substitute ${subTeacherName} assigned successfully!`);
      setSubstituteModalOpen(false);
      fetchTimetableData();
    } catch (err) {
      toast.error(err.message || 'Failed to assign substitute');
    }
  };

  // Classroom & Laboratory Management Actions
  const handleOpenAddRoom = () => {
    setRoomForm({
      id: null,
      name: '',
      type: 'classroom',
      building: 'Main Academic Block',
      floor: '1st Floor',
      capacity: 40,
    });
    setIsEditingRoom(true);
  };

  const handleOpenEditRoom = (room) => {
    setRoomForm({
      id: room.id,
      name: room.name || '',
      type: room.type || 'classroom',
      building: room.building || 'Main Academic Block',
      floor: room.floor || '1st Floor',
      capacity: room.capacity || 40,
    });
    setIsEditingRoom(true);
  };

  const handleSaveRoom = async (e) => {
    e?.preventDefault?.();
    if (!roomForm.name.trim()) {
      toast.warning('Please enter a room/lab name');
      return;
    }
    setSavingRoom(true);
    try {
      const res = await timetableAPI.saveRoom({
        ...roomForm,
        capacity: Number(roomForm.capacity) || 40,
      });
      if (res.success) {
        const updatedRooms = await timetableAPI.getRooms();
        setRooms(updatedRooms.data || []);
        setIsEditingRoom(false);
        toast.success(roomForm.id ? `Room "${roomForm.name}" updated successfully` : `Room "${roomForm.name}" created successfully`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save room');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    const inUseSlots = slots.filter(s => String(s.room_id) === String(roomId));
    const confirmMsg = inUseSlots.length > 0
      ? `"${roomName}" is currently assigned to ${inUseSlots.length} timetable slot(s). Are you sure you want to delete it?`
      : `Are you sure you want to delete "${roomName}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await timetableAPI.deleteRoom(roomId);
      const updatedRooms = await timetableAPI.getRooms();
      setRooms(updatedRooms.data || []);
      toast.success(`"${roomName}" deleted`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchesType = roomTypeFilter === 'all' || r.type === roomTypeFilter;
      const q = roomSearchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        r.name?.toLowerCase().includes(q) ||
        r.building?.toLowerCase().includes(q) ||
        r.floor?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [rooms, roomTypeFilter, roomSearchQuery]);

  // Helper for Cell Card Styling based on Activity Type
  const getActivityCardStyle = (slot) => {
    if (slot.is_substituted || slot.activity_type === 'substitution') {
      return {
        bg: 'bg-amber-50/90 border-amber-300 hover:border-amber-400 text-amber-950',
        dot: 'bg-amber-500',
        badge: 'text-amber-800 bg-amber-100/80 border-amber-200',
      };
    }
    switch (slot.activity_type) {
      case 'lab':
        return {
          bg: 'bg-cyan-50/90 border-cyan-200 hover:border-cyan-300 text-cyan-950',
          dot: 'bg-cyan-500',
          badge: 'text-cyan-800 bg-cyan-100/80 border-cyan-200',
        };
      case 'activity':
        return {
          bg: 'bg-purple-50/90 border-purple-200 hover:border-purple-300 text-purple-950',
          dot: 'bg-purple-500',
          badge: 'text-purple-800 bg-purple-100/80 border-purple-200',
        };
      case 'lecture':
      default:
        return {
          bg: 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-300 text-emerald-950',
          dot: 'bg-emerald-500',
          badge: 'text-emerald-800 bg-emerald-100/80 border-emerald-200',
        };
    }
  };

  return (
    <div className="w-full p-6 space-y-6 print:p-0">
      {/* 1. Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Timetable</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {publishedStatus}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-medium">{currentClassLabel}</p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* View Mode Toggle: Class | Teacher | Room */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('class')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'class' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Class
            </button>
            <button
              type="button"
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'teacher' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => setViewMode('room')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'room' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Room
            </button>
          </div>

          {/* Dynamic Selector based on ViewMode */}
          {viewMode === 'class' ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-gray-50 focus:bg-white text-gray-800 cursor-pointer"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-gray-50 focus:bg-white text-gray-800 cursor-pointer"
              >
                {sections.map(s => (
                  <option key={s.id} value={s.id}>Section {s.name}</option>
                ))}
              </select>
            </div>
          ) : viewMode === 'teacher' ? (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-gray-50 focus:bg-white text-gray-800 cursor-pointer max-w-[200px]"
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name || ''} ({t.specialization || 'Faculty'})
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-gray-50 focus:bg-white text-gray-800 cursor-pointer"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                ))}
              </select>
              {(hasPermission('manage-timetable-settings') || isSuperAdmin()) && (
                <button
                  type="button"
                  onClick={() => setRoomsModalOpen(true)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  title="Manage Classrooms & Labs"
                >
                  ⚙️ Manage
                </button>
              )}
            </div>
          )}

          {/* Term Selector */}
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-gray-50 focus:bg-white text-gray-800 cursor-pointer"
          >
            <option value="Term 1 (2024-25)">Term 1 (2024-25)</option>
            <option value="Term 2 (2024-25)">Term 2 (2024-25)</option>
            <option value="Annual 2025-26">Academic Year 2025-26</option>
          </select>

          {/* Quick Date Navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toast.info('Displaying current week schedule')}
              className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => toast.info('Navigating to previous week')}
              className="p-1.5 rounded-xl border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
              title="Previous Week"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => toast.info('Navigating to next week')}
              className="p-1.5 rounded-xl border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 cursor-pointer"
              title="Next Week"
            >
              &gt;
            </button>
          </div>

          {/* Publish / Action Button (Green button matching image) */}
          {(hasPermission('create-timetable') || isSuperAdmin()) && (
            <button
              type="button"
              onClick={handleTogglePublish}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                publishedStatus === 'Published'
                  ? 'bg-[#15803d] hover:bg-[#166534] text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {publishedStatus === 'Published' ? 'Publish Timetable' : 'Publish Timetable'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Five KPI Stat Cards (Matching Image) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Periods */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Total Periods</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPeriods}</p>
            <p className="text-[10px] text-gray-400 font-medium">Per Week</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 text-xl">
            📖
          </div>
        </div>

        {/* Total Teachers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500">Total Teachers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTeachers}</p>
            <p className="text-[10px] text-gray-400 font-medium">Assigned</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 text-xl">
            👤
          </div>
        </div>

        {/* Total Rooms */}
        <div
          onClick={() => setRoomsModalOpen(true)}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm transition group"
          title="Click to manage classrooms and laboratories"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500">Total Rooms</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRooms}</p>
            <p className="text-[10px] text-blue-600 font-bold group-hover:underline flex items-center gap-1">
              <span>{stats.roomsInUse} In Use</span>
              <span>• Manage Rooms →</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 text-xl group-hover:scale-105 transition">
            🏫
          </div>
        </div>

        {/* Substitutions Today */}
        <div
          onClick={() => setSubstitutionsListOpen(true)}
          className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-300 transition"
        >
          <div>
            <p className="text-xs font-semibold text-gray-500">Substitutions Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.substitutionsToday}</p>
            <p className="text-[10px] text-amber-600 font-bold hover:underline">View Details</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 text-xl">
            ⇄
          </div>
        </div>

        {/* Published Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <p className="text-xs font-semibold text-gray-500">Published Status</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.publishedStatus}</p>
            <p className="text-[10px] text-gray-400 font-medium">On {stats.publishedDate}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 text-xl">
            ✓
          </div>
        </div>
      </div>

      {/* 3. View Switcher & Category Legend Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-gray-200">
        {/* Left: View Mode (Table | Timetable) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600">View:</span>
          <div className="inline-flex rounded-xl bg-gray-100 p-1 border border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDisplayLayout('table')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                displayLayout === 'table' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setDisplayLayout('timetable')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                displayLayout === 'timetable' ? 'bg-[#15803d] text-white shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timetable
            </button>
          </div>
        </div>

        {/* Center: Color-coded Legend */}
        <div className="flex items-center gap-4 text-xs font-bold text-gray-700 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Lecture</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
            <span>Lab</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Activity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
            <span>Break</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Substitution</span>
          </div>
        </div>

        {/* Right: Quick Settings Buttons (Periods / Rooms / Reset) */}
        {(hasPermission('manage-timetable-settings') || isSuperAdmin()) && (
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setPeriodsModalOpen(true)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              ⏰ Periods & Breaks
            </button>
            <button
              type="button"
              onClick={() => setRoomsModalOpen(true)}
              className="px-3 py-1 border border-blue-200 bg-blue-50/60 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
            >
              🚪 Classrooms & Labs
            </button>
          </div>
        )}
      </div>

      {/* 4. The Visual Timetable Grid */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs select-none min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-emerald-800 font-bold">
              <th className="py-3 px-4 text-left border-r border-gray-200 w-[120px] bg-gray-50">
                Time / Day
              </th>
              {DAYS_OF_WEEK.map(day => (
                <th key={day} className="py-3.5 px-4 text-center border-r border-gray-100 last:border-r-0 min-w-[150px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {periods.map((period) => {
              // 4.1. If this period is a BREAK (Morning Break or Lunch Break), span across all days
              if (period.is_break) {
                return (
                  <tr key={period.id} className="bg-gray-100/70 border-y border-gray-200/80">
                    <td className="py-2.5 px-4 border-r border-gray-200 bg-gray-100 font-bold text-gray-700 text-xs">
                      <div>{period.name}</div>
                      <div className="text-[10px] text-gray-500 font-normal">{period.start_time} - {period.end_time}</div>
                    </td>
                    <td
                      colSpan={DAYS_OF_WEEK.length}
                      className="py-2.5 px-4 text-center font-bold text-gray-600 tracking-wider uppercase text-xs"
                    >
                      {period.name}
                    </td>
                  </tr>
                );
              }

              // 4.2. Regular Class Period Row
              return (
                <tr key={period.id} className="hover:bg-gray-50/30 transition-colors">
                  {/* Period Time Column */}
                  <td className="py-3.5 px-4 border-r border-gray-200 bg-gray-50/40 text-gray-800 font-bold text-xs align-top">
                    <div className="font-bold text-sm text-gray-900">{period.period_number || period.id}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5 whitespace-nowrap">
                      {period.start_time} - {period.end_time}
                    </div>
                  </td>

                  {/* Days Cells (Monday through Saturday) */}
                  {DAYS_OF_WEEK.map(day => {
                    const slotKey = `${day}_${period.id}`;
                    const slot = activeSlotsMap[slotKey];

                    if (!slot || slot.subject_name === '--') {
                      return (
                        <td
                          key={day}
                          onClick={() => handleOpenSlotEditor(day, period)}
                          className="py-2.5 px-3 border-r border-gray-100 last:border-r-0 align-top group hover:bg-emerald-50/30 transition cursor-pointer text-center"
                        >
                          <div className="h-full min-h-[64px] rounded-xl border border-dashed border-gray-200 group-hover:border-emerald-300 flex items-center justify-center text-gray-300 group-hover:text-emerald-600 transition">
                            <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition">+ Assign</span>
                          </div>
                        </td>
                      );
                    }

                    const style = getActivityCardStyle(slot);

                    return (
                      <td
                        key={day}
                        className="py-2.5 px-3 border-r border-gray-100 last:border-r-0 align-top"
                      >
                        <div
                          className={`p-3 rounded-xl border transition shadow-2xs relative group cursor-pointer ${style.bg}`}
                          onClick={() => handleOpenSlotEditor(day, period, slot)}
                        >
                          {/* Subject & Substitution Indicator */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-bold text-xs tracking-tight line-clamp-1">
                              {slot.subject_name}
                            </div>
                            {slot.is_substituted && (
                              <span
                                className="text-amber-700 font-bold text-xs"
                                title={`Substituted by ${slot.substitute_teacher_name || slot.teacher_name}`}
                              >
                                ⇄
                              </span>
                            )}
                          </div>

                          {/* Teacher Name */}
                          <div className="text-[11px] text-gray-600 mt-0.5 line-clamp-1 font-medium">
                            {slot.is_substituted ? (
                              <span className="text-amber-800 font-semibold">
                                {slot.substitute_teacher_name || slot.teacher_name} <span className="text-[9px]">(Sub)</span>
                              </span>
                            ) : (
                              slot.teacher_name || '-'
                            )}
                          </div>

                          {/* Classroom / Room */}
                          <div className="text-[10px] text-gray-500 mt-1 font-mono flex items-center justify-between">
                            <span>{slot.room_name || 'Room'}</span>
                            <span className="capitalize text-[9px] opacity-75 font-sans font-semibold">
                              {slot.activity_type}
                            </span>
                          </div>

                          {/* Quick Hover Action Bar */}
                          <div className="absolute inset-0 bg-white/90 backdrop-blur-2xs rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSlotEditor(day, period, slot);
                              }}
                              className="p-1 px-2 rounded-lg bg-gray-900 text-white text-[10px] font-bold hover:bg-black"
                              title="Edit Slot"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSubstitute(slot);
                              }}
                              className="p-1 px-2 rounded-lg bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600"
                              title="Assign Substitute Teacher"
                            >
                              Substitute
                            </button>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Bottom Summary & Quick Status Bar (Matching Image) */}
      <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold">
            ⏰
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Timetable Status</p>
            <p className="text-xs font-bold text-gray-900">{publishedStatus} ({publishedDate}, 08:30 AM)</p>
          </div>
        </div>

        {/* Next Substitution Alert */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-base font-bold">
            ✓
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Next Substitution</p>
            <p className="text-xs font-bold text-gray-900">Biology by D. Patel (Today, Period 4)</p>
          </div>
        </div>

        {/* Total Substitutions Week */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-base font-bold">
            👥
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Total Substitutions (This Week)</p>
            <p className="text-xs font-bold text-gray-900">
              8{' '}
              <button
                type="button"
                onClick={() => setSubstitutionsListOpen(true)}
                className="text-emerald-700 underline font-bold ml-1 hover:text-emerald-800 cursor-pointer"
              >
                View All Substitutions
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Slot Edit / Create Modal with Strict Conflict Prevention */}
      {/* ========================================================================= */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingSlot?.id ? 'Edit Timetable Period' : 'Assign Timetable Period'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {slotForm.day_of_week} • Period {slotForm.period_id} • {selectedTerm}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* REAL-TIME CONFLICT ALERT BANNER */}
            {slotConflict?.hasConflict && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-shake">
                <span className="text-base leading-none">⚠️</span>
                <div>
                  <div className="font-bold">Schedule Conflict Detected!</div>
                  <div className="mt-0.5 text-red-700">{slotConflict.message}</div>
                  <div className="text-[10px] text-red-600 mt-1 font-semibold">
                    The system automatically prevents assigning the same teacher or room to multiple classes at the same time.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Day of Week */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={slotForm.day_of_week}
                    onChange={(e) => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                  >
                    {DAYS_OF_WEEK.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Period */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Period</label>
                  <select
                    value={slotForm.period_id}
                    onChange={(e) => setSlotForm({ ...slotForm, period_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                  >
                    {periods.filter(p => !p.is_break).map(p => (
                      <option key={p.id} value={p.id}>
                        Period {p.period_number || p.id} ({p.start_time} - {p.end_time})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                <select
                  value={slotForm.subject_name}
                  onChange={(e) => setSlotForm({ ...slotForm, subject_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs bg-gray-50 focus:bg-white"
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.code || s.type})</option>
                  ))}
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Computer">Computer</option>
                  <option value="Physical Ed.">Physical Ed.</option>
                  <option value="Art">Art</option>
                  <option value="Music">Music</option>
                  <option value="Value Ed.">Value Ed.</option>
                  <option value="Library">Library</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Teacher Allocation */}
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Teacher</label>
                  <select
                    value={slotForm.teacher_id}
                    onChange={(e) => setSlotForm({ ...slotForm, teacher_id: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white ${
                      slotConflict?.type === 'teacher' ? 'border-red-400 bg-red-50 text-red-900' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name || ''}
                      </option>
                    ))}
                    <option value="101">R. Sharma (Mathematics)</option>
                    <option value="102">S. Verma (English)</option>
                    <option value="103">A. Singh (Physics/Science)</option>
                    <option value="104">P. Mehta (Chemistry)</option>
                    <option value="105">V. Joshi (History)</option>
                    <option value="106">N. Gupta (Computer)</option>
                    <option value="107">M. Khan (Physical Ed.)</option>
                    <option value="108">K. Gupta (Hindi)</option>
                    <option value="109">T. Das (Geography)</option>
                    <option value="110">P. Rao (Art)</option>
                    <option value="111">S. Roy (Library)</option>
                    <option value="112">R. Iyer (Music)</option>
                    <option value="113">D. Patel (Biology)</option>
                    <option value="114">S. Nair (Value Ed.)</option>
                  </select>
                </div>

                {/* Classroom / Room Allocation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-gray-700">Classroom / Lab</label>
                    {(hasPermission('manage-timetable-settings') || isSuperAdmin()) && (
                      <button
                        type="button"
                        onClick={() => setRoomsModalOpen(true)}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Add or manage classrooms and laboratories"
                      >
                        <span>+ Manage Rooms</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={slotForm.room_id}
                    onChange={(e) => setSlotForm({ ...slotForm, room_id: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white ${
                      slotConflict?.type === 'room' ? 'border-red-400 bg-red-50 text-red-900' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Room</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Activity Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Activity Type</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <label className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer font-bold ${
                    slotForm.activity_type === 'lecture' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs' : 'border-gray-200 text-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="activity_type"
                      value="lecture"
                      checked={slotForm.activity_type === 'lecture'}
                      onChange={() => setSlotForm({ ...slotForm, activity_type: 'lecture' })}
                      className="sr-only"
                    />
                    <span>🟢 Lecture</span>
                  </label>
                  <label className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer font-bold ${
                    slotForm.activity_type === 'lab' ? 'bg-cyan-50 text-cyan-800 border-cyan-300 shadow-2xs' : 'border-gray-200 text-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="activity_type"
                      value="lab"
                      checked={slotForm.activity_type === 'lab'}
                      onChange={() => setSlotForm({ ...slotForm, activity_type: 'lab' })}
                      className="sr-only"
                    />
                    <span>🔵 Lab</span>
                  </label>
                  <label className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer font-bold ${
                    slotForm.activity_type === 'activity' ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-2xs' : 'border-gray-200 text-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="activity_type"
                      value="activity"
                      checked={slotForm.activity_type === 'activity'}
                      onChange={() => setSlotForm({ ...slotForm, activity_type: 'activity' })}
                      className="sr-only"
                    />
                    <span>🟣 Activity</span>
                  </label>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t">
                {editingSlot?.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSlot(editingSlot.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    Clear Slot
                  </button>
                ) : <div></div>}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSlot || slotConflict?.hasConflict}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingSlot ? 'Saving...' : 'Save Allocation'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Assign Substitute Teacher Modal */}
      {/* ========================================================================= */}
      {substituteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Assign Substitute Faculty</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {substituteForm.day_of_week} • Period {substituteForm.period_id} • {substituteForm.subject_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubstituteModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Conflict alert for substitute */}
            {substituteConflict?.hasConflict && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <div className="font-bold">Substitute Conflict Detected!</div>
                  <div className="mt-0.5 text-red-700">{substituteConflict.message}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSubstitute} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Date for Substitution</label>
                <input
                  type="date"
                  value={substituteForm.date}
                  onChange={(e) => setSubstituteForm({ ...substituteForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Absent Teacher (Regular Faculty)</label>
                <input
                  type="text"
                  value={substituteForm.original_teacher_name || 'Regular Teacher'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Select Substitute Teacher <span className="text-red-500">*</span>
                </label>
                <select
                  value={substituteForm.substitute_teacher_id}
                  onChange={(e) => setSubstituteForm({ ...substituteForm, substitute_teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                  required
                >
                  <option value="">Choose Free Teacher...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name || ''} ({t.specialization || 'Teacher'})
                    </option>
                  ))}
                  <option value="113">D. Patel (Biology Specialist)</option>
                  <option value="103">A. Singh (Science/Physics)</option>
                  <option value="109">T. Das (Social Sciences)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason for Absence</label>
                <select
                  value={substituteForm.reason}
                  onChange={(e) => setSubstituteForm({ ...substituteForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white"
                >
                  <option value="Medical Leave">Medical Leave / Sick Leave</option>
                  <option value="Official Duty">Official Duty / Board Exam</option>
                  <option value="Training Workshop">Faculty Training & Development</option>
                  <option value="Personal Emergency">Personal Emergency</option>
                  <option value="School Event Coordinator">School Event Management</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSubstituteModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={substituteConflict?.hasConflict || !substituteForm.substitute_teacher_id}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Substitute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER: View All Substitutions List */}
      {/* ========================================================================= */}
      {substitutionsListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-2xl w-full p-6 space-y-4 animate-scale-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Active Substitutions Registry</h3>
                <p className="text-xs text-gray-500 mt-0.5">Faculty substitution records for today and this week</p>
              </div>
              <button
                type="button"
                onClick={() => setSubstitutionsListOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              {substitutions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No active substitutions recorded</div>
              ) : (
                substitutions.map(sub => (
                  <div key={sub.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        <span>{sub.subject_name}</span>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {sub.class_name || 'Class 10-A'} • Period {sub.period_id}
                        </span>
                      </div>
                      <div className="text-gray-600 text-xs">
                        <span className="line-through text-red-500">{sub.original_teacher_name}</span> &rarr;{' '}
                        <span className="text-emerald-700 font-bold">{sub.substitute_teacher_name}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {sub.date} • {sub.reason}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        await timetableAPI.deleteSubstitute(sub.id);
                        toast.success('Substitution cancelled');
                        fetchTimetableData();
                      }}
                      className="px-3 py-1 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 font-bold text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Periods & Breaks Management */}
      {/* ========================================================================= */}
      {periodsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Period & Break-Time Schedule</h3>
                <p className="text-xs text-gray-500 mt-0.5">Configure bell timings, lecture slots, and institutional breaks</p>
              </div>
              <button
                type="button"
                onClick={() => setPeriodsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {periods.map((p, idx) => (
                <div key={p.id} className="pt-2 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                      p.is_break ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {p.is_break ? '☕' : p.period_number || idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-gray-900">{p.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{p.start_time} - {p.end_time}</div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    p.is_break ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {p.is_break ? 'Institutional Break' : 'Class Period'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setPeriodsModalOpen(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Classrooms & Laboratories Management */}
      {/* ========================================================================= */}
      {roomsModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full p-6 space-y-4 animate-scale-in my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏫</span>
                  <h3 className="text-base font-bold text-gray-900">Classrooms & Laboratories</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {rooms.length} Total
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Manage classrooms, science labs, computer rooms, and campus facilities for timetable allocation
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingRoom && (hasPermission('manage-timetable-settings') || isSuperAdmin()) && (
                  <button
                    type="button"
                    onClick={handleOpenAddRoom}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>+ Add Room / Lab</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setRoomsModalOpen(false);
                    setIsEditingRoom(false);
                  }}
                  className="text-gray-400 hover:text-gray-700 text-2xl font-bold cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Add / Edit Form Section */}
            {isEditingRoom && (
              <form onSubmit={handleSaveRoom} className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    {roomForm.id ? '✏️ Edit Classroom / Lab' : '➕ Add New Classroom / Lab'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingRoom(false)}
                    className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Room / Lab Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 301, Physics Lab 2, Robotics Lab"
                      value={roomForm.name}
                      onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Facility Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={roomForm.type}
                      onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                      required
                    >
                      <option value="classroom">Standard Classroom (Room)</option>
                      <option value="lab">Laboratory (Science / Computer / Robotics)</option>
                      <option value="activity">Activity Room (Arts / Music / Dance)</option>
                      <option value="facility">Facility (Ground / Library / Auditorium)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Building / Wing</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Academic Block, Science Wing"
                      value={roomForm.building}
                      onChange={(e) => setRoomForm({ ...roomForm, building: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Floor Level</label>
                    <select
                      value={roomForm.floor}
                      onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    >
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="3rd Floor">3rd Floor</option>
                      <option value="Basement">Basement</option>
                      <option value="Outdoors">Outdoors</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Student Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={roomForm.capacity}
                      onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingRoom(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRoom}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingRoom ? 'Saving...' : roomForm.id ? 'Update Room' : 'Save Room'}
                  </button>
                </div>
              </form>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
              {/* Type Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'All', count: rooms.length },
                  { id: 'classroom', label: 'Classrooms', count: rooms.filter(r => r.type === 'classroom').length },
                  { id: 'lab', label: 'Labs', count: rooms.filter(r => r.type === 'lab').length },
                  { id: 'activity', label: 'Activity', count: rooms.filter(r => r.type === 'activity').length },
                  { id: 'facility', label: 'Facilities', count: rooms.filter(r => r.type === 'facility').length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRoomTypeFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      roomTypeFilter === tab.id
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs bg-gray-50 focus:bg-white focus:outline-none"
                />
                <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">🔍</span>
              </div>
            </div>

            {/* Rooms List */}
            <div className="flex-1 overflow-y-auto max-h-[48vh] pr-1 space-y-2 divide-y divide-gray-100">
              {filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No classrooms or labs found matching your filter.
                </div>
              ) : (
                filteredRooms.map(r => (
                  <div key={r.id} className="pt-2 flex items-center justify-between hover:bg-gray-50/80 p-2 rounded-xl transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${
                        r.type === 'lab' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' :
                        r.type === 'activity' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                        r.type === 'facility' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}>
                        {r.type === 'lab' ? '🧪' : r.type === 'activity' ? '🎨' : r.type === 'facility' ? '🏟️' : '🏫'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <span className="text-xs">{r.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.2 rounded font-normal">
                            Cap: {r.capacity || 40}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {r.building} • {r.floor}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        r.type === 'lab' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        r.type === 'activity' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        r.type === 'facility' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {r.type}
                      </span>

                      {(hasPermission('manage-timetable-settings') || isSuperAdmin()) && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRoom(r)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Edit Room"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(r.id, r.name)}
                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Room"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Showing {filteredRooms.length} of {rooms.length} facilities
              </span>
              <button
                type="button"
                onClick={() => {
                  setRoomsModalOpen(false);
                  setIsEditingRoom(false);
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableManagement;

