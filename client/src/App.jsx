import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SyllabusForm from './pages/SyllabusForm';
import SyllabusView from './pages/SyllabusView';
import QuestionBank from './pages/QuestionBank';
import CourseNotes from './pages/CourseNotes';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-syllabus"
              element={
                <ProtectedRoute>
                  <SyllabusForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/syllabus/:id"
              element={
                <ProtectedRoute>
                  <SyllabusView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/syllabus/:id/questions"
              element={
                <ProtectedRoute>
                  <QuestionBank />
                </ProtectedRoute>
              }
            />
            <Route
              path="/syllabus/:id/notes"
              element={
                <ProtectedRoute>
                  <CourseNotes />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
