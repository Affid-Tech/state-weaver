import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Editor from './Editor';
import { useDiagramStore } from '@/store/diagramStore';

vi.mock('@/store/diagramStore', () => ({
  useDiagramStore: vi.fn(),
}));

vi.mock('@/components/layout/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar" />,
}));

vi.mock('@/components/sidebar/StructureSidebar', () => ({
  StructureSidebar: () => <div data-testid="structure-sidebar" />,
}));

vi.mock('@/components/sidebar/InspectorPanel', () => ({
  InspectorPanel: () => <div data-testid="inspector-panel" />,
}));

vi.mock('@/components/canvas/DiagramCanvas', () => ({
  DiagramCanvas: () => <div data-testid="diagram-canvas" />,
}));

vi.mock('@/components/preview/PreviewPanel', () => ({
  PreviewPanel: ({ isExpanded }: { isExpanded: boolean }) => (
    <div data-testid="preview-panel">{isExpanded ? 'expanded' : 'collapsed'}</div>
  ),
}));

const mockedUseDiagramStore = vi.mocked(useDiagramStore);

const renderEditor = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
      </Routes>
    </MemoryRouter>
  );

describe('Editor page', () => {
  afterEach(() => {
    mockedUseDiagramStore.mockReset();
  });

  it('redirects to / when id param is missing', async () => {
    mockedUseDiagramStore.mockReturnValue({
      projects: [],
      selectProject: vi.fn(),
      activeProjectId: null,
    });

    renderEditor('/editor');

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('redirects to / when id param is unknown', async () => {
    mockedUseDiagramStore.mockReturnValue({
      projects: [{ id: 'known' }],
      selectProject: vi.fn(),
      activeProjectId: null,
    });

    renderEditor('/editor/unknown');

    expect(await screen.findByText('Home')).toBeInTheDocument();
  });

  it('selects the project and shows loading while waiting for active project', async () => {
    const selectProject = vi.fn();

    mockedUseDiagramStore.mockReturnValue({
      projects: [{ id: 'project-1' }],
      selectProject,
      activeProjectId: null,
    });

    renderEditor('/editor/project-1');

    await waitFor(() => {
      expect(selectProject).toHaveBeenCalledWith('project-1');
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('clamps canvas height during divider drag', async () => {
    mockedUseDiagramStore.mockReturnValue({
      projects: [{ id: 'project-1' }],
      selectProject: vi.fn(),
      activeProjectId: 'project-1',
    });

    renderEditor('/editor/project-1');

    const divider = await screen.findByTitle('Drag to resize');
    const main = divider.parentElement as HTMLElement;
    const canvasContainer = screen.getByTestId('diagram-canvas').parentElement as HTMLElement;

    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({
      height: 600,
      width: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);

    fireEvent.mouseDown(divider, { clientY: 300 });
    fireEvent.mouseMove(document, { clientY: 0 });
    fireEvent.mouseUp(document);

    expect(canvasContainer).toHaveStyle({ height: '200px' });

    fireEvent.mouseDown(divider, { clientY: 300 });
    fireEvent.mouseMove(document, { clientY: 1000 });
    fireEvent.mouseUp(document);

    expect(canvasContainer).toHaveStyle({ height: '500px' });
  });
});
