import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home           from './pages/Home';
import PostList       from './pages/PostList';
import ScheduleEditor from './pages/ScheduleEditor';
import Results        from './pages/Results';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-800">
         <div className="flex-1">
        <Routes>
          <Route path="/"                              element={<Home />} />
          <Route path="/device/:deviceId/posts"        element={<PostList />} />
          <Route path="/post/:postId/schedule"         element={<ScheduleEditor />} />
          <Route path="/device/:deviceId/results"      element={<Results />} />
        </Routes>
      </div>
      <footer className="text-center py-4 text-sm text-gray-400">
          © Quentin Millancourt
        </footer>
      </div>
    </BrowserRouter>
  );
}