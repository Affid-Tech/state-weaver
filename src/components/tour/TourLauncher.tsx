import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { toast } from 'sonner';
import { editorTourSteps, galleryTourSteps } from '@/lib/tourConfig';
import { useTourStore } from '@/store/tourStore';

export function TourLauncher() {
  const { run, stepIndex, activeTour, setStepIndex, stopTour } = useTourStore();

  const steps = activeTour === 'editor' ? editorTourSteps : galleryTourSteps;

  const handleCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour();
      return;
    }

    if (type === 'target:notFound') {
      if (activeTour === 'editor') {
        toast('Open an instrument to continue the editor tour, then restart it from the top bar.');
        stopTour();
        return;
      }
    }

    if (type === 'step:after' || type === 'target:notFound') {
      setStepIndex(index + 1);
    }

    if (action === 'close') {
      stopTour();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      spotlightClicks
      callback={handleCallback}
      styles={{
        options: {
          zIndex: 10000,
        },
      }}
    />
  );
}
