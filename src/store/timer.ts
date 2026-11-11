import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Rest timer. Stores an absolute end timestamp rather than a ticking counter,
 * so the remaining time is correct after the tab is backgrounded, the phone
 * sleeps, or the page reloads.
 */
export interface TimerState {
  endsAt: number | null;
  pausedRemaining: number | null; // ms, when paused
  totalMs: number;
  label: string;
  /** Bumped when a timer finishes, so UI can react once. */
  finishedAt: number | null;
  start(sec: number, label?: string): void;
  pause(): void;
  resume(): void;
  add(sec: number): void;
  skip(): void;
  markFinished(): void;
}

export const useTimer = create<TimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      pausedRemaining: null,
      totalMs: 0,
      label: '',
      finishedAt: null,
      start: (sec, label = '') => {
        if (sec <= 0) return set({ endsAt: null, pausedRemaining: null });
        set({ endsAt: Date.now() + sec * 1000, pausedRemaining: null, totalMs: sec * 1000, label, finishedAt: null });
      },
      pause: () => {
        const { endsAt } = get();
        if (!endsAt) return;
        set({ pausedRemaining: Math.max(0, endsAt - Date.now()), endsAt: null });
      },
      resume: () => {
        const { pausedRemaining } = get();
        if (pausedRemaining == null) return;
        set({ endsAt: Date.now() + pausedRemaining, pausedRemaining: null });
      },
      add: (sec) => {
        const { endsAt, pausedRemaining, totalMs } = get();
        const ms = sec * 1000;
        if (pausedRemaining != null) {
          const next = Math.max(0, pausedRemaining + ms);
          return set({ pausedRemaining: next, totalMs: Math.max(totalMs + ms, next) });
        }
        if (!endsAt) return;
        const remaining = Math.max(0, endsAt - Date.now()) + ms;
        if (remaining <= 0) return set({ endsAt: null });
        set({ endsAt: Date.now() + remaining, totalMs: Math.max(totalMs + ms, remaining) });
      },
      skip: () => set({ endsAt: null, pausedRemaining: null }),
      markFinished: () => set({ endsAt: null, pausedRemaining: null, finishedAt: Date.now() }),
    }),
    {
      name: 'forgetrack:timer',
      partialize: (s) => ({ endsAt: s.endsAt, pausedRemaining: s.pausedRemaining, totalMs: s.totalMs, label: s.label }),
    },
  ),
);

export function timerRemaining(s: Pick<TimerState, 'endsAt' | 'pausedRemaining'>, now = Date.now()): number {
  if (s.pausedRemaining != null) return s.pausedRemaining;
  if (s.endsAt == null) return 0;
  return Math.max(0, s.endsAt - now);
}
export const timerRunning = (s: Pick<TimerState, 'endsAt' | 'pausedRemaining'>) =>
  s.endsAt != null || s.pausedRemaining != null;
