import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WorkoutProvider } from './context/WorkoutContext';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';
import CalendarPage from './pages/CalendarPage';
import DietPage from './pages/DietPage';
import StatsPage from './pages/StatsPage';
import AuthPage from './pages/AuthPage';
import './App.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('gym_memo_auth') === '1218';
  });

  useEffect(() => {
    const checkAuth = () => {
      if (localStorage.getItem('gym_memo_auth') !== '1218') {
        setIsAuthenticated(false);
      }
    };

    window.addEventListener('storage', checkAuth);
    window.addEventListener('focus', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('focus', checkAuth);
    };
  }, []);

  if (!isAuthenticated) {
    return <AuthPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <BrowserRouter>
      <WorkoutProvider>
        <main className="app-main">
          <Routes>
            <Route path="/"         element={<HomePage />} />
            <Route path="/workout"  element={<WorkoutPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/diet"     element={<DietPage />} />
            <Route path="/stats"    element={<StatsPage />} />
          </Routes>
        </main>
        <BottomNav />
      </WorkoutProvider>
    </BrowserRouter>
  );
}
