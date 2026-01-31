import { create } from 'zustand';

export type TourName = 'gallery' | 'editor';

interface TourState {
  run: boolean;
  stepIndex: number;
  activeTour: TourName | null;
  startTour: (tour: TourName) => void;
  stopTour: () => void;
  setStepIndex: (index: number) => void;
}

export const useTourStore = create<TourState>((set) => ({
  run: false,
  stepIndex: 0,
  activeTour: null,
  startTour: (tour) => set({ run: true, stepIndex: 0, activeTour: tour }),
  stopTour: () => set({ run: false, stepIndex: 0, activeTour: null }),
  setStepIndex: (index) => set({ stepIndex: index }),
}));
