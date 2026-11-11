import { create } from 'zustand';
import type { PRKind } from '@/domain/types';
import { uid } from '@/lib/util';

export interface Toast {
  id: string;
  message: string;
  tone?: 'default' | 'success' | 'record' | 'danger';
  action?: { label: string; run: () => void };
  ttl: number;
}

export interface Celebration {
  id: string;
  exerciseName: string;
  kinds: PRKind[];
  detail: string;
}

interface UIState {
  toasts: Toast[];
  celebration: Celebration | null;
  toast(t: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }): string;
  dismiss(id: string): void;
  celebrate(c: Omit<Celebration, 'id'>): void;
  clearCelebration(): void;
}

export const useUI = create<UIState>()((set) => ({
  toasts: [],
  celebration: null,
  toast: (t) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ttl: t.action ? 5000 : 2600, ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  celebrate: (c) => set({ celebration: { ...c, id: uid() } }),
  clearCelebration: () => set({ celebration: null }),
}));

export const toast = (t: Parameters<UIState['toast']>[0]) => useUI.getState().toast(t);
