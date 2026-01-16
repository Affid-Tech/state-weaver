import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { StructureSidebar } from '@/components/sidebar/StructureSidebar';
import { InspectorPanel } from '@/components/sidebar/InspectorPanel';
import { DiagramCanvas } from '@/components/canvas/DiagramCanvas';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { useDiagramStore } from '@/store/diagramStore';

const MIN_CANVAS_HEIGHT = 200;
const MIN_PREVIEW_HEIGHT = 100;

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, selectProject, activeProjectId } = useDiagramStore();
  
  const [canvasHeight, setCanvasHeight] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Select the project based on URL param
  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const exists = projects.some(p => p.id === id);
    if (!exists) {
      // Project not found, redirect to gallery
      navigate('/');
      return;
    }

    // Select project if not already selected
    if (id !== activeProjectId) {
      selectProject(id);
    }
    
    // Mark as ready once project is selected
    setIsReady(true);
  }, [id, activeProjectId, projects, selectProject, navigate]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startY = e.clientY;
    const container = e.currentTarget.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const initialCanvasHeight = canvasHeight ?? containerRect.height * 0.6;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = initialCanvasHeight + deltaY;
      const maxHeight = containerRect.height - MIN_PREVIEW_HEIGHT;
      
      setCanvasHeight(Math.max(MIN_CANVAS_HEIGHT, Math.min(newHeight, maxHeight)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [canvasHeight]);

  // Show loading state until project is selected
  if (!isReady || !id || activeProjectId !== id) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <StructureSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <div 
            className="flex-shrink-0 overflow-hidden"
            style={{ height: canvasHeight ?? '60%' }}
          >
            <DiagramCanvas />
          </div>
          
          {/* Draggable divider */}
          <div
            onMouseDown={handleDragStart}
            className={`h-2 cursor-row-resize flex-shrink-0 flex items-center justify-center transition-colors ${
              isDragging ? 'bg-primary/30' : 'bg-border hover:bg-primary/20'
            }`}
            title="Drag to resize"
          >
            <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <PreviewPanel />
          </div>
        </main>
        <InspectorPanel />
      </div>
    </div>
  );
}
