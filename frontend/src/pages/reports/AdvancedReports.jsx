import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';

const AdvancedReports = () => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState(null);

  const reportCategories = [
    {
      id: 'student',
      name: 'Student Reports',
      icon: '👨‍🎓',
      color: 'blue',
      reports: [
        { id: 'student-list', name: 'Student List Report', description: 'Complete list of all students with details' },
        { id: 'student-performance', name: 'Student Performance Report', description: 'Academic performance analysis by student' },
        { id: 'student-attendance', name: 'Student Attendance Report', description: 'Attendance records and statistics' },
        { id: 'student-fee', name: 'Student Fee Report', description: 'Fee payment status and history' },
      ],
    },
    {
      id: 'teacher',
      name: 'Teacher Reports',
      icon: '👨‍🏫',
      color: 'green',
      reports: [
        { id: 'teacher-list', name: 'Teacher List Report', description: 'Complete list of all teachers' },
        { id: 'teacher-workload', name: 'Teacher Workload Report', description: 'Classes and subjects assigned' },
        { id: 'teacher-attendance', name: 'Teacher Attendance Report', description: 'Teacher attendance records' },
      ],
    },
    {
      id: 'academic',
      name: 'Academic Reports',
      icon: '📚',
      color: 'purple',
      reports: [
        { id: 'class-performance', name: 'Class Performance Report', description: 'Overall class performance analysis' },
        { id: 'subject-analysis', name: 'Subject-wise Analysis', description: 'Performance by subject' },
        { id: 'exam-results', name: 'Exam Results Report', description: 'Detailed exam results and statistics' },
        { id: 'grade-distribution', name: 'Grade Distribution Report', description: 'Grade distribution across classes' },
      ],
    },
    {
      id: 'attendance',
      name: 'Attendance Reports',
      icon: '📊',
      color: 'orange',
      reports: [
        { id: 'daily-attendance', name: 'Daily Attendance Report', description: 'Day-wise attendance summary' },
        { id: 'monthly-attendance', name: 'Monthly Attendance Report', description: 'Month-wise attendance trends' },
        { id: 'low-attendance', name: 'Low Attendance Alert', description: 'Students with attendance below threshold' },
        { id: 'attendance-trends', name: 'Attendance Trends', description: 'Attendance patterns and analysis' },
      ],
    },
    {
      id: 'financial',
      name: 'Financial Reports',
      icon: '💰',
      color: 'emerald',
      reports: [
        { id: 'fee-collection', name: 'Fee Collection Report', description: 'Fee collection summary and analysis' },
        { id: 'pending-fees', name: 'Pending Fees Report', description: 'Outstanding fee payments' },
        { id: 'fee-defaulters', name: 'Fee Defaulters Report', description: 'Students with overdue payments' },
        { id: 'revenue-analysis', name: 'Revenue Analysis', description: 'Financial revenue breakdown' },
      ],
    },
    {
      id: 'assignment',
      name: 'Assignment Reports',
      icon: '📝',
      color: 'indigo',
      reports: [
        { id: 'assignment-submission', name: 'Assignment Submission Report', description: 'Submission status and statistics' },
        { id: 'pending-assignments', name: 'Pending Assignments', description: 'Assignments pending submission' },
        { id: 'assignment-performance', name: 'Assignment Performance', description: 'Performance analysis by assignment' },
      ],
    },
  ];

  const handleGenerateReport = (report) => {
    setSelectedReport(report);
    // In a real application, this would generate and download the report
    console.log('Generating report:', report);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Reports</h1>
            <p className="text-gray-600 mt-1">Generate comprehensive reports and analytics</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export All</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Custom Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {reportCategories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow">
            <div className={`px-6 py-4 border-b border-gray-200 bg-${category.color}-50`}>
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{category.icon}</span>
                <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.reports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer"
                    onClick={() => handleGenerateReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      </div>
                      <Badge variant="primary" size="sm">New</Badge>
                    </div>
                    <div className="mt-4 flex items-center space-x-2">
                      <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Preview</span>
                      </button>
                      <span className="text-gray-300">|</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>PDF</span>
                      </button>
                      <span className="text-gray-300">|</span>
                      <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">24</p>
            <p className="text-sm text-gray-600 mt-1">Available Reports</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">156</p>
            <p className="text-sm text-gray-600 mt-1">Generated This Month</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">6</p>
            <p className="text-sm text-gray-600 mt-1">Scheduled Reports</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">12</p>
            <p className="text-sm text-gray-600 mt-1">Custom Reports</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedReports;

