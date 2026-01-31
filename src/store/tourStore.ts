import { create } from 'zustand';

interface TourState {
  run: boolean;
  stepIndex: number;
  startTour: () => void;
  stopTour: () => void;
  setStepIndex: (index: number) => void;
}

export const useTourStore = create<TourState>((set) => ({
  run: false,
  stepIndex: 0,
  startTour: () => set({ run: true, stepIndex: 0 }),
  stopTour: () => set({ run: false, stepIndex: 0 }),
  setStepIndex: (index) => set({ stepIndex: index }),
}));
