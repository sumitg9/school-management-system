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
import PermissionRoute from './components/common/PermissionRoute';

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
                  <Route path="/reports" element={<PermissionRoute permission="view-reports"><AdvancedReports /></PermissionRoute>} />
                  <Route path="/tools/bulk" element={<PermissionRoute permission="manage-tools"><BulkOperations /></PermissionRoute>} />
                  <Route path="/students" element={<PermissionRoute permission="view-students"><StudentList /></PermissionRoute>} />
                  <Route path="/students/create" element={<PermissionRoute permission="create-students"><StudentForm /></PermissionRoute>} />
                  <Route path="/students/:id" element={<PermissionRoute permission="view-students"><StudentDetail /></PermissionRoute>} />
                  <Route path="/students/:id/edit" element={<PermissionRoute permission="edit-students"><StudentForm /></PermissionRoute>} />
                  <Route path="/teachers" element={<PermissionRoute permission="view-teachers"><TeacherList /></PermissionRoute>} />
                  <Route path="/teachers/create" element={<PermissionRoute permission="create-teachers"><TeacherForm /></PermissionRoute>} />
                  <Route path="/teachers/:id" element={<PermissionRoute permission="view-teachers"><TeacherDetail /></PermissionRoute>} />
                  <Route path="/teachers/:id/edit" element={<PermissionRoute permission="edit-teachers"><TeacherForm /></PermissionRoute>} />
                  <Route path="/classes" element={<PermissionRoute permission="view-classes"><ClassList /></PermissionRoute>} />
                  <Route path="/classes/create" element={<PermissionRoute permission="create-classes"><ClassForm /></PermissionRoute>} />
                  <Route path="/classes/:id" element={<PermissionRoute permission="view-classes"><ClassDetail /></PermissionRoute>} />
                  <Route path="/classes/:id/edit" element={<PermissionRoute permission="edit-classes"><ClassForm /></PermissionRoute>} />
                  <Route path="/sections" element={<PermissionRoute permission="view-classes"><SectionList /></PermissionRoute>} />
                  <Route path="/sections/create" element={<PermissionRoute permission="create-classes"><SectionForm /></PermissionRoute>} />
                  <Route path="/sections/:id/edit" element={<PermissionRoute permission="edit-classes"><SectionForm /></PermissionRoute>} />
                  <Route path="/subjects" element={<PermissionRoute permission="view-classes"><SubjectList /></PermissionRoute>} />
                  <Route path="/subjects/create" element={<PermissionRoute permission="create-classes"><SubjectForm /></PermissionRoute>} />
                  <Route path="/subjects/:id" element={<PermissionRoute permission="view-classes"><SubjectDetail /></PermissionRoute>} />
                  <Route path="/subjects/:id/edit" element={<PermissionRoute permission="edit-classes"><SubjectForm /></PermissionRoute>} />
                  <Route path="/attendance" element={<PermissionRoute permission="view-attendance"><AttendanceList /></PermissionRoute>} />
                  <Route path="/attendance/mark" element={<PermissionRoute permission="mark-attendance"><MarkAttendance /></PermissionRoute>} />
                  <Route path="/attendance/report" element={<PermissionRoute permission="view-attendance"><AttendanceReport /></PermissionRoute>} />
                  <Route path="/attendance/:id/edit" element={<PermissionRoute permission="edit-attendance"><AttendanceEdit /></PermissionRoute>} />
                  <Route path="/exams" element={<PermissionRoute permission="view-exams"><ExamList /></PermissionRoute>} />
                  <Route path="/exams/create" element={<PermissionRoute permission="create-exams"><ExamForm /></PermissionRoute>} />
                  <Route path="/exams/:id" element={<PermissionRoute permission="view-exams"><ExamDetail /></PermissionRoute>} />
                  <Route path="/exams/:id/edit" element={<PermissionRoute permission="create-exams"><ExamForm /></PermissionRoute>} />
                  <Route path="/exams/:id/grades" element={<PermissionRoute permission="enter-grades"><ExamGrades /></PermissionRoute>} />
                  <Route path="/fees" element={<PermissionRoute permission="view-fees"><FeeList /></PermissionRoute>} />
                  <Route path="/fees/payment" element={<PermissionRoute permission="collect-fees"><FeePaymentCollect /></PermissionRoute>} />
                  <Route path="/fees/collect" element={<PermissionRoute permission="collect-fees"><FeePaymentCollect /></PermissionRoute>} />
                  <Route path="/fees/create" element={<PermissionRoute permission="create-fees"><FeeForm /></PermissionRoute>} />
                  <Route path="/fees/:id" element={<PermissionRoute permission="view-fees"><FeeDetail /></PermissionRoute>} />
                  <Route path="/fees/:id/edit" element={<PermissionRoute permission="create-fees"><FeeForm /></PermissionRoute>} />
                  <Route path="/fees/:id/payments" element={<PermissionRoute permission="view-fees"><FeePayments /></PermissionRoute>} />
                  <Route path="/fees/payments" element={<PermissionRoute permission="view-fees"><FeePayments /></PermissionRoute>} />
                  <Route path="/assignments" element={<PermissionRoute permission="view-assignments"><AssignmentList /></PermissionRoute>} />
                  <Route path="/assignments/create" element={<PermissionRoute permission="create-assignments"><AssignmentForm /></PermissionRoute>} />
                  <Route path="/assignments/:id" element={<PermissionRoute permission="view-assignments"><AssignmentDetail /></PermissionRoute>} />
                  <Route path="/assignments/:id/edit" element={<PermissionRoute permission="create-assignments"><AssignmentForm /></PermissionRoute>} />
                  <Route path="/settings" element={<PermissionRoute permission="manage-settings"><Settings /></PermissionRoute>} />
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
