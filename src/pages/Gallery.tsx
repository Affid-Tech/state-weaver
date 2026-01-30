import {useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Archive, PlusCircle, Settings, Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {useDiagramStore} from '@/store/diagramStore';
import {InstrumentCard} from '@/components/gallery/InstrumentCard';
import {GalleryFilters} from '@/components/gallery/GalleryFilters';
import {FieldConfigDialog} from '@/components/settings/FieldConfigDialog';
import {NewInstrumentDialog} from '@/components/gallery/NewInstrumentDialog';
import {EditInstrumentDialog} from '@/components/gallery/EditInstrumentDialog';
import {exportProjectAsZip} from '@/lib/exportUtils';
import {toast} from 'sonner';
import type {DiagramProject} from '@/types/diagram';

export default function Gallery() {
    const navigate = useNavigate();
    const projectImportFileInputRef = useRef<HTMLInputElement>(null);
    const state = useDiagramStore();
    const {projects, duplicateProject, deleteProject, selectProject} = state;

    const [search, setSearch] = useState('');
    const [revisionFilter, setRevisionFilter] = useState('__all__');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<DiagramProject | null>(null);

    // Export mode state
    const importProject = useDiagramStore(s => s.importProject);

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

    const handleImportProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const json = event.target?.result as string;
            const success = importProject(json);
            if (success) {
                toast.success('Project imported successfully');
            } else {
                toast.error('Failed to import project - invalid format');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleProjectExport = async () => {
        try {
            const blob = await exportProjectAsZip(state);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `state_machine.zip`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Exported project');
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
                        <h1 className="text-2xl font-bold">Instruments</h1>
                        <div className="flex items-center gap-2">
                            <input
                                ref={projectImportFileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleImportProjectJson}
                                className="hidden"
                            />
                            <Button variant="ghost" size="sm" onClick={() => projectImportFileInputRef.current?.click()}>
                                <Upload className="h-4 w-4 mr-2"/>
                                Reload Project
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleProjectExport}
                                disabled={projects.length === 0}
                            >
                                <Archive className="h-4 w-4 mr-2"/>
                                Export
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                                <Settings className="h-4 w-4 mr-2"/>
                                Field Config
                            </Button>
                            <Button onClick={() => setIsNewDialogOpen(true)}>
                                <PlusCircle className="h-4 w-4 mr-2"/>
                                New Instrument
                            </Button>
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
                                <PlusCircle className="h-4 w-4 mr-2"/>
                                Create Instrument
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedProjects.map(({revision, projects: revProjects}) => (
                            <section key={revision}>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        {revision}
                                        <Badge variant="outline">{revProjects.length}</Badge>
                                    </h2>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {revProjects.map((project) => (
                                        <InstrumentCard
                                            key={project.id}
                                            project={project}
                                            isExportMode={false}
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

            <FieldConfigDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}/>
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
