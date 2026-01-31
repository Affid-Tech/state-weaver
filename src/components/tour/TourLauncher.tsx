import { useEffect, useRef, useState } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';
import { toast } from 'sonner';
import { editorTourSteps, galleryTourSteps, TourStep } from '@/lib/tourConfig';
import { useTourStore } from '@/store/tourStore';

export function TourLauncher() {
  const { run, stepIndex, activeTour, setStepIndex, stopTour } = useTourStore();
  const waitingForTarget = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [joyrideKey, setJoyrideKey] = useState(0);

  const steps = activeTour === 'editor' ? editorTourSteps : galleryTourSteps;
  const currentStep = steps[stepIndex] as TourStep | undefined;

  // Watch for target to become available when waiting
  useEffect(() => {
    if (!run || !currentStep) return;

    const targetSelector = currentStep.target as string;
    
    const checkTarget = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        if (waitingForTarget.current) {
          waitingForTarget.current = false;
          // Force Joyride to re-render and find the new target
          setJoyrideKey((k) => k + 1);
        }
        return true;
      }
      return false;
    };

    // If target already exists, no need to observe
    if (checkTarget()) return;

    // Otherwise, wait for it to appear
    waitingForTarget.current = true;
    const observer = new MutationObserver(() => {
      checkTarget();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [run, stepIndex, currentStep]);

  // Auto-advance passive steps to keep the tour moving
  useEffect(() => {
    if (!run || !currentStep?.autoAdvanceMs) return;
    if (stepIndex >= steps.length - 1) return;

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }

    autoAdvanceTimer.current = setTimeout(() => {
      setStepIndex(stepIndex + 1);
    }, currentStep.autoAdvanceMs);

    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
    };
  }, [run, stepIndex, currentStep, steps.length, setStepIndex]);

  const handleCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour();
      return;
    }

    // When target not found, wait for it instead of stopping
    if (type === EVENTS.TARGET_NOT_FOUND) {
      if (activeTour === 'editor' && stepIndex === 0) {
        // Only show this message at the start of editor tour
        toast('Open an instrument to continue the editor tour, then restart it from the top bar.');
        stopTour();
        return;
      }
      // For other cases, wait for target (e.g., modal content)
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
