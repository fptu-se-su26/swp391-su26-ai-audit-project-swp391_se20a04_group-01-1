import { create } from 'zustand';

interface UIStore {
  isLoading: boolean;
  isModalOpen: boolean;
  toastMessage: string | null;

  // Actions
  setLoading: (loading: boolean) => void;
  setModalOpen: (open: boolean) => void;
  setToastMessage: (message: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isLoading: false,
  isModalOpen: false,
  toastMessage: null,

  setLoading: (isLoading) => set({ isLoading }),
  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setToastMessage: (toastMessage) => set({ toastMessage })
}));