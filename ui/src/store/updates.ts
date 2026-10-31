import { create } from 'zustand';
import type { UpdateStatus } from '../platform';

interface UpdatesState {
  status: UpdateStatus | null;
  dismissedVersion: string | null;
  setStatus(status: UpdateStatus): void;
  dismiss(version: string): void;
}

export const useUpdates = create<UpdatesState>((set) => ({
  status: null,
  dismissedVersion: null,
  setStatus: (status) => set({ status }),
  dismiss: (dismissedVersion) => set({ dismissedVersion }),
}));

