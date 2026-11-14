import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AlertProvider } from './context/AlertContext';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/auth/Login';
import DashboardContent from './pages/DashboardContent';
import StudentList from './pages/students/StudentList';
import StudentForm from './pages/students/StudentForm';
import StudentDetail from './pages/students/StudentDetail';
import TeacherList from './pages/teachers/TeacherList';
import TeacherForm from './pages/teachers/TeacherForm';
import TeacherDetail from './pages/teachers/TeacherDetail';
import ClassList from './pages/academic/ClassList';
import ClassForm from './pages/academic/ClassForm';
import ClassDetail from './pages/academic/ClassDetail';
import SectionList from './pages/academic/SectionList';
import SectionForm from './pages/academic/SectionForm';
import SubjectList from './pages/academic/SubjectList';
import SubjectForm from './pages/academic/SubjectForm';
import SubjectDetail from './pages/academic/SubjectDetail';
import AttendanceList from './pages/attendance/AttendanceList';
import MarkAttendance from './pages/attendance/MarkAttendance';
import AttendanceReport from './pages/attendance/AttendanceReport';
import AttendanceEdit from './pages/attendance/AttendanceEdit';
import ExamList from './pages/exams/ExamList';
import ExamForm from './pages/exams/ExamForm';
import ExamDetail from './pages/exams/ExamDetail';
import ExamGrades from './pages/exams/ExamGrades';
import FeeList from './pages/fees/FeeList';
import FeeForm from './pages/fees/FeeForm';
import FeeDetail from './pages/fees/FeeDetail';
import FeePayments from './pages/fees/FeePayments';
import FeePaymentCollect from './pages/fees/FeePaymentCollect';
import AssignmentList from './pages/assignments/AssignmentList';
import AssignmentForm from './pages/assignments/AssignmentForm';
import AssignmentDetail from './pages/assignments/AssignmentDetail';
import EnhancedDashboard from './pages/EnhancedDashboard';
import AdvancedReports from './pages/reports/AdvancedReports';
import BulkOperations from './pages/tools/BulkOperations';
import Settings from './pages/settings/Settings';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<EnhancedDashboard />} />
                  <Route path="/dashboard/old" element={<DashboardContent />} />
                  <Route path="/reports" element={<AdvancedReports />} />
                  <Route path="/tools/bulk" element={<BulkOperations />} />
                  <Route path="/students" element={<StudentList />} />
                  <Route path="/students/create" element={<StudentForm />} />
                  <Route path="/students/:id" element={<StudentDetail />} />
                  <Route path="/students/:id/edit" element={<StudentForm />} />
                  <Route path="/teachers" element={<TeacherList />} />
                  <Route path="/teachers/create" element={<TeacherForm />} />
                  <Route path="/teachers/:id" element={<TeacherDetail />} />
                  <Route path="/teachers/:id/edit" element={<TeacherForm />} />
                  <Route path="/classes" element={<ClassList />} />
                  <Route path="/classes/create" element={<ClassForm />} />
                  <Route path="/classes/:id" element={<ClassDetail />} />
                  <Route path="/classes/:id/edit" element={<ClassForm />} />
                  <Route path="/sections" element={<SectionList />} />
                  <Route path="/sections/create" element={<SectionForm />} />
                  <Route path="/sections/:id/edit" element={<SectionForm />} />
                  <Route path="/subjects" element={<SubjectList />} />
                  <Route path="/subjects/create" element={<SubjectForm />} />
                  <Route path="/subjects/:id" element={<SubjectDetail />} />
                  <Route path="/subjects/:id/edit" element={<SubjectForm />} />
                  <Route path="/attendance" element={<AttendanceList />} />
                  <Route path="/attendance/mark" element={<MarkAttendance />} />
                  <Route path="/attendance/report" element={<AttendanceReport />} />
                  <Route path="/attendance/:id/edit" element={<AttendanceEdit />} />
                  <Route path="/exams" element={<ExamList />} />
                  <Route path="/exams/create" element={<ExamForm />} />
                  <Route path="/exams/:id" element={<ExamDetail />} />
                  <Route path="/exams/:id/edit" element={<ExamForm />} />
                  <Route path="/exams/:id/grades" element={<ExamGrades />} />
                  <Route path="/fees" element={<FeeList />} />
                  <Route path="/fees/payment" element={<FeePaymentCollect />} />
                  <Route path="/fees/collect" element={<FeePaymentCollect />} />
                  <Route path="/fees/create" element={<FeeForm />} />
                  <Route path="/fees/:id" element={<FeeDetail />} />
                  <Route path="/fees/:id/edit" element={<FeeForm />} />
                  <Route path="/fees/:id/payments" element={<FeePayments />} />
                  <Route path="/fees/payments" element={<FeePayments />} />
                  <Route path="/assignments" element={<AssignmentList />} />
                  <Route path="/assignments/create" element={<AssignmentForm />} />
                  <Route path="/assignments/:id" element={<AssignmentDetail />} />
                  <Route path="/assignments/:id/edit" element={<AssignmentForm />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SettingsProvider>
          <ConfirmProvider>
            <AlertProvider>
              <AppRoutes />
            </AlertProvider>
          </ConfirmProvider>
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
