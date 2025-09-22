// src/App.jsx
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
import UploadPage from "./pages/UploadPage";
import UploadVideo from "./pages/UploadVideo";
import UploaderDashboard from "./pages/UploaderDashboard";
import AdminVideos from "./pages/AdminVideos";
import AdminRequests from "./pages/AdminRequests";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing */}
        <Route path="/" element={<Landing />} />

        {/* Auth pages (moved to /auth to keep landing clean) */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/add-lesson" element={<AddLesson />} />
        <Route path="/admin/requests" element={<AdminRequests />} />
<Route path="/admin/videos" element={<AdminVideos />} />


        {/* Protected */}
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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
        <Route path="/uploader/upload" element={<UploadPage/>} />

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

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
