

# Fix Plan: Tour Modal Issues and Build Errors

## Problem Summary

There are three categories of issues to fix:

1. **Tour breaks on modal steps** - When the tour targets elements inside dialogs/modals, clicking "Next" closes the modal before the target becomes visible, causing "Target not mounted" errors
2. **TourLauncher TypeScript errors** - Incorrect event type strings (`"target:notFound"` should be `EVENTS.TARGET_NOT_FOUND`)
3. **DiagramStore TypeScript errors** - Missing `hiddenSelfLoopTransitionIds` property in `DiagramState` interface
4. **FieldConfigDialog TypeScript errors** - Type mismatch with `FieldKey` not including `flowTypeColors`

---

## Solution Overview

### Issue 1: Tour Modal Step Handling

The root cause is that clicking "Next" in react-joyride advances the step, but if the next target is inside a modal that isn't open yet, the tour fails. The solution requires:

1. **Use controlled steps with `spotlightClicks: true`** - Allow users to click the target button to open the modal
2. **Wait for modal to mount before advancing** - Add logic to detect when targeting modal content
3. **Restructure tour steps** to handle modal opening as a preparatory action

The galleryTourSteps are designed to:
- First highlight the "Field Config" button (step 4)
- Then immediately try to show tabs inside the modal (step 5+)

The issue is that clicking "Next" on step 4 doesn't open the modal - it just advances to step 5 where the target doesn't exist.

**Approach**: Modify the tour to use `spotlightClicks: true` and handle the case where modal steps require the modal to be open. We'll also need to track whether we're on a "modal prep" step.

### Issue 2: TourLauncher TypeScript Errors

The code uses string literals instead of the proper constants from react-joyride:
- `"target:notFound"` should be `EVENTS.TARGET_NOT_FOUND`
- Need to import `EVENTS, STATUS, ACTIONS` from react-joyride

### Issue 3: DiagramStore TypeScript Errors

The `hiddenSelfLoopTransitionIds` property is used but not declared in the `DiagramState` interface. Need to add:
```typescript
hiddenSelfLoopTransitionIds: Record<string, boolean>;
```

### Issue 4: FieldConfigDialog TypeScript Errors

The `FIELD_LABELS` and `newValues` state use `Record<FieldKey, string>` but `FieldKey = keyof FieldConfig` includes `flowTypeColors` which is a `Record<string, string>` not a `string[]`. 

Solution: Create a separate type for editable fields that excludes `flowTypeColors`:
```typescript
type EditableFieldKey = Exclude<keyof FieldConfig, 'flowTypeColors'>;
```

---

## Technical Implementation Plan

### Step 1: Fix DiagramStore TypeScript Errors

**File: `src/store/diagramStore.ts`**

Add the missing property to the `DiagramState` interface:

```typescript
export interface DiagramState {
  // ... existing properties
  hiddenSelfLoopTransitionIds: Record<string, boolean>;
  // ... rest of interface
}
```

Also add initialization in the store:
```typescript
hiddenSelfLoopTransitionIds: {},
```

### Step 2: Fix FieldConfigDialog TypeScript Errors

**File: `src/components/settings/FieldConfigDialog.tsx`**

Change the type definition to exclude `flowTypeColors`:

```typescript
type EditableFieldKey = Exclude<keyof FieldConfig, 'flowTypeColors'>;

const FIELD_LABELS: Record<EditableFieldKey, string> = {
  revisions: 'Revisions',
  instrumentTypes: 'Instrument Types',
  topicTypes: 'Topic Types',
  messageTypes: 'Message Types',
  flowTypes: 'Flow Types',
};

const [newValues, setNewValues] = useState<Record<EditableFieldKey, string>>({
  revisions: '',
  instrumentTypes: '',
  topicTypes: '',
  messageTypes: '',
  flowTypes: '',
});
```

Update function parameters:
```typescript
const handleAddValue = (field: EditableFieldKey) => { ... }
const handleRemoveValue = (field: EditableFieldKey, value: string) => { ... }
const renderFieldTab = (field: EditableFieldKey) => { ... }
```

### Step 3: Fix TourLauncher TypeScript Errors

**File: `src/components/tour/TourLauncher.tsx`**

Import the proper constants and use them:

```typescript
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';

const handleCallback = (data: CallBackProps) => {
  const { status, type, index, action } = data;

  if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
    stopTour();
    return;
  }

  if (type === EVENTS.TARGET_NOT_FOUND) {
    if (activeTour === 'editor') {
      toast('Open an instrument to continue the editor tour...');
      stopTour();
      return;
    }
  }

  if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
    setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
  }

  if (action === ACTIONS.CLOSE) {
    stopTour();
  }
};
```

### Step 4: Fix Tour Modal Step Handling

This is the core fix for the original reported issue. The problem is that tour steps targeting elements inside dialogs fail because:
1. The dialog isn't open when the tour tries to find the target
2. Clicking "Next" doesn't trigger the button that opens the dialog

**Solution A: Restructure tour configuration**

For steps that target elements inside modals, we need to:
1. Make the previous step (the button that opens the modal) use `spotlightClicks: true` so users must click it
2. Wait for the modal to open before advancing

**File: `src/lib/tourConfig.ts`**

Update the galleryTourSteps to handle modal steps better:

```typescript
{
  target: '[data-tour="gallery-field-config"]',
  content: 'Click this button to open Field Config...',
  placement: 'bottom',
  spotlightClicks: true,
  disableOverlayClose: true,
  hideFooter: true, // Hide Next button - user must click the target
},
{
  target: '[data-tour="field-config-tab-revisions"]',
  content: 'Add a few revision values...',
  placement: 'bottom',
  // This step only shows after modal is open
},
```

**Solution B: Add modal-aware tour logic**

**File: `src/components/tour/TourLauncher.tsx`**

Add logic to wait for modal targets to become available:

```typescript
import { useEffect, useRef } from 'react';

export function TourLauncher() {
  const { run, stepIndex, activeTour, setStepIndex, stopTour } = useTourStore();
  const waitingForTarget = useRef(false);

  const steps = activeTour === 'editor' ? editorTourSteps : galleryTourSteps;
  const currentStep = steps[stepIndex];

  // Watch for target to become available
  useEffect(() => {
    if (!run || !waitingForTarget.current || !currentStep) return;

    const checkTarget = () => {
      const target = document.querySelector(currentStep.target as string);
      if (target) {
        waitingForTarget.current = false;
        // Force Joyride to re-check
        setStepIndex(stepIndex);
      }
    };

    const observer = new MutationObserver(checkTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Initial check
    checkTarget();

    return () => observer.disconnect();
  }, [run, stepIndex, currentStep, setStepIndex]);

  const handleCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      stopTour();
      return;
    }

    // When target not found, wait for it instead of stopping
    if (type === EVENTS.TARGET_NOT_FOUND) {
      waitingForTarget.current = true;
      // Don't advance or stop - just wait
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    if (action === ACTIONS.CLOSE) {
      stopTour();
    }
  };

  // ... rest of component
}
```

**Solution C: Configure steps that open modals to hide the Next button**

Update tour step configuration to mark which steps require user interaction:

```typescript
// In tourConfig.ts - steps that open modals should hide footer
{
  target: '[data-tour="gallery-field-config"]',
  content: 'Click Field Config to open the settings dialog.',
  hideFooter: true, // Force user to click the button
  spotlightClicks: true,
},
```

This approach ensures users must click the button to open the modal, and the tour waits for the modal content to appear.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/store/diagramStore.ts` | Add `hiddenSelfLoopTransitionIds` to interface and initial state |
| `src/components/settings/FieldConfigDialog.tsx` | Fix `FieldKey` type to exclude `flowTypeColors` |
| `src/components/tour/TourLauncher.tsx` | Fix event type imports, add modal-aware waiting logic |
| `src/lib/tourConfig.ts` | Update modal-opening steps to use `hideFooter` and `spotlightClicks` |

---

## Testing Checklist

After implementation:
1. Verify all TypeScript errors are resolved
2. Start the Gallery tour and click through all steps
3. Verify Field Config modal steps work correctly
4. Test the Editor tour with modal steps
5. Verify "Target not mounted" warnings no longer appear
6. Test skipping and closing the tour mid-way

