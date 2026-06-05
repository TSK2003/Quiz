import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthListener } from './hooks/useAuthListener';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';

// Admin Layouts
import { AdminLayout } from './components/admin/AdminLayout';
import { EventAdminLayout } from './components/admin/EventAdminLayout';

// Admin Pages
import { EventsPage } from './pages/admin/EventsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UsersPage } from './pages/admin/UsersPage';
import { CoursesPage } from './pages/admin/CoursesPage';
import { QuizzesPage } from './pages/admin/QuizzesPage';
import { QuizCreatePage } from './pages/admin/QuizCreatePage';
import { QuizAssignPage } from './pages/admin/QuizAssignPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Participant
import { ParticipantLayout } from './components/participant/ParticipantLayout';
import { ParticipantDashboard } from './pages/participant/ParticipantDashboard';
import { WaitingRoomPage } from './pages/participant/WaitingRoomPage';
import { LiveQuizPage } from './pages/participant/LiveQuizPage';

// Shared
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LiveTV } from './pages/LiveTV';
import { Toaster } from './components/ui/Toaster';

function App() {
  useAuthListener();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Global Admin (No Sidebar) */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<EventsPage />} />
        </Route>

        {/* Event-Scoped Admin (With Sidebar) */}
        <Route path="/admin/events/:eventId" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EventAdminLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
          <Route path="quizzes/create" element={<QuizCreatePage />} />
          <Route path="quizzes/:quizId/assign" element={<QuizAssignPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>
        
        <Route path="/live-tv" element={<LiveTV />} />

        <Route path="/participant" element={
          <ProtectedRoute allowedRoles={['participant']}>
            <ParticipantLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<ParticipantDashboard />} />
          <Route path="quiz/:quizId/waiting" element={<WaitingRoomPage />} />
          <Route path="quiz/:quizId/live" element={<LiveQuizPage />} />
          {/* We'll add more participant routes here later */}
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
