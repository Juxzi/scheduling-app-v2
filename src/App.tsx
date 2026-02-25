import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import ProtectedRoute  from './components/ProtectedRoute.tsx';
import Login           from './pages/Login.tsx';
import Home            from './pages/Home.tsx';
import PostList        from './pages/PostList.tsx';
import ScheduleEditor  from './pages/ScheduleEditor.tsx';
import Results         from './pages/Results.tsx';
import History         from './pages/History.tsx';
import Admin           from './pages/Admin.tsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          }/>
          <Route path="/device/:deviceId/posts" element={
            <ProtectedRoute><PostList /></ProtectedRoute>
          }/>
          <Route path="/post/:postId/schedule" element={
            <ProtectedRoute><ScheduleEditor /></ProtectedRoute>
          }/>
          <Route path="/device/:deviceId/results" element={
            <ProtectedRoute><Results /></ProtectedRoute>
          }/>
          <Route path="/history" element={
            <ProtectedRoute><History /></ProtectedRoute>
          }/>
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
          }/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}