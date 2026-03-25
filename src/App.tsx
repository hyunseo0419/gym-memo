import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WorkoutProvider } from './context/WorkoutContext';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import WorkoutPage from './pages/WorkoutPage';
import CalendarPage from './pages/CalendarPage';
import DietPage from './pages/DietPage';
import StatsPage from './pages/StatsPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <WorkoutProvider>
        <div className="app-shell">
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
        </div>
      </WorkoutProvider>
    </BrowserRouter>
  );
}
