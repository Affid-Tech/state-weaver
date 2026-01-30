import { useState, useMemo, useCallback, useEffect } from 'react';
import { Copy, RefreshCw, AlertCircle, ChevronDown, ChevronUp, GripVertical, Layers, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toggle } from '@/components/ui/toggle';
import { useDiagramStore } from '@/store/diagramStore';
import { generateTopicPuml, generateAggregatePuml } from '@/lib/pumlGenerator';
import { renderPumlToSvg } from '@/lib/krokiRenderer';
import { cn } from '@/lib/utils';

const MIN_CODE_WIDTH = 100;
const MAX_CODE_WIDTH = 600;
const DEFAULT_CODE_WIDTH = 320;

export function PreviewPanel() {
  // Use selector to get active project
  const project = useDiagramStore(s => s.getActiveProject());
  const viewMode = useDiagramStore(s => s.viewMode);
  const setViewMode = useDiagramStore(s => s.setViewMode);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [codeWidth, setCodeWidth] = useState(DEFAULT_CODE_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pumlText = useMemo(() => {
    if (!project) return null;
    if (viewMode === 'aggregate') {
      return generateAggregatePuml(project);
    }
    if (project.selectedTopicId) {
      return generateTopicPuml(project, project.selectedTopicId);
    }
    return null;
  }, [project, viewMode]);

  const renderPreview = useCallback(async () => {
    if (!pumlText) {
      setSvg(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await renderPumlToSvg(pumlText);
      setSvg(result.svg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render preview');
      setSvg(null);
    } finally {
      setIsLoading(false);
    }
  }, [pumlText]);

  useEffect(() => {
    const debounceTimer = setTimeout(renderPreview, 500);
    return () => clearTimeout(debounceTimer);
  }, [renderPreview]);

  const handleCopyPuml = useCallback(() => {
    if (pumlText) {
      navigator.clipboard.writeText(pumlText);
    }
  }, [pumlText]);

  // Drag handling for vertical resize between preview and code
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = document.getElementById('preview-content-container');
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = Math.min(MAX_CODE_WIDTH, Math.max(MIN_CODE_WIDTH, containerRect.right - e.clientX));
      setCodeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // If no project, show placeholder
  if (!project) {
    return (
      <div className="border-t border-border bg-card flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">No project selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          Live Preview
        </button>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 mr-2">
            <Toggle
              pressed={viewMode === 'topic'}
              onPressedChange={() => setViewMode('topic')}
              aria-label="Topic view"
              size="sm"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Layers className="h-3 w-3 mr-1" />
              Topic
            </Toggle>
            <Toggle
              pressed={viewMode === 'aggregate'}
              onPressedChange={() => setViewMode('aggregate')}
              aria-label="Aggregate view"
              size="sm"
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <LayoutGrid className="h-3 w-3 mr-1" />
              Aggregate
            </Toggle>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={renderPreview}
            disabled={!pumlText || isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyPuml}
            disabled={!pumlText}
          >
            <Copy className="h-4 w-4" />
            <span className="ml-2">Copy PUML</span>
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div id="preview-content-container" className="flex-1 flex min-h-0 overflow-hidden">
          {/* SVG Preview */}
          <div className="flex-1 overflow-auto bg-background p-4">
            {isLoading && (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">{error}</p>
                <Button size="sm" variant="outline" onClick={renderPreview}>
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !error && svg && (
              <div
                className="flex items-center justify-center min-h-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
            {!isLoading && !error && !svg && !pumlText && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Select a topic to preview</p>
              </div>
            )}
          </div>

          {/* Vertical drag handle */}
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              'w-1.5 cursor-ew-resize bg-border hover:bg-primary/50 transition-colors flex items-center justify-center',
              isDragging && 'bg-primary/50'
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* PUML Code */}
          <div 
            className="border-l border-border bg-muted/30 flex-shrink-0"
            style={{ width: codeWidth }}
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Forks are visual-only routing aids and do not appear in the PlantUML output.
                </p>
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {pumlText || 'No PlantUML generated'}
                </pre>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
