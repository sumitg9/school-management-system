import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { admissionAPI } from '../../../services/api';
import EnrollmentModal from './EnrollmentModal';
import { toast } from 'react-toastify';

const AdmissionDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current_page: 1, total: 0, total_pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Quick Enrollment Modal State
  const [selectedAppForEnroll, setSelectedAppForEnroll] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, listRes] = await Promise.all([
        admissionAPI.getStatistics(),
        admissionAPI.getAll({
          search,
          status: statusFilter,
          class_id: classFilter,
          payment_status: paymentFilter,
          page: pagination.current_page,
          per_page: 15,
        }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (listRes.success) {
        setApplications(listRes.data);
        if (listRes.meta) setPagination(listRes.meta);
      }
    } catch (err) {
      console.error('Failed to load admission dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, classFilter, paymentFilter, pagination.current_page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    fetchData();
  };

  const handleExportCSV = () => {
    if (!applications.length) {
      toast.warn('No applications to export.');
      return;
    }

    const headers = ['Application No', 'Student Name', 'Applying Class', 'DOB', 'Father Name', 'Phone', 'Email', 'Status', 'Payment Status', 'Submission Date'];
    const rows = applications.map((a) => [
      a.application_number,
      `"${a.first_name} ${a.last_name || ''}"`,
      `"${a.class_name || 'Class ' + a.class_id}"`,
      a.date_of_birth,
      `"${a.guardians?.father_name || ''}"`,
      a.phone || a.guardians?.father_phone || '',
      a.email || '',
      a.status,
      a.payment_status,
      a.submitted_at ? a.submitted_at.substring(0, 10) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admissions_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Admissions report CSV exported successfully.');
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📝</span>
            <h1 className="text-2xl font-black text-gray-950 tracking-tight">
              Online Admission Management
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review public applicant dossiers, verify certificates, approve admissions, and convert to enrolled students.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/admissions"
            target="_blank"
            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl shadow-2xs transition inline-flex items-center gap-1.5"
          >
            <span>🌐</span> Public Portal Preview
          </Link>
          <Link
            to="/admissions/settings"
            className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl shadow-2xs transition inline-flex items-center gap-1.5"
          >
            <span>⚙️</span> Admission Settings
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>📊</span> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Total Applications</span>
          <span className="text-2xl font-black text-gray-950 mt-1 block">{stats?.total || 0}</span>
          <span className="text-[10px] text-blue-600 font-bold">100% Volume</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Under Review</span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">{stats?.underReview || 0}</span>
          <span className="text-[10px] text-gray-500 font-semibold">Active screening</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Docs Pending</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{stats?.documentsPending || 0}</span>
          <span className="text-[10px] text-amber-600 font-bold">Action needed</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Approved</span>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">{stats?.approved || 0}</span>
          <span className="text-[10px] text-indigo-600 font-bold">Ready to enroll</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Enrolled</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{stats?.enrolled || 0}</span>
          <span className="text-[10px] text-emerald-600 font-bold">Admitted students</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">Fees Collected</span>
          <span className="text-2xl font-black text-gray-950 mt-1 block">₹{stats?.totalFeesCollected || 0}</span>
          <span className="text-[10px] text-emerald-600 font-bold">Registration ledger</span>
        </div>
      </div>

      {/* Class Funnel Progress Bar Card */}
      {stats?.classDistribution?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xs space-y-3">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
            Grade-Wise Applicant Distribution & Enrollment Funnel
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {stats.classDistribution.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-gray-100 rounded-xl space-y-1">
                <span className="text-xs font-bold text-gray-900 block truncate">{item.class_name}</span>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-gray-400 font-semibold">{item.total} Apps</span>
                  <span className="font-extrabold text-emerald-700">{item.enrolled} Enrolled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters Card */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Search by Application No., Candidate Name, Parent Name, Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="documents_pending">Docs Pending</option>
              <option value="approved">Approved</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="rejected">Rejected</option>
              <option value="enrolled">Enrolled</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="all">All Grades</option>
              <option value="1">Class 1</option>
              <option value="2">Class 2</option>
              <option value="3">Class 3</option>
              <option value="4">Class 4</option>
              <option value="5">Class 5</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
              <option value="11">Class 11</option>
              <option value="12">Class 12</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="all">All Payments</option>
              <option value="completed">Paid (₹500)</option>
              <option value="pending">Payment Pending</option>
              <option value="na">Free / NA</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Applications Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-gray-600 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Application No.</th>
                <th className="py-3.5 px-4">Candidate Name</th>
                <th className="py-3.5 px-4">Applying Grade</th>
                <th className="py-3.5 px-4">Parent / Guardian</th>
                <th className="py-3.5 px-4">Submitted On</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">
                    No admission applications found matching active filters.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      <Link to={`/admissions/manage/${app.id}`} className="hover:underline">
                        {app.application_number}
                      </Link>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-950">
                        {app.first_name} {app.last_name}
                      </div>
                      <div className="text-[11px] text-gray-400 capitalize">
                        DOB: {app.date_of_birth} ({app.gender})
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-extrabold text-gray-900">{app.class_name || 'Class 1'}</span>
                      <span className="text-gray-400 block text-[10px]">Sec {app.preferred_section}</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-gray-900 font-semibold">{app.guardians?.father_name || 'N/A'}</div>
                      <div className="text-gray-400 font-mono text-[10px]">{app.phone || app.guardians?.father_phone || 'N/A'}</div>
                    </td>

                    <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                      {app.submitted_at?.substring(0, 10) || '—'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          app.payment_status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.payment_status === 'completed' ? '₹500 Paid' : 'Pending'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          app.status === 'enrolled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : app.status === 'documents_pending'
                            ? 'bg-amber-100 text-amber-800'
                            : app.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        ● {app.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {app.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => setSelectedAppForEnroll(app)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition cursor-pointer"
                            title="Enroll Student"
                          >
                            🎓 Enroll
                          </button>
                        )}
                        <Link
                          to={`/admissions/manage/${app.id}`}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-lg transition"
                        >
                          Review
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-3 text-xs text-gray-600">
            <span>
              Showing {(pagination.current_page - 1) * pagination.per_page + 1} to{' '}
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} entries
            </span>
            <div className="flex space-x-1">
              <button
                type="button"
                disabled={pagination.current_page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }))}
                className="px-3 py-1 bg-white border border-gray-200 rounded-lg disabled:opacity-50 font-bold cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.current_page >= pagination.total_pages}
                onClick={() => setPagination((prev) => ({ ...prev, current_page: prev.current_page + 1 }))}
                className="px-3 py-1 bg-white border border-gray-200 rounded-lg disabled:opacity-50 font-bold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Enrollment Modal from Dashboard */}
      {selectedAppForEnroll && (
        <EnrollmentModal
          application={selectedAppForEnroll}
          onClose={() => setSelectedAppForEnroll(null)}
          onEnrolled={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
};

export default AdmissionDashboard;

