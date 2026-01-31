import Joyride, { CallBackProps, STATUS } from 'react-joyride';
import { toast } from 'sonner';
import { tourSteps } from '@/lib/tourConfig';
import { useTourStore } from '@/store/tourStore';

export function TourLauncher() {
  const { run, stepIndex, setStepIndex, stopTour } = useTourStore();

  const handleCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour();
      return;
    }

    if (type === 'target:notFound') {
      const step = tourSteps[index];
      const target = typeof step?.target === 'string' ? step.target : '';
      const isEditorStep = target.includes('editor-');

      if (isEditorStep) {
        toast('Open an instrument to continue the tour, then restart it from the gallery.');
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
      steps={tourSteps}
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
