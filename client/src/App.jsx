import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CoursePage from "./pages/CoursePage";
import LessonPage from "./pages/LessonPage";
import ProtectedRoute from "./pages/ProtectedRoute";
import AddLesson from "./pages/AddLesson";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Notes from "./pages/Notes";
import Landing from "./pages/Landing"; // <-- exact filename match required

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page (public) */}
        <Route path="/" element={<Landing />} />

        {/* Auth routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Add Lesson (protected admin/teacher area) */}
        <Route
          path="/add-lesson"
          element={
            <ProtectedRoute>
              <AddLesson />
            </ProtectedRoute>
          }
        />

        {/* Notes (protected) */}
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />

        {/* Dashboard (protected) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Course page (protected) */}
        <Route
          path="/course/:id"
          element={
            <ProtectedRoute>
              <CoursePage />
            </ProtectedRoute>
          }
        />

        {/* Lesson Page (protected) */}
        <Route
          path="/course/:courseId/lesson/:lessonId"
          element={
            <ProtectedRoute>
              <LessonPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
