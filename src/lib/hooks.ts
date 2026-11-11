import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useApp } from '@/store/app';
import { LIBRARY, LIBRARY_MAP } from '@/data/exercises';
import { computeRecords } from '@/domain/calc';
import type { Exercise } from '@/domain/types';

/** Combined exercise lookup (library + custom). Stable while custom exercises are unchanged. */
export function useExerciseLookup() {
  const custom = useApp((s) => s.customExercises);
  return useCallback((id: string): Exercise | undefined => LIBRARY_MAP.get(id) ?? custom.find((c) => c.id === id), [custom]);
}

export function useAllExercises(): Exercise[] {
  const custom = useApp((s) => s.customExercises);
  return useMemo(() => [...custom, ...LIBRARY].sort((a, b) => a.name.localeCompare(b.name)), [custom]);
}

/** Record book + PR events, memoized on the workouts array identity. */
export function useRecords() {
  const workouts = useApp((s) => s.workouts);
  return useMemo(() => computeRecords(workouts), [workouts]);
}

/** Re-render every `ms` (aligned to wall clock seconds for clocks). */
export function useNow(ms = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      setNow(Date.now());
      t = setTimeout(loop, ms - (Date.now() % ms) + 5);
    };
    t = setTimeout(loop, ms - (Date.now() % ms) + 5);
    const vis = () => document.visibilityState === 'visible' && setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ms, enabled]);
  return now;
}

export function useMediaQuery(q: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(q);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(q).matches,
    () => false,
  );
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ForgeTrack` : 'ForgeTrack';
  }, [title]);
}
