import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { examAPI, gradeAPI, classAPI, sectionAPI, subjectAPI, studentAPI } from '../../services/api';
import Badge from '../../components/common/Badge';

const ExamGrades = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    class_id: '',
    section_id: '',
    subject_id: '',
  });

  useEffect(() => {
    fetchExam();
    fetchClasses();
    fetchSubjects();
  }, [id]);

  useEffect(() => {
    if (filters.class_id) {
      fetchSections(filters.class_id);
    } else {
      setSections([]);
      setFilters(prev => ({ ...prev, section_id: '' }));
      setStudents([]);
    }
  }, [filters.class_id]);

  useEffect(() => {
    if (filters.section_id && filters.subject_id) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [filters.section_id, filters.subject_id]);

  const fetchExam = async () => {
    try {
      const response = await examAPI.getById(id);
      if (response.success) {
        setExam(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch exam details');
      navigate('/exams');
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classAPI.getAll({ per_page: 100 });
      if (response.success) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId) => {
    try {
      const response = await sectionAPI.getAll({ class_id: classId, per_page: 100 });
      if (response.success) {
        setSections(response.data);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await subjectAPI.getAll({ per_page: 100 });
      if (response.success) {
        setSubjects(response.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getAll({
        class_id: filters.class_id,
        section_id: filters.section_id,
        per_page: 100,
      });
      if (response.success) {
        setStudents(response.data);
        // Initialize grades
        const initialGrades = {};
        response.data.forEach(student => {
          initialGrades[student.id] = {
            marks_obtained: '',
            remarks: '',
          };
        });
        setGrades(initialGrades);
      }
    } catch (error) {
      toast.error('Failed to fetch students');
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMarksChange = (studentId, marks) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks_obtained: marks,
      },
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const gradesData = students.map(student => ({
        exam_id: id,
        student_id: student.id,
        class_id: filters.class_id,
        section_id: filters.section_id,
        subject_id: filters.subject_id,
        marks_obtained: grades[student.id]?.marks_obtained || 0,
        total_marks: exam.total_marks,
        remarks: grades[student.id]?.remarks || '',
      }));

      await gradeAPI.createBulk({ grades: gradesData });
      toast.success('Grades saved successfully');
      navigate(`/exams/${id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to save grades');
    } finally {
      setLoading(false);
    }
  };

  const getGradeStatus = (marks) => {
    if (!marks || !exam) return 'default';
    const marksNum = parseFloat(marks);
    if (marksNum >= exam.passing_marks) return 'success';
    return 'danger';
  };

  const getStats = () => {
    let totalMarks = 0;
    let count = 0;
    let passed = 0;
    let failed = 0;

    Object.values(grades).forEach(grade => {
      if (grade.marks_obtained) {
        const marks = parseFloat(grade.marks_obtained);
        totalMarks += marks;
        count++;
        if (marks >= exam.passing_marks) {
          passed++;
        } else {
          failed++;
        }
      }
    });

    return {
      average: count > 0 ? (totalMarks / count).toFixed(2) : 0,
      passed,
      failed,
      total: students.length,
    };
  };

  const stats = getStats();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/exams/${id}`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Grades</h1>
            <p className="text-gray-600 mt-1">{exam?.name || 'Loading...'}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Class, Section & Subject</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.section_id}
              onChange={(e) => handleFilterChange('section_id', e.target.value)}
              className="input-field"
              disabled={!filters.class_id}
              required
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              value={filters.subject_id}
              onChange={(e) => handleFilterChange('subject_id', e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👨‍🎓</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Marks</p>
                <p className="text-2xl font-bold text-purple-600">{stats.average}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Passed</p>
                <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✓</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">✗</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student List */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && students.length === 0 && filters.section_id && filters.subject_id && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No students found in this section</p>
        </div>
      )}

      {!loading && students.length > 0 && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Enter Marks</h3>
                <div className="text-sm text-gray-600">
                  Total Marks: <span className="font-semibold">{exam?.total_marks || 0}</span> |
                  Passing Marks: <span className="font-semibold">{exam?.passing_marks || 0}</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marks Obtained
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{student.admission_number}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={grades[student.id]?.marks_obtained || ''}
                          onChange={(e) => handleMarksChange(student.id, e.target.value)}
                          className="input-field w-32"
                          placeholder="0"
                          min="0"
                          max={exam?.total_marks || 100}
                          step="0.01"
                          required
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {grades[student.id]?.marks_obtained && (
                          <Badge variant={getGradeStatus(grades[student.id]?.marks_obtained)}>
                            {parseFloat(grades[student.id]?.marks_obtained) >= exam?.passing_marks ? 'Pass' : 'Fail'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={grades[student.id]?.remarks || ''}
                          onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                          className="input-field"
                          placeholder="Optional remarks"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={() => navigate(`/exams/${id}`)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Grades'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExamGrades;

