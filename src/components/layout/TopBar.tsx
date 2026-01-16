import { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Upload,
  FileCode,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useDiagramStore } from '@/store/diagramStore';
import { generateTopicPuml, generateAggregatePuml } from '@/lib/pumlGenerator';
import { validateProject, hasBlockingErrors } from '@/lib/validation';
import { toast } from 'sonner';
import { FieldConfigDialog } from '@/components/settings/FieldConfigDialog';
import { useState } from 'react';

export function TopBar() {
  const navigate = useNavigate();
  // Use selectors for reactive access
  const project = useDiagramStore(s => s.getActiveProject());
  const viewMode = useDiagramStore(s => s.viewMode);
  const exportProject = useDiagramStore(s => s.exportProject);
  const importProject = useDiagramStore(s => s.importProject);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validationIssues = useMemo(() => project ? validateProject(project) : [], [project]);
  const hasErrors = hasBlockingErrors(validationIssues);

  // Handle null project case
  if (!project) {
    return (
      <header className="h-14 bg-card border-b border-border flex items-center px-4">
        <span className="text-muted-foreground">No project selected</span>
      </header>
    );
  }

  // Display name: use label if available, otherwise type
  const displayName = project.instrument.label || project.instrument.type;

  const handleExportJson = () => {
    const json = exportProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.instrument.type}_${project.instrument.revision}.json`;
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
      filename = `${project.instrument.type}_aggregate.puml`;
    } else if (project.selectedTopicId) {
      puml = generateTopicPuml(project, project.selectedTopicId);
      filename = `${project.instrument.type}_${project.selectedTopicId}.puml`;
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

  const handleBackToGallery = () => {
    navigate('/');
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBackToGallery}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Gallery
        </Button>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">
            {displayName} / {project.instrument.revision}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-4">
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
            Field Config
          </Button>
        </div>

        <FieldConfigDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </div>
    </header>
  );
}
