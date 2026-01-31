import { useEffect, useRef, useState } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { toast } from 'sonner';
import { editorTourSteps, galleryTourSteps } from '@/lib/tourConfig';
import { useTourStore } from '@/store/tourStore';

export function TourLauncher() {
  const { run, stepIndex, activeTour, setStepIndex, stopTour } = useTourStore();
  const waitingForTarget = useRef(false);
  const [joyrideKey, setJoyrideKey] = useState(0);

  const steps = activeTour === 'editor' ? editorTourSteps : galleryTourSteps;
  const currentStep = steps[stepIndex];

  // Watch for target to become available when waiting
  useEffect(() => {
    if (!run || !waitingForTarget.current || !currentStep) return;

    const checkTarget = () => {
      const target = document.querySelector(currentStep.target as string);
      if (target) {
        waitingForTarget.current = false;
        // Force Joyride to re-check by updating key
        setJoyrideKey((k) => k + 1);
      }
    };

    const observer = new MutationObserver(checkTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    checkTarget();

    return () => observer.disconnect();
  }, [run, stepIndex, currentStep]);

  const handleCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour();
      return;
    }

    // When target not found, wait for it instead of stopping
    if (type === EVENTS.TARGET_NOT_FOUND) {
      if (activeTour === 'editor') {
        toast('Open an instrument to continue the editor tour, then restart it from the top bar.');
        stopTour();
        return;
      }
      // For gallery tour, wait for target (e.g., modal content)
      waitingForTarget.current = true;
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
      setStepIndex(nextIndex);
    }

    if (action === ACTIONS.CLOSE) {
      stopTour();
    }
  };

  return (
    <Joyride
      key={joyrideKey}
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
