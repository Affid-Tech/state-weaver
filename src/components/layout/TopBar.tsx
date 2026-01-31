import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowLeft, FileText,} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useDiagramStore} from '@/store/diagramStore';
import {hasBlockingErrors, validateProject} from '@/lib/validation';
import {useTourStore} from '@/store/tourStore';

export function TopBar() {
    const navigate = useNavigate();
    // Use selectors for reactive access
    const project = useDiagramStore(s => s.getActiveProject());
    const startTour = useTourStore(s => s.startTour);

    const validationIssues = useMemo(() => project ? validateProject(project) : [], [project]);
    const hasErrors = hasBlockingErrors(validationIssues);

    // Handle null project case
    if (!project) {
        return (
        <header className="h-14 bg-card border-b border-border flex items-center px-4" data-tour="editor-topbar">
                <span className="text-muted-foreground">No project selected</span>
            </header>
        );
    }

    // Display name: use label if available, otherwise type
    const displayName = project.instrument.label || project.instrument.type;

    const handleBackToGallery = () => {
        navigate('/');
    };

    return (
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4" data-tour="editor-topbar">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBackToGallery}>
                    <ArrowLeft className="h-4 w-4 mr-2"/>
                    Gallery
                </Button>

                <div className="h-6 w-px bg-border"/>

                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary"/>
                    <span className="text-lg font-semibold">
            {displayName} / {project.instrument.revision}
          </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startTour('editor')}
                    data-tour="editor-start-tour"
                >
                    Start Editor Tour
                </Button>
            </div>
        </header>
    );
}
