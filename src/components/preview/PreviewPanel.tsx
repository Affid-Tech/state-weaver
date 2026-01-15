import { useState, useMemo, useCallback, useEffect } from 'react';
import { Copy, RefreshCw, AlertCircle, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiagramStore } from '@/store/diagramStore';
import { generateTopicPuml, generateAggregatePuml } from '@/lib/pumlGenerator';
import { renderPumlToSvg } from '@/lib/krokiRenderer';
import { cn } from '@/lib/utils';

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 320;

export function PreviewPanel() {
  const { project, viewMode } = useDiagramStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pumlText = useMemo(() => {
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

  // Drag handling for resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, windowHeight - e.clientY));
      setPanelHeight(newHeight);
      // Auto-expand if dragging above threshold
      if (newHeight > MIN_HEIGHT + 20) {
        setIsExpanded(true);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Collapse if height is near minimum
      if (panelHeight <= MIN_HEIGHT + 20) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, panelHeight]);

  const currentHeight = isExpanded ? panelHeight : MIN_HEIGHT;

  return (
    <div 
      className="border-t border-border bg-card flex flex-col transition-[height] duration-150"
      style={{ height: currentHeight }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'h-1.5 cursor-ns-resize bg-border hover:bg-primary/50 transition-colors flex items-center justify-center',
          isDragging && 'bg-primary/50'
        )}
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground" />
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          Live Preview
        </button>
        <div className="flex items-center gap-2">
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
        <div className="flex-1 flex min-h-0">
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

          {/* PUML Code */}
          <div className="w-80 border-l border-border bg-muted/30">
            <ScrollArea className="h-full">
              <pre className="p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                {pumlText || 'No PlantUML generated'}
              </pre>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
