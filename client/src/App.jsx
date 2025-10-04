// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CoursePage from "./pages/CoursePage";
import LessonPage from "./pages/LessonPage";
import ProtectedRoute from "./pages/ProtectedRoute";
import AddLesson from "./pages/AddLesson";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Notes from "./pages/Notes";
import UploadVideo from "./pages/UploadVideo";
import UploaderDashboard from "./pages/UploaderDashboard";
import AdminVideos from "./pages/AdminVideos";
import AdminRequests from "./pages/AdminRequests";
import AdminRoute from "./pages/AdminRoute";
import QuizPage from "./pages/QuizPage";
import CertificatePage from "./pages/CertificatePage";
import Settings from "./pages/Settings";
import MySolutions from "./pages/MySolutions";
import CodeEditor from "./pages/CodeEditor";
import SubmissionView from "./pages/SubmissionView";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected (logged-in users) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:id"
          element={
            <ProtectedRoute>
              <CoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/course/:courseId/lesson/:lessonId"
          element={
            <ProtectedRoute>
              <LessonPage />
            </ProtectedRoute>
          }
        />

        {/* Quiz & Certificate (protected) */}
        <Route
          path="/course/:courseId/quiz"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <QuizPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute>
              <CertificatePage />
            </ProtectedRoute>
          }
        />

        {/* Uploader area (protected) */}
        <Route
          path="/uploader/upload"
          element={
            <ProtectedRoute>
              <UploadVideo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/uploader/dashboard"
          element={
            <ProtectedRoute>
              <UploaderDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin area (AdminRoute wrapper) */}
        <Route
          path="/admin/requests"
          element={
            <AdminRoute>
              <AdminRequests />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/videos"
          element={
            <AdminRoute>
              <AdminVideos />
            </AdminRoute>
          }
        />

        {/* Add lesson / settings etc */}
        <Route
          path="/add-lesson"
          element={
            <ProtectedRoute>
              <AddLesson />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* Code / submissions */}
        <Route
          path="/code/editor/:courseId?/:lessonId?"
          element={
            <ProtectedRoute>
              <CodeEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/code/mine/all"
          element={
            <ProtectedRoute>
              <MySolutions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/code/:id"
          element={
            <ProtectedRoute>
              <SubmissionView />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
