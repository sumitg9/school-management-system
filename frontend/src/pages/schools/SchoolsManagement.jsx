import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { schoolsAPI } from '../../services/api';
import { seedAllBranchesData, clearAllBranchesData } from '../../services/dataSeeder';
import { toast } from 'react-toastify';

export default function SchoolsManagement() {
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const { currentSchool, activeSchoolId, switchSchool, refreshSchools } = useSchool();

  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCampuses: 0,
    totalStudents: 0,
    totalFaculty: 0,
    avgFeeRealization: 0,
  });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSeederModal, setShowSeederModal] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Seeder States
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState({ step: '', percent: 0, message: '' });
  const [seedResult, setSeedResult] = useState(null);
  const [selectedBranchesToSeed, setSelectedBranchesToSeed] = useState([1, 2, 3]);

  const handleRunSeeder = async () => {
    if (selectedBranchesToSeed.length === 0) {
      toast.warning('Please select at least one branch campus to seed.');
      return;
    }
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await seedAllBranchesData({
        branches: selectedBranchesToSeed,
        onProgress: (step, percent, message) => {
          setSeedProgress({ step, percent, message });
        },
      });
      setSeedResult(res.summary);
      toast.success('🎉 Dummy data seeded successfully across all features!');
      await fetchCampuses();
      refreshSchools();
    } catch (err) {
      toast.error(err.message || 'Failed to seed branch data.');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearSeeded = async () => {
    if (window.confirm('Are you sure you want to reset seeded demo data back to baseline?')) {
      clearAllBranchesData();
      toast.info('Seeded branch data reset successfully.');
      await fetchCampuses();
      refreshSchools();
      setSeedResult(null);
      setShowSeederModal(false);
    }
  };

  // Add Campus Form State
  const [addForm, setAddForm] = useState({
    name: '',
    shortName: '',
    code: '',
    affiliationNumber: '',
    establishedYear: new Date().getFullYear(),
    curriculum: 'CBSE',
    principalName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    receiptPrefix: '',
    primaryColor: '#2563EB',
    logo: 'preset:🏫',
  });

  // Config Branch Form State
  const [configForm, setConfigForm] = useState({
    name: '',
    shortName: '',
    principalName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    receiptPrefix: '',
    primaryColor: '#2563EB',
    status: 'active',
  });

  const canManage = isSuperAdmin() || hasPermission('manage-schools');

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const res = await schoolsAPI.getAll();
      if (res && res.success) {
        setCampuses(res.data || []);
      }
      const metricsRes = await schoolsAPI.getConsolidatedMetrics();
      if (metricsRes && metricsRes.success) {
        setMetrics(metricsRes.data);
      }
    } catch (err) {
      console.error('Failed to load campuses:', err);
      toast.error('Failed to load school campuses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  const handleOpenConfig = (campus) => {
    setSelectedCampus(campus);
    setConfigForm({
      name: campus.name || '',
      shortName: campus.shortName || '',
      principalName: campus.principalName || '',
      email: campus.email || '',
      phone: campus.phone || '',
      address: campus.address || '',
      city: campus.city || '',
      state: campus.state || '',
      receiptPrefix: campus.receiptPrefix || '',
      primaryColor: campus.primaryColor || '#2563EB',
      status: campus.status || 'active',
    });
    setShowConfigModal(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.code.trim() || !addForm.city.trim()) {
      alert('Please fill in required fields: School Name, Campus Code, and City.');
      return;
    }

    try {
      setSubmitting(true);
      await schoolsAPI.create(addForm);
      toast.success(`Campus "${addForm.shortName || addForm.name}" provisioned successfully!`);
      setShowAddModal(false);
      setAddForm({
        name: '',
        shortName: '',
        code: '',
        affiliationNumber: '',
        establishedYear: new Date().getFullYear(),
        curriculum: 'CBSE',
        principalName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        receiptPrefix: '',
        primaryColor: '#2563EB',
        logo: 'preset:🏫',
      });
      fetchCampuses();
      refreshSchools();
    } catch (err) {
      toast.error(err.message || 'Failed to create campus.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCampus) return;
    try {
      setSubmitting(true);
      await schoolsAPI.update(selectedCampus.id, configForm);
      toast.success(`Settings for "${configForm.shortName || configForm.name}" updated!`);
      setShowConfigModal(false);
      fetchCampuses();
      refreshSchools();
    } catch (err) {
      toast.error(err.message || 'Failed to update campus settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCampus = async (campus) => {
    if (String(campus.id) === '1') {
      alert('The primary founding campus (Siliguri Main) cannot be deleted.');
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to decommission "${campus.name}"? All associated data partitions will be archived.`
      )
    ) {
      try {
        await schoolsAPI.delete(campus.id);
        toast.info(`Campus ${campus.name} decommissioned.`);
        fetchCampuses();
        refreshSchools();
      } catch (err) {
        toast.error(err.message || 'Failed to decommission campus.');
      }
    }
  };

  const getLogoEmoji = (logoStr) => {
    if (typeof logoStr === 'string' && logoStr.startsWith('preset:')) {
      return logoStr.replace('preset:', '');
    }
    return '🏛️';
  };

  return (
    <div className="px-[15px] py-6 w-full space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🏛️</span>
            <h1 className="text-2xl font-black tracking-tight">Campuses & Branches Management</h1>
          </div>
          <p className="text-sm text-blue-200">
            Enterprise multi-school organization governance, branch campus provisioning, and board affiliations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canManage && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition flex items-center space-x-1.5 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
              >
                <span>➕</span>
                <span>Add New Campus</span>
              </button>

              <button
                onClick={() => {
                  setShowSeederModal(true);
                  setSeedResult(null);
                  setSeedProgress({ step: '', percent: 0, message: '' });
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md transition flex items-center space-x-1.5 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              >
                <span>🌱</span>
                <span>Seed Demo Data (All Branches)</span>
              </button>
            </>
          )}

          <button
            onClick={fetchCampuses}
            className="bg-white/10 hover:bg-white/20 text-blue-200 text-xs font-medium px-3 py-2.5 rounded-xl backdrop-blur-xs transition flex items-center space-x-1.5"
            title="Refresh campuses data"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Security & Isolation Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3 text-emerald-900 text-xs shadow-xs">
        <span className="text-xl flex-shrink-0">🛡️</span>
        <div>
          <p className="font-bold text-emerald-950 text-sm">Tenant Data Isolation & Security Scoping Active</p>
          <p className="mt-0.5 text-emerald-800 leading-relaxed">
            All student records, admissions, fee payments, exam marks, and teacher payrolls are strictly partitioned by
            school branch ID. Non-superadmin users (such as campus teachers, students, or branch cashiers) are locked to
            their authorized branch. Direct API queries or tampering across branches are automatically blocked.
          </p>
        </div>
      </div>

      {/* High-Level Organization Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-blue-100 rounded-lg flex items-center justify-center text-xl text-blue-700 flex-shrink-0">
            🏛️
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Campuses</p>
            <p className="text-xl font-black text-gray-900">{metrics.totalCampuses} Branches</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-indigo-100 rounded-lg flex items-center justify-center text-xl text-indigo-700 flex-shrink-0">
            👨‍🎓
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Group Students</p>
            <p className="text-xl font-black text-indigo-700">{metrics.totalStudents.toLocaleString()} Enrolled</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-emerald-100 rounded-lg flex items-center justify-center text-xl text-emerald-700 flex-shrink-0">
            👨‍🏫
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Faculty & Staff</p>
            <p className="text-xl font-black text-emerald-700">{metrics.totalFaculty} Staff</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center text-xl text-purple-700 flex-shrink-0">
            💳
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Fee Realization</p>
            <p className="text-xl font-black text-purple-700">{metrics.avgFeeRealization}% Collected</p>
          </div>
        </div>
      </div>

      {/* Campuses Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
            <span>Institutional Campuses</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
              {campuses.length}
            </span>
          </h2>
          <span className="text-xs text-gray-500">
            Active view: <strong className="text-blue-600">{currentSchool?.shortName || currentSchool?.name}</strong>
          </span>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-sm text-gray-500">
            Loading institution branches...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {campuses.map((campus) => {
              const isActive = String(activeSchoolId) === String(campus.id);
              const logoEmoji = getLogoEmoji(campus.logo);

              return (
                <div
                  key={campus.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                    isActive ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
                  }`}
                >
                  {/* Color Accent Top Bar */}
                  <div
                    className="h-2 w-full"
                    style={{ backgroundColor: campus.primaryColor || '#2563EB' }}
                  />

                  <div className="p-5 space-y-4">
                    {/* Campus Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: `${campus.primaryColor || '#2563EB'}15` }}
                        >
                          {logoEmoji}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-gray-900 text-sm">{campus.shortName || campus.name}</h3>
                            {isActive && (
                              <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                Active View
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md font-semibold">
                            {campus.code}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          campus.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {campus.status || 'Active'}
                      </span>
                    </div>

                    {/* Full Name */}
                    <p className="text-xs text-gray-600 leading-snug line-clamp-2" title={campus.name}>
                      {campus.name}
                    </p>

                    {/* Affiliation & Details */}
                    <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs border border-slate-100">
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="text-gray-400 font-medium">Board Affiliation:</span>
                        <span className="font-bold text-gray-800">{campus.affiliationNumber || 'CBSE Board'}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="text-gray-400 font-medium">Curriculum:</span>
                        <span className="font-semibold text-gray-800">{campus.curriculum || 'CBSE'} (Est. {campus.establishedYear || '2015'})</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="text-gray-400 font-medium">Principal:</span>
                        <span className="font-semibold text-gray-800">{campus.principalName || 'Dr. Principal'}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="text-gray-400 font-medium">Receipt Series:</span>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm">
                          {campus.receiptPrefix || 'REC-'}
                        </span>
                      </div>
                    </div>

                    {/* Campus Contact & Location */}
                    <div className="space-y-1 text-xs text-gray-500">
                      <p className="truncate flex items-center gap-1.5">
                        <span>📍</span>
                        <span>{campus.address}, {campus.city}, {campus.state}</span>
                      </p>
                      <p className="truncate flex items-center gap-1.5">
                        <span>📞</span>
                        <span>{campus.phone || '+91 353 000000'}</span>
                      </p>
                      <p className="truncate flex items-center gap-1.5">
                        <span>✉️</span>
                        <span>{campus.email || 'campus@school.com'}</span>
                      </p>
                    </div>

                    {/* Branch Metrics Pill */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100 text-center">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Students</div>
                        <div className="text-xs font-black text-gray-900">{campus.studentCount || 0}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Staff</div>
                        <div className="text-xs font-black text-gray-900">{campus.facultyCount || 0}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Realization</div>
                        <div className="text-xs font-black text-emerald-700">{campus.feeRealization || 95}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => switchSchool(campus.id)}
                      disabled={isActive}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center space-x-1 ${
                        isActive
                          ? 'bg-blue-100 text-blue-800 cursor-default'
                          : 'bg-white hover:bg-blue-600 hover:text-white border border-gray-200 text-gray-700 shadow-2xs'
                      }`}
                    >
                      <span>{isActive ? '✓ Selected' : 'Switch Context'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenConfig(campus)}
                          className="text-xs text-gray-600 hover:text-blue-600 p-1.5 hover:bg-white rounded-lg transition"
                          title="Configure branch details"
                        >
                          ⚙️ Settings
                        </button>
                      )}

                      {canManage && String(campus.id) !== '1' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCampus(campus)}
                          className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-white rounded-lg transition"
                          title="Decommission branch"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Add New Campus / Branch */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <span>🏛️</span>
                  <span>Provision New School Campus</span>
                </h3>
                <p className="text-xs text-gray-500">Register a new branch under the educational group trust.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Full School / Campus Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Twinkling Toddlers International School - Delhi NCR Campus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Short Name / Campus Display *</label>
                  <input
                    type="text"
                    required
                    value={addForm.shortName}
                    onChange={(e) => setAddForm({ ...addForm, shortName: e.target.value })}
                    placeholder="e.g. Delhi NCR Campus"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Campus Code * (Unique)</label>
                  <input
                    type="text"
                    required
                    value={addForm.code}
                    onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. TT-DEL-04"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Board Affiliation Number</label>
                  <input
                    type="text"
                    value={addForm.affiliationNumber}
                    onChange={(e) => setAddForm({ ...addForm, affiliationNumber: e.target.value })}
                    placeholder="e.g. CBSE/AFF/1930510"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Curriculum</label>
                  <select
                    value={addForm.curriculum}
                    onChange={(e) => setAddForm({ ...addForm, curriculum: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="CBSE">CBSE (Central Board of Secondary Education)</option>
                    <option value="ICSE">ICSE / ISC Board</option>
                    <option value="IB">International Baccalaureate (IB)</option>
                    <option value="Cambridge">Cambridge International (CIE)</option>
                    <option value="State Board">State Board</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Principal / Dean Name</label>
                  <input
                    type="text"
                    value={addForm.principalName}
                    onChange={(e) => setAddForm({ ...addForm, principalName: e.target.value })}
                    placeholder="e.g. Dr. Rajeshwari Sengupta"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Campus Email</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="e.g. delhincr@school.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="e.g. +91 11 28901122"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Receipt Number Prefix</label>
                  <input
                    type="text"
                    value={addForm.receiptPrefix}
                    onChange={(e) => setAddForm({ ...addForm, receiptPrefix: e.target.value.toUpperCase() })}
                    placeholder="e.g. REC-DEL-"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Campus Address</label>
                  <input
                    type="text"
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                    placeholder="e.g. Institutional Area, Sector 62"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    placeholder="e.g. Noida / New Delhi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={addForm.state}
                    onChange={(e) => setAddForm({ ...addForm, state: e.target.value })}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Primary Brand Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={addForm.primaryColor}
                      onChange={(e) => setAddForm({ ...addForm, primaryColor: e.target.value })}
                      className="w-9 h-9 rounded-lg border p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={addForm.primaryColor}
                      onChange={(e) => setAddForm({ ...addForm, primaryColor: e.target.value })}
                      className="w-28 px-2 py-1.5 border rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Campus Logo / Symbol</label>
                  <select
                    value={addForm.logo}
                    onChange={(e) => setAddForm({ ...addForm, logo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="preset:🏫">🏫 School Building</option>
                    <option value="preset:🏛️">🏛️ Classical Campus</option>
                    <option value="preset:🎓">🎓 Academic Academy</option>
                    <option value="preset:⭐">⭐ Star Institute</option>
                    <option value="preset:📚">📚 Knowledge Center</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Provisioning...' : 'Provision Campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Branch Settings */}
      {showConfigModal && selectedCampus && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>⚙️</span>
                  <span>Branch Settings: {selectedCampus.shortName || selectedCampus.name}</span>
                </h3>
                <p className="text-xs text-gray-500">Configure administrative parameters and contact points.</p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfigSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Campus Short Name</label>
                <input
                  type="text"
                  required
                  value={configForm.shortName}
                  onChange={(e) => setConfigForm({ ...configForm, shortName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Principal Name</label>
                <input
                  type="text"
                  value={configForm.principalName}
                  onChange={(e) => setConfigForm({ ...configForm, principalName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={configForm.email}
                    onChange={(e) => setConfigForm({ ...configForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={configForm.phone}
                    onChange={(e) => setConfigForm({ ...configForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={configForm.address}
                  onChange={(e) => setConfigForm({ ...configForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Receipt Prefix</label>
                  <input
                    type="text"
                    value={configForm.receiptPrefix}
                    onChange={(e) => setConfigForm({ ...configForm, receiptPrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={configForm.status}
                    onChange={(e) => setConfigForm({ ...configForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Brand Primary Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={configForm.primaryColor}
                    onChange={(e) => setConfigForm({ ...configForm, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border p-1 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={configForm.primaryColor}
                    onChange={(e) => setConfigForm({ ...configForm, primaryColor: e.target.value })}
                    className="w-28 px-2 py-1.5 border rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Multi-Branch Data Seeder Modal */}
      {showSeederModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">🌱</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Multi-Branch Demo Data Seeder</h2>
                  <p className="text-xs text-gray-500">
                    Instantly seed realistic, fully isolated tenant data for all school branches and all features.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSeederModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Target Branches Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                1. Select Target Branch Campuses to Seed
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {[
                  { id: 1, name: 'Siliguri Main', code: 'DPS-SLG-01', board: 'CBSE', emoji: '🏫' },
                  { id: 2, name: 'Kolkata Central', code: 'DPS-KOL-02', board: 'ICSE', emoji: '🏛️' },
                  { id: 3, name: 'Bangalore South', code: 'DPS-BLR-03', board: 'CBSE', emoji: '🎓' },
                ].map((b) => {
                  const isChecked = selectedBranchesToSeed.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedBranchesToSeed(selectedBranchesToSeed.filter((x) => x !== b.id));
                        } else {
                          setSelectedBranchesToSeed([...selectedBranchesToSeed, b.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center space-x-2.5 ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 pointer-events-none"
                      />
                      <div>
                        <p className="font-bold text-xs flex items-center space-x-1">
                          <span>{b.emoji}</span>
                          <span>{b.name}</span>
                        </p>
                        <p className="text-[10px] text-gray-500">{b.code} • {b.board}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Features Included Grid */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                2. Features Seeded for Each Branch
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>📚</span>
                  <span>Classes 1-10 & Secs</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>👨‍🏫</span>
                  <span>Faculty & Bank Details</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>👨‍🎓</span>
                  <span>Students & Parents</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>💵</span>
                  <span>Tuition & Lab Receipts</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>👔</span>
                  <span>HRMS 3-Mo Payroll</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>📅</span>
                  <span>Events & Sports Days</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>🔔</span>
                  <span>System Notifications</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center space-x-2">
                  <span>🛡️</span>
                  <span>Branch Security Scoping</span>
                </div>
              </div>
            </div>

            {/* Progress Bar (while seeding) */}
            {seeding && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>{seedProgress.step || 'Processing...'}</span>
                  <span>{seedProgress.percent}%</span>
                </div>
                <div className="w-full bg-blue-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${seedProgress.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-blue-700 italic">{seedProgress.message}</p>
              </div>
            )}

            {/* Completion Summary Card */}
            {seedResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-950">
                <div className="flex items-center space-x-2 text-sm font-bold text-emerald-800">
                  <span>✅</span>
                  <span>Seeding Completed Successfully!</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="bg-white/80 p-2 rounded border border-emerald-100">
                    <p className="text-gray-500 text-[10px]">Campuses</p>
                    <p className="font-bold text-emerald-900 text-sm">{seedResult.schools} Branches</p>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-emerald-100">
                    <p className="text-gray-500 text-[10px]">Students Enrolled</p>
                    <p className="font-bold text-emerald-900 text-sm">{seedResult.students} Students</p>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-emerald-100">
                    <p className="text-gray-500 text-[10px]">Faculty & Staff</p>
                    <p className="font-bold text-emerald-900 text-sm">{seedResult.teachers + seedResult.hrmsStaff} Members</p>
                  </div>
                  <div className="bg-white/80 p-2 rounded border border-emerald-100">
                    <p className="text-gray-500 text-[10px]">Monthly Payslips</p>
                    <p className="font-bold text-emerald-900 text-sm">{seedResult.payrollRecords} Records</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={handleClearSeeded}
                disabled={seeding}
                className="px-3.5 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition disabled:opacity-50"
              >
                Reset / Clear Seed Data
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSeederModal(false)}
                  disabled={seeding}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleRunSeeder}
                  disabled={seeding}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <span>{seeding ? '⏳' : '🌱'}</span>
                  <span>{seeding ? 'Seeding in Progress...' : 'Run Multi-Branch Seeder'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

