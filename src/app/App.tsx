import { lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Shell } from './Shell';
import { useApp } from '@/store/app';
import { Logo } from '@/components/Icon';
import { primeAudio } from '@/lib/feedback';
import Dashboard from '@/features/dashboard/Dashboard';

const StartWorkout = lazy(() => import('@/features/workout/StartWorkout'));
const ActiveWorkout = lazy(() => import('@/features/workout/ActiveWorkout'));
const Routines = lazy(() => import('@/features/routines/Routines'));
const RoutineBuilder = lazy(() => import('@/features/routines/RoutineBuilder'));
const History = lazy(() => import('@/features/history/History'));
const WorkoutDetail = lazy(() => import('@/features/history/WorkoutDetail'));
const Analytics = lazy(() => import('@/features/analytics/Analytics'));
const Records = lazy(() => import('@/features/records/Records'));
const Exercises = lazy(() => import('@/features/exercises/Exercises'));
const ExerciseDetail = lazy(() => import('@/features/exercises/ExerciseDetail'));
const Settings = lazy(() => import('@/features/settings/Settings'));

function useTheme() {
  const theme = useApp((s) => s.profile.theme);
  useEffect(() => {
    const apply = () => {
      const resolved = theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f3f2ef' : '#08090b');
    };
    apply();
    if (theme !== 'system') return;
    const m = matchMedia('(prefers-color-scheme: light)');
    m.addEventListener('change', apply);
    return () => m.removeEventListener('change', apply);
  }, [theme]);
}

/** Global desktop shortcuts: N = start/resume workout, G then H/R/P/... could follow later. */
function Shortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable], [role="dialog"]')) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate(useApp.getState().active ? '/workout' : '/start');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  return null;
}

export default function App() {
  const hydrated = useApp((s) => s.hydrated);
  useTheme();
  useEffect(() => {
    const once = () => primeAudio();
    window.addEventListener('pointerdown', once, { once: true });
    return () => window.removeEventListener('pointerdown', once);
  }, []);

  if (!hydrated) {
    return (
      <div className="boot" aria-busy="true">
        <Logo size={44} />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Shortcuts />
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="start" element={<StartWorkout />} />
            <Route path="workout" element={<ActiveWorkout />} />
            <Route path="routines" element={<Routines />} />
            <Route path="routines/:id" element={<RoutineBuilder />} />
            <Route path="history" element={<History />} />
            <Route path="history/:id" element={<WorkoutDetail />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="records" element={<Records />} />
            <Route path="exercises" element={<Exercises />} />
            <Route path="exercises/:id" element={<ExerciseDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}
