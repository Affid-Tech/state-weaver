import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Settings, Archive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDiagramStore } from '@/store/diagramStore';
import { InstrumentCard } from '@/components/gallery/InstrumentCard';
import { GalleryFilters } from '@/components/gallery/GalleryFilters';
import { FieldConfigDialog } from '@/components/settings/FieldConfigDialog';
import { NewInstrumentDialog } from '@/components/gallery/NewInstrumentDialog';
import { EditInstrumentDialog } from '@/components/gallery/EditInstrumentDialog';
import { exportMultipleProjectsAsZip } from '@/lib/exportUtils';
import { toast } from 'sonner';
import type { DiagramProject } from '@/types/diagram';

export default function Gallery() {
  const navigate = useNavigate();
  const { projects, duplicateProject, deleteProject, selectProject } = useDiagramStore();
  
  const [search, setSearch] = useState('');
  const [revisionFilter, setRevisionFilter] = useState('__all__');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DiagramProject | null>(null);
  
  // Export mode state
  const [isExportMode, setIsExportMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get unique revisions for filter dropdown
  const availableRevisions = useMemo(() => {
    const revisions = new Set(projects.map(p => p.instrument.revision));
    return Array.from(revisions).sort();
  }, [projects]);

  // Group projects by revision, sorted appropriately
  const groupedProjects = useMemo(() => {
    let filtered = [...projects];

    // Search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.instrument.type.toLowerCase().includes(lowerSearch) ||
        p.instrument.label?.toLowerCase().includes(lowerSearch) ||
        p.instrument.description?.toLowerCase().includes(lowerSearch) ||
        p.name.toLowerCase().includes(lowerSearch)
      );
    }

    // Revision filter
    if (revisionFilter !== '__all__') {
      filtered = filtered.filter(p => p.instrument.revision === revisionFilter);
    }

    // Group by revision
    const groups = new Map<string, DiagramProject[]>();
    for (const project of filtered) {
      const rev = project.instrument.revision;
      if (!groups.has(rev)) groups.set(rev, []);
      groups.get(rev)!.push(project);
    }

    // Sort revisions descending (Z → A)
    const sortedRevisions = Array.from(groups.keys()).sort((a, b) => 
      b.localeCompare(a)
    );

    // Sort instruments within each group by type ascending (A → Z)
    return sortedRevisions.map(revision => ({
      revision,
      projects: groups.get(revision)!.sort((a, b) => 
        a.instrument.type.localeCompare(b.instrument.type)
      ),
    }));
  }, [projects, search, revisionFilter]);

  // Get all visible project IDs
  const allVisibleIds = useMemo(() => 
    groupedProjects.flatMap(g => g.projects.map(p => p.id)),
    [groupedProjects]
  );

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isRevisionFullySelected = (revision: string) => {
    const revProjects = groupedProjects.find(g => g.revision === revision)?.projects || [];
    return revProjects.length > 0 && revProjects.every(p => selectedIds.has(p.id));
  };

  const toggleRevisionSelection = (revision: string) => {
    const revProjects = groupedProjects.find(g => g.revision === revision)?.projects || [];
    const allSelected = isRevisionFullySelected(revision);
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        revProjects.forEach(p => next.delete(p.id));
      } else {
        revProjects.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(allVisibleIds));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const cancelExportMode = () => {
    setIsExportMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchExport = async () => {
    const selectedProjects = projects.filter(p => selectedIds.has(p.id));
    if (selectedProjects.length === 0) return;
    
    try {
      const blob = await exportMultipleProjectsAsZip(selectedProjects);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `instruments_export.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${selectedProjects.length} instrument${selectedProjects.length !== 1 ? 's' : ''}`);
      cancelExportMode();
    } catch (error) {
      toast.error('Failed to create ZIP file');
    }
  };

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

  const totalProjects = groupedProjects.reduce((sum, g) => sum + g.projects.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Instrument Gallery</h1>
            <div className="flex items-center gap-2">
              {isExportMode ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectedIds.size > 0 ? deselectAll : selectAll}
                  >
                    {selectedIds.size > 0 ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelExportMode}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBatchExport} 
                    disabled={selectedIds.size === 0}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Export {selectedIds.size} Instrument{selectedIds.size !== 1 ? 's' : ''}
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsExportMode(true)}
                    disabled={projects.length === 0}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Field Config
                  </Button>
                  <Button onClick={() => setIsNewDialogOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Instrument
                  </Button>
                </>
              )}
            </div>
          </div>
          <GalleryFilters
            search={search}
            onSearchChange={setSearch}
            revisionFilter={revisionFilter}
            onRevisionFilterChange={setRevisionFilter}
            availableRevisions={availableRevisions}
          />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {totalProjects === 0 ? (
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
          <div className="space-y-8">
            {groupedProjects.map(({ revision, projects: revProjects }) => (
              <section key={revision}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {revision}
                    <Badge variant="outline">{revProjects.length}</Badge>
                  </h2>
                  {isExportMode && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleRevisionSelection(revision)}
                    >
                      {isRevisionFullySelected(revision) ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {revProjects.map((project) => (
                    <InstrumentCard
                      key={project.id}
                      project={project}
                      isExportMode={isExportMode}
                      isSelected={selectedIds.has(project.id)}
                      onToggleSelect={() => toggleSelection(project.id)}
                      onEdit={handleEdit}
                      onEditDetails={handleEditDetails}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
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
