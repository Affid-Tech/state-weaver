export const TOUR_SELECT_EVENT = 'tour:select';

export type TourSelectDetail = {
  target: string;
};

export const dispatchTourSelect = (target: string) => {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(
    new CustomEvent<TourSelectDetail>(TOUR_SELECT_EVENT, {
      detail: { target },
    })
  );
};
