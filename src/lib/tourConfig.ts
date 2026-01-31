import type { Step } from 'react-joyride';

export const galleryTourSteps: Step[] = [
  {
    target: '[data-tour="gallery-start-tour"]',
    content: 'Use Start Tour any time to replay this walkthrough from the gallery.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-reload"]',
    content: 'Reload a saved project JSON file to restore your instrument list.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-export"]',
    content: 'Export your current project data as a ZIP file.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="gallery-field-config"]',
    content: 'Click Field Config to open the settings dialog.',
    placement: 'bottom',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="field-config-tab-revisions"]',
    content: 'Add a few revision values (e.g., R1, R2) so you can select them later.',
    placement: 'bottom',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="field-config-tab-instrumentTypes"]',
    content: 'Add a few instrument types you want to model.',
    placement: 'bottom',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="field-config-tab-topicTypes"]',
    content: 'Add several topic types; you will use these when creating topics.',
    placement: 'bottom',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="field-config-tab-messageTypes"]',
    content: 'Add some message types so transitions have options to choose from.',
    placement: 'bottom',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="field-config-tab-flowTypes"]',
    content: 'Add a few flow types and choose colors to make the diagram easier to scan.',
    placement: 'bottom',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="field-config-done"]',
    content: 'Close Field Config when you are done adding values.',
    placement: 'top',
    spotlightClicks: true,
    hideFooter: true,
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
    content: 'Click New Instrument to open the creation dialog.',
    placement: 'bottom',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="new-instrument-type"]',
    content: 'Choose the instrument type you want to build.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-instrument-revision"]',
    content: 'Pick the revision that matches your new instrument.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-instrument-description"]',
    content: 'Add a short description (optional) to help teammates recognize it.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-instrument-create"]',
    content: 'Click Create to finish the gallery tour and open the editor.',
    placement: 'top',
    spotlightClicks: true,
    hideFooter: true,
  },
];

export const editorTourSteps: Step[] = [
  {
    target: '[data-tour="editor-start-tour"]',
    content: 'Use Start Editor Tour any time you want a refresher on the canvas tools.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-topbar"]',
    content: 'The top bar lets you jump back to the gallery and confirm the active instrument.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-structure-sidebar"]',
    content: 'Manage your topics here and switch between them as you build.',
    placement: 'right',
  },
  {
    target: '[data-tour="editor-topic-create"]',
    content: 'Click + to add your first topic. We will create a root topic first.',
    placement: 'right',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="editor-topic-type"]',
    content: 'Select a topic type for the root topic.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-topic-kind"]',
    content: 'Set the kind to Root (Instrument Entry).',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-topic-create-confirm"]',
    content: 'Create the root topic.',
    placement: 'top',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="editor-topic-create"]',
    content: 'Click + again to add a normal topic.',
    placement: 'right',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="editor-topic-type"]',
    content: 'Choose another topic type for the normal topic.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-topic-kind"]',
    content: 'Leave the kind as Normal.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-topic-create-confirm"]',
    content: 'Create the normal topic to continue.',
    placement: 'top',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="editor-canvas"]',
    content: 'The canvas is where you layout states and transitions.',
    placement: 'top',
  },
  {
    target: '[data-tour="editor-inspector-add-state"]',
    content: 'Use Add State to create the first state in the selected topic.',
    placement: 'left',
    spotlightClicks: true,
    hideFooter: true,
  },
  {
    target: '[data-tour="editor-add-state-label"]',
    content: 'Name the new state, then add it to the topic.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="editor-canvas"]',
    content: 'Drag from the topic start node to your new state to create a simple transition.',
    placement: 'top',
  },
  {
    target: '[data-tour="editor-inspector"]',
    content: 'Use the inspector to edit properties, add forks, and review validation issues.',
    placement: 'left',
  },
  {
    target: '[data-tour="editor-preview"]',
    content: 'Preview the generated diagrams and copy PlantUML output here.',
    placement: 'top',
  },
];
