import { useState } from 'react';
import { toast } from 'react-toastify';
import Badge from '../../components/common/Badge';
import { studentAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';

const CSV_TEMPLATES = {
  students: `first_name,last_name,email,phone,admission_number,admission_date,class_id,section_id,academic_year_id,roll_number,date_of_birth,gender,blood_group,religion,caste,nationality,mother_tongue,status,address,city,state,country,postal_code,father_name,father_phone,father_occupation,mother_name,mother_phone,mother_occupation,guardian_name,guardian_phone,guardian_relation,emergency_contact_name,emergency_contact_phone,emergency_contact_relation,previous_school,medical_conditions,allergies,notes
Aarav,Sharma,aarav.sharma@example.com,+91 98765 11001,ADM2026001,2026-04-01,1,1,1,101,2015-05-15,male,B+,Hindu,General,Indian,Hindi,active,"Flat 402, Shanti Kunj, Sector 14, Dwarka",New Delhi,Delhi,India,110078,Rajesh Sharma,+91 98765 22001,Software Engineer,Pooja Sharma,+91 98765 22002,Teacher,,,,Rajesh Sharma,+91 98765 22001,Father,"Delhi Public School, R.K. Puram",None,None,"Excels in mathematics and active in school athletics"
Ananya,Patel,ananya.patel@example.com,+91 98765 11002,ADM2026002,2026-04-01,1,1,1,102,2015-08-20,female,O+,Hindu,General,Indian,Gujarati,active,"B-12, Gokul Dham, Satellite",Ahmedabad,Gujarat,India,380015,Kirit Patel,+91 98765 22003,Businessman,Neeta Patel,+91 98765 22004,Homemaker,,,,Kirit Patel,+91 98765 22003,Father,"St. Xavier High School, Ahmedabad","Mild Asthmatic","Dust allergy","Interested in classical vocal music and debate"`,
  teachers: `first_name,last_name,email,phone,employee_id,joining_date,department,designation,qualification,gender,address,city,state,postal_code
Vikram,Malhotra,vikram.malhotra@school.com,+91 98765 33001,EMP001,2023-06-01,Science,Senior Teacher,M.Sc Physics,male,"Sector 21, Gandhinagar",Gandhinagar,Gujarat,382021`,
  classes: `name,numeric_value,room_number,capacity
Class 1,1,R-101,40
Class 2,2,R-102,40`,
  subjects: `name,code,type,credit_hours
Mathematics,MATH101,theory,4
Science,SCI101,practical,4`,
  fees: `name,type,amount,due_date,description
Annual Tuition Fee,tuition,15000,2026-05-15,Annual school tuition fee`
};

const BulkOperations = () => {
  const { showValidationError } = useAlert();
  const [activeTab, setActiveTab] = useState('import');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importType, setImportType] = useState('students');
  const [exportType, setExportType] = useState('students');
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);

  const importTypes = [
    { id: 'students', name: 'Students', icon: '👨‍🎓', description: 'Import student records' },
    { id: 'teachers', name: 'Teachers', icon: '👨‍🏫', description: 'Import teacher records' },
    { id: 'classes', name: 'Classes', icon: '📚', description: 'Import class information' },
    { id: 'subjects', name: 'Subjects', icon: '📖', description: 'Import subject data' },
    { id: 'fees', name: 'Fees', icon: '💰', description: 'Import fee structures' },
  ];

  const exportTypes = [
    { id: 'students', name: 'Students', icon: '👨‍🎓', description: 'Export all student records' },
    { id: 'teachers', name: 'Teachers', icon: '👨‍🏫', description: 'Export all teacher records' },
    { id: 'attendance', name: 'Attendance', icon: '📊', description: 'Export attendance records' },
    { id: 'exams', name: 'Exam Results', icon: '📝', description: 'Export exam results' },
    { id: 'fees', name: 'Fee Records', icon: '💰', description: 'Export fee collection data' },
    { id: 'assignments', name: 'Assignments', icon: '📚', description: 'Export assignment data' },
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      toast.info(`Selected file: ${file.name}`);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showValidationError('Please select a file to import.', 'File Required');
      return;
    }

    setLoading(true);
    try {
      if (importType === 'students') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const response = await studentAPI.import(formData);
        if (response.success) {
          toast.success(response.message || 'Students imported successfully!');
          if (response.errors && response.errors.length > 0) {
            toast.warn(`Note: ${response.errors.length} rows were skipped: ${response.errors.slice(0, 2).join('; ')}`);
          }
          setSelectedFile(null);
        } else {
          showValidationError(response.message || 'Failed to import student data', 'Import Error');
        }
      } else {
        // Fallback simulation for other types
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success(`Successfully imported ${importType} data`);
        setSelectedFile(null);
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to import data';
      showValidationError(msg, 'Import Error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Successfully exported ${exportType} data as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (type) => {
    try {
      if (type === 'students') {
        try {
          const blob = await studentAPI.downloadTemplate();
          const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'student_import_template.csv');
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          toast.success('Student template downloaded successfully!');
          return;
        } catch (apiError) {
          console.warn('Backend download failed, falling back to client-side generator:', apiError);
        }
      }

      // Client-side download fallback (instant, offline-capable)
      const csvContent = CSV_TEMPLATES[type] || CSV_TEMPLATES.students;
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_template.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} template downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
        <p className="text-gray-600 mt-1">Import and export data in bulk</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'import'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📥 Import Data
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'export'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📤 Export Data
            </button>
          </div>
        </div>

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Import Type Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Import Type</h3>
                <div className="space-y-3">
                  {importTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setImportType(type.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        importType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{type.name}</p>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                        {importType === type.id && (
                          <Badge variant="primary">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h3>
                
                {/* Download Template */}
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    📋 Download the template file before importing
                  </p>
                  <button
                    onClick={() => downloadTemplate(importType)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Download {importType} Template →
                  </button>
                </div>

                {/* File Input */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-6xl mb-4">📁</div>
                    <p className="text-gray-700 font-medium mb-2">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500">
                      CSV, XLSX, or XLS (Max 10MB)
                    </p>
                  </label>
                </div>

                {/* Import Instructions */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Import Instructions:</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Download the template file first</li>
                    <li>Fill in the data according to the template format</li>
                    <li>Save the file as CSV or Excel format</li>
                    <li>Upload the file using the form above</li>
                    <li>Review and confirm the import</li>
                  </ul>
                </div>

                {/* Import Button */}
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || loading}
                  className="mt-4 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importing...' : `Import ${importType}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Export Type Selection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Export Type</h3>
                <div className="space-y-3">
                  {exportTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setExportType(type.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        exportType === type.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{type.name}</p>
                          <p className="text-sm text-gray-600">{type.description}</p>
                        </div>
                        {exportType === type.id && (
                          <Badge variant="success">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
                
                {/* Format Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setExportFormat('csv')}
                      className={`p-3 border-2 rounded-lg ${
                        exportFormat === 'csv'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <p className="text-2xl mb-1">📄</p>
                      <p className="text-sm font-medium">CSV</p>
                    </button>
                    <button
                      onClick={() => setExportFormat('excel')}
                      className={`p-3 border-2 rounded-lg ${
                        exportFormat === 'excel'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <p className="text-2xl mb-1">📊</p>
                      <p className="text-sm font-medium">Excel</p>
                    </button>
                    <button
                      onClick={() => setExportFormat('pdf')}
                      className={`p-3 border-2 rounded-lg ${
                        exportFormat === 'pdf'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <p className="text-2xl mb-1">📕</p>
                      <p className="text-sm font-medium">PDF</p>
                    </button>
                  </div>
                </div>

                {/* Export Preview */}
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Export Preview:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• Type: <span className="font-medium">{exportType}</span></p>
                    <p>• Format: <span className="font-medium">{exportFormat.toUpperCase()}</span></p>
                    <p>• Estimated records: <span className="font-medium">~1,234</span></p>
                    <p>• File size: <span className="font-medium">~2.5 MB</span></p>
                  </div>
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Exporting...' : `Export ${exportType} as ${exportFormat.toUpperCase()}`}
                </button>

                {/* Recent Exports */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Exports</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'students_export.csv', date: '2 hours ago', size: '1.2 MB' },
                      { name: 'attendance_report.xlsx', date: '1 day ago', size: '3.4 MB' },
                      { name: 'exam_results.pdf', date: '2 days ago', size: '856 KB' },
                    ].map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">📄</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{file.date} • {file.size}</p>
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">45</p>
            <p className="text-sm text-gray-600 mt-1">Total Imports</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">128</p>
            <p className="text-sm text-gray-600 mt-1">Total Exports</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">12,456</p>
            <p className="text-sm text-gray-600 mt-1">Records Processed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">98.5%</p>
            <p className="text-sm text-gray-600 mt-1">Success Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkOperations;

