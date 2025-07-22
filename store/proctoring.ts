import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ProctoringState {
  isHydrated: boolean;
  isMainDevice: boolean;
  isStartProctoring: boolean;
  setHydrated: (hydrated: boolean) => void;
  setMainDevice: (isMainDevice: boolean) => void;
  setStartProctoring: (isStartProctoring: boolean) => void;
}

export const useProctoringState = create<ProctoringState>()(
  persist(
    (set) => ({
      isHydrated: false,
      isMainDevice: false,
      isStartProctoring: false,
      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),
      setMainDevice: (isMainDevice: boolean) => set({ isMainDevice }),
      setStartProctoring: (isStartProctoring: boolean) => set({ isStartProctoring }),
    }),
    {
      name: 'z-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
