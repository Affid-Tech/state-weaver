import type { Step } from 'react-joyride';

export type TourStep = Step & {
  autoAdvanceMs?: number;
};

export const galleryTourSteps: TourStep[] = [
  {
    target: '[data-tour="gallery-start-tour"]',
    content: 'Start Tour replays this walkthrough whenever you need a refresher.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="gallery-reload"]',
    content: 'Reload restores a saved project JSON file and brings back your instrument list.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="gallery-export"]',
    content: 'Export packages the current project data as a ZIP file.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="gallery-search"]',
    content: 'Search filters the gallery by instrument type, label, description, or project name.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="gallery-revision-filter"]',
    content: 'Revision filtering narrows the gallery to a specific version.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="gallery-new-instrument"]',
    content: 'New Instrument opens the dialog for building a fresh instrument.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
];

export const editorTourSteps: TourStep[] = [
  {
    target: '[data-tour="editor-start-tour"]',
    content: 'Start Editor Tour replays this walkthrough from the top bar.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="editor-topbar"]',
    content: 'The top bar shows the active instrument and a shortcut back to the gallery.',
    placement: 'bottom',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="editor-structure-sidebar"]',
    content: 'The structure sidebar lists topics and lets you switch focus quickly.',
    placement: 'right',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="editor-canvas"]',
    content: 'The canvas is the main workspace for states and transitions.',
    placement: 'top',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="editor-inspector"]',
    content: 'The inspector shows properties, forks, and validation details for the selection.',
    placement: 'left',
    autoAdvanceMs: 3200,
  },
  {
    target: '[data-tour="editor-preview"]',
    content: 'Preview shows the generated diagrams along with the PlantUML output.',
    placement: 'top',
    autoAdvanceMs: 3200,
  },
];
