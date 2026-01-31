import Gallery from '@/pages/Gallery';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { DiagramProject } from '@/types/diagram';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportProjectAsZip } from '@/lib/exportUtils';

const mockNavigate = vi.fn();
const mockStartTour = vi.fn();

let mockState: {
  projects: DiagramProject[];
  duplicateProject: ReturnType<typeof vi.fn>;
  deleteProject: ReturnType<typeof vi.fn>;
  selectProject: ReturnType<typeof vi.fn>;
  importProject: ReturnType<typeof vi.fn>;
  exportProject: ReturnType<typeof vi.fn>;
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/diagramStore', () => ({
  useDiagramStore: (selector?: (state: typeof mockState) => unknown) =>
    selector ? selector(mockState) : mockState,
}));

vi.mock('@/store/tourStore', () => ({
  useTourStore: (selector?: (state: { startTour: typeof mockStartTour }) => unknown) =>
    selector ? selector({ startTour: mockStartTour }) : { startTour: mockStartTour },
}));

vi.mock('@/components/settings/FieldConfigDialog', () => ({
  FieldConfigDialog: () => <div data-testid="field-config-dialog" />,
}));

vi.mock('@/components/gallery/NewInstrumentDialog', () => ({
  NewInstrumentDialog: () => <div data-testid="new-instrument-dialog" />,
}));

vi.mock('@/components/gallery/EditInstrumentDialog', () => ({
  EditInstrumentDialog: () => <div data-testid="edit-instrument-dialog" />,
}));

vi.mock('@/lib/exportUtils', () => ({
  exportProjectAsZip: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createProject = (overrides: Partial<DiagramProject>): DiagramProject => ({
  id: 'project-1',
  name: 'Project One',
  instrument: {
    type: 'pacs_008',
    revision: 'R1',
    label: 'Payments',
    description: 'Payment instrument',
  },
  topics: [],
  selectedTopicId: null,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  mockNavigate.mockReset();
  mockStartTour.mockReset();

  mockState = {
    projects: [],
    duplicateProject: vi.fn(),
    deleteProject: vi.fn(),
    selectProject: vi.fn(),
    importProject: vi.fn(),
    exportProject: vi.fn(() => '{}'),
  };

  vi.mocked(exportProjectAsZip).mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();

  global.URL.createObjectURL = vi.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = vi.fn();
});

describe('Gallery', () => {
  it('shows empty state and disables export when there are no projects', () => {
    renderWithProviders(<Gallery />);

    expect(
      screen.getByText(/no instruments yet\. create your first one!/i),
    ).toBeInTheDocument();

    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('renders projects and filters by search and revision', async () => {
    const user = userEvent.setup();
    mockState.projects = [
      createProject({
        id: 'project-1',
        name: 'Payments Project',
        instrument: {
          type: 'pacs_008',
          revision: 'R1',
          label: 'Payments',
          description: 'Payment instrument',
        },
      }),
      createProject({
        id: 'project-2',
        name: 'Card Payments',
        instrument: {
          type: 'camt_054',
          revision: 'R2',
          label: 'Cards',
          description: 'Card instrument',
        },
      }),
    ];

    renderWithProviders(<Gallery />);

    expect(screen.getByText('pacs_008')).toBeInTheDocument();
    expect(screen.getByText('camt_054')).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/search instruments/i),
      'camt',
    );

    expect(screen.queryByText('pacs_008')).not.toBeInTheDocument();
    expect(screen.getByText('camt_054')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search instruments/i));
    await user.click(screen.getByRole('button', { name: /all revisions/i }));
    await user.click(screen.getByRole('option', { name: 'R2' }));

    expect(screen.queryByText('pacs_008')).not.toBeInTheDocument();
    expect(screen.getByText('camt_054')).toBeInTheDocument();
  });

  it('shows filtered empty state when projects do not match filters', async () => {
    const user = userEvent.setup();
    mockState.projects = [
      createProject({
        id: 'project-1',
        name: 'Payments Project',
        instrument: {
          type: 'pacs_008',
          revision: 'R1',
          label: 'Payments',
          description: 'Payment instrument',
        },
      }),
    ];

    renderWithProviders(<Gallery />);

    await user.type(
      screen.getByPlaceholderText(/search instruments/i),
      'missing',
    );

    expect(
      screen.getByText(/no instruments match your filters\./i),
    ).toBeInTheDocument();
  });

  it('exports projects and disables export for empty projects', async () => {
    const user = userEvent.setup();
    mockState.projects = [createProject({ id: 'project-1' })];

    vi.mocked(exportProjectAsZip).mockResolvedValue(new Blob(['zip']));

    renderWithProviders(<Gallery />);

    await user.click(screen.getByRole('button', { name: /export/i }));

    expect(exportProjectAsZip).toHaveBeenCalledWith(mockState);
    expect(toast.success).toHaveBeenCalledWith('Exported project');
  });

  it('imports projects and shows success or error toast', async () => {
    const user = userEvent.setup();
    mockState.projects = [createProject({ id: 'project-1' })];

    const fileReaderMock = vi.fn(function FileReaderMock(this: FileReader) {
      this.readAsText = () => {
        if (this.onload) {
          this.onload({ target: { result: '{"project": true}' } } as ProgressEvent<FileReader>);
        }
      };
    });

    vi.spyOn(global, 'FileReader').mockImplementation(fileReaderMock as unknown as typeof FileReader);

    mockState.importProject.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const { container } = renderWithProviders(<Gallery />);
    const fileInput = container.querySelector('input[type="file"]');

    if (!fileInput) {
      throw new Error('File input not found');
    }

    await user.upload(fileInput, new File(['content'], 'project.json', { type: 'application/json' }));
    expect(toast.success).toHaveBeenCalledWith('Project imported successfully');

    await user.upload(fileInput, new File(['content'], 'project.json', { type: 'application/json' }));
    expect(toast.error).toHaveBeenCalledWith('Failed to import project - invalid format');
  });

  it('handles edit, duplicate, and delete actions from instrument cards', async () => {
    const user = userEvent.setup();
    const project = createProject({ id: 'project-1' });
    mockState.projects = [project];
    mockState.duplicateProject.mockReturnValue('project-2');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<Gallery />);

    const card = screen.getByText('pacs_008').closest('.group');
    if (!card) {
      throw new Error('Instrument card not found');
    }

    const menuButton = within(card).getByRole('button');
    await user.click(menuButton);
    await user.click(screen.getByText(/Open Editor/i));

    expect(mockState.selectProject).toHaveBeenCalledWith('project-1');
    expect(mockNavigate).toHaveBeenCalledWith('/editor/project-1');

    await user.click(menuButton);
    await user.click(await screen.findByRole('menuitem', { name: /duplicate/i }));

    expect(mockState.duplicateProject).toHaveBeenCalledWith('project-1');
    expect(toast.success).toHaveBeenCalledWith('Instrument duplicated');

    await user.click(menuButton);
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));

    expect(mockState.deleteProject).toHaveBeenCalledWith('project-1');
    expect(toast.success).toHaveBeenCalledWith('Instrument deleted');
  });
});
