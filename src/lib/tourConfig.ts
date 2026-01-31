import type { Step } from 'react-joyride';

export const tourSteps: Step[] = [
  {
    target: '[data-tour="nav-start-tour"]',
    content: 'Start the guided tour any time from the main navigation.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-search"]',
    content: 'Search by instrument type, label, description, or project name.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-revision-filter"]',
    content: 'Filter instruments by revision to narrow the gallery.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-new-instrument"]',
    content: 'Create a brand new instrument to start modeling.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-field-config"]',
    content: 'Configure the available fields for revisions, topics, and message types.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-export"]',
    content: 'Export your current project data as a ZIP file.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-project-card"]',
    content: 'Open an instrument card (or click “New Instrument”) to enter the editor, then click Next.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-topbar"]',
    content: 'Use the top bar to return to the gallery and confirm which instrument you are editing.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-structure-sidebar"]',
    content: 'Manage topics and choose which topic you are editing in the structure sidebar.',
    placement: 'right',
  },
  {
    target: '[data-tour="editor-canvas"]',
    content: 'Drag states, connect transitions, and build your workflow on the canvas.',
    placement: 'top',
  },
  {
    target: '[data-tour="editor-inspector"]',
    content: 'Edit properties, add states, and review validation issues in the inspector.',
    placement: 'left',
  },
  {
    target: '[data-tour="editor-preview"]',
    content: 'Preview generated diagrams and copy the PlantUML output.',
    placement: 'top',
  },
];
