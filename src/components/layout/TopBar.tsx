import { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Download,
  Upload,
  PlusCircle,
  FileCode,
  Layers,
  LayoutGrid,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { useDiagramStore } from '@/store/diagramStore';
import { generateTopicPuml, generateAggregatePuml } from '@/lib/pumlGenerator';
import { validateProject, hasBlockingErrors } from '@/lib/validation';
import { toast } from 'sonner';
import { FieldConfigDialog } from '@/components/settings/FieldConfigDialog';

export function TopBar() {
  const {
    project,
    viewMode,
    setViewMode,
    updateProjectName,
    exportProject,
    importProject,
    resetProject,
  } = useDiagramStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validationIssues = useMemo(() => validateProject(project), [project]);
  const hasErrors = hasBlockingErrors(validationIssues);

  const handleNameSubmit = () => {
    if (editName.trim()) {
      updateProjectName(editName.trim());
    }
    setIsEditing(false);
  };

  const handleExportJson = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Project exported as JSON');
  };

  const handleExportPuml = () => {
    if (hasErrors) {
      toast.error('Fix validation errors before exporting');
      return;
    }

    let puml: string | null = null;
    let filename: string;

    if (viewMode === 'aggregate') {
      puml = generateAggregatePuml(project);
      filename = `${project.instrument.id}_aggregate.puml`;
    } else if (project.selectedTopicId) {
      puml = generateTopicPuml(project, project.selectedTopicId);
      filename = `${project.instrument.id}_${project.selectedTopicId}.puml`;
    }

    if (!puml) {
      toast.error('No diagram to export');
      return;
    }

    const blob = new Blob([puml], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('PlantUML exported');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleNewProject = () => {
    if (confirm('Create a new project? Unsaved changes will be lost.')) {
      resetProject();
      toast.success('New project created');
    }
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              className="h-8 w-48"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setEditName(project.name);
                setIsEditing(true);
              }}
              className="text-lg font-semibold hover:text-primary transition-colors"
            >
              {project.name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 ml-4">
          <Button variant="ghost" size="sm" onClick={handleNewProject}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportPuml} disabled={hasErrors}>
                <FileCode className="h-4 w-4 mr-2" />
                Export PlantUML (.puml)
                {hasErrors && <span className="ml-2 text-destructive text-xs">(fix errors)</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportJson}>
                <FileText className="h-4 w-4 mr-2" />
                Export Project (.json)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        <FieldConfigDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">View:</span>
        <Toggle
          pressed={viewMode === 'topic'}
          onPressedChange={() => setViewMode('topic')}
          aria-label="Topic view"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Layers className="h-4 w-4 mr-2" />
          Topic
        </Toggle>
        <Toggle
          pressed={viewMode === 'aggregate'}
          onPressedChange={() => setViewMode('aggregate')}
          aria-label="Aggregate view"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Aggregate
        </Toggle>
      </div>
    </header>
  );
}
