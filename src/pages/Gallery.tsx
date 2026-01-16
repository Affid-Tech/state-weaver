import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiagramStore } from '@/store/diagramStore';
import { InstrumentCard } from '@/components/gallery/InstrumentCard';
import { GalleryFilters, SortOption } from '@/components/gallery/GalleryFilters';
import { FieldConfigDialog } from '@/components/settings/FieldConfigDialog';
import { NewInstrumentDialog } from '@/components/gallery/NewInstrumentDialog';
import { EditInstrumentDialog } from '@/components/gallery/EditInstrumentDialog';
import { toast } from 'sonner';
import type { DiagramProject } from '@/types/diagram';

export default function Gallery() {
  const navigate = useNavigate();
  const { projects, duplicateProject, deleteProject, selectProject } = useDiagramStore();
  
  const [search, setSearch] = useState('');
  const [revisionFilter, setRevisionFilter] = useState('__all__');
  const [sortBy, setSortBy] = useState<SortOption>('modified');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DiagramProject | null>(null);

  // Get unique revisions for filter dropdown
  const availableRevisions = useMemo(() => {
    const revisions = new Set(projects.map(p => p.instrument.revision));
    return Array.from(revisions).sort();
  }, [projects]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(p => 
        p.instrument.type.toLowerCase().includes(lowerSearch) ||
        p.instrument.label?.toLowerCase().includes(lowerSearch) ||
        p.instrument.description?.toLowerCase().includes(lowerSearch) ||
        p.name.toLowerCase().includes(lowerSearch)
      );
    }

    // Revision filter
    if (revisionFilter !== '__all__') {
      result = result.filter(p => p.instrument.revision === revisionFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.instrument.type.localeCompare(b.instrument.type);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'modified':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [projects, search, revisionFilter, sortBy]);

  const handleEdit = (projectId: string) => {
    selectProject(projectId);
    navigate(`/editor/${projectId}`);
  };

  const handleDuplicate = (projectId: string) => {
    const newId = duplicateProject(projectId);
    if (newId) {
      toast.success('Instrument duplicated');
    }
  };

  const handleDelete = (projectId: string) => {
    if (confirm('Are you sure you want to delete this instrument?')) {
      deleteProject(projectId);
      toast.success('Instrument deleted');
    }
  };

  const handleEditDetails = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setEditingProject(project);
    }
  };

  const handleNewInstrumentCreated = (projectId: string) => {
    setIsNewDialogOpen(false);
    navigate(`/editor/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Instrument Gallery</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Field Config
              </Button>
              <Button onClick={() => setIsNewDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Instrument
              </Button>
            </div>
          </div>
          <GalleryFilters
            search={search}
            onSearchChange={setSearch}
            revisionFilter={revisionFilter}
            onRevisionFilterChange={setRevisionFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            availableRevisions={availableRevisions}
          />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted-foreground mb-4">
              {projects.length === 0 
                ? 'No instruments yet. Create your first one!'
                : 'No instruments match your filters.'}
            </div>
            {projects.length === 0 && (
              <Button onClick={() => setIsNewDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Instrument
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <InstrumentCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onEditDetails={handleEditDetails}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <FieldConfigDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <NewInstrumentDialog 
        open={isNewDialogOpen} 
        onOpenChange={setIsNewDialogOpen}
        onCreated={handleNewInstrumentCreated}
      />
      <EditInstrumentDialog
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
      />
    </div>
  );
}
