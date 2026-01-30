import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Lock, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StateNode } from '@/types/diagram';

interface StateNodeData {
  state: StateNode;
  isSelected: boolean;
  isConnecting?: boolean;
  hasSelfLoops?: boolean;
  onSelect: (id: string) => void;
}

interface StateNodeProps {
  data: StateNodeData;
  id: string;
}

export const StateNodeComponent = memo(({ data, id }: StateNodeProps) => {
  const { state, isSelected, isConnecting, onSelect, hasSelfLoops } = data;
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  const getNodeStyle = () => {
    if (state.isSystemNode) {
      switch (state.systemNodeType) {
        case 'TopicStart':
          return 'bg-state-start text-state-start-foreground border-state-start-border';
        case 'TopicEnd':
          return 'bg-state-end text-state-end-foreground border-state-end-border';
        case 'NewInstrument':
          return 'bg-state-system text-state-system-foreground border-state-system-border';
        case 'InstrumentEnd':
          return 'bg-state-end text-state-end-foreground border-state-end-border';
        case 'Fork':
          return 'bg-state-system text-state-system-foreground border-state-system-border';
        default:
          return 'bg-state text-state-foreground border-state-border';
      }
    }
    return 'bg-state text-state-foreground border-state-border';
  };

  const isStart = state.systemNodeType === 'TopicStart' || state.systemNodeType === 'NewInstrument';
  const isEnd = state.systemNodeType === 'TopicEnd' || state.systemNodeType === 'InstrumentEnd';
  const isFork = state.systemNodeType === 'Fork';

  // Show handles on hover, selection, or during connection
  const showHandles = isHovered || isSelected || isConnecting;

  // Common handle styles - visible only when showHandles is true
  const handleClass = cn(
    '!border-background !w-2 !h-2 transition-opacity duration-150',
    showHandles ? '!bg-primary opacity-100' : '!bg-transparent opacity-0'
  );

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'border-2 shadow-sm cursor-pointer transition-all relative flex items-center justify-center',
        isFork ? 'h-6 w-6 rotate-45' : 'px-4 py-3 rounded-lg min-w-[120px] text-center',
        getNodeStyle(),
        isSelected && 'ring-2 ring-state-selected-ring ring-offset-2 ring-offset-background'
      )}
    >
      {isFork ? (
        <div className="absolute inset-0 -rotate-45">
          {/* Target handles (inputs) - on all sides except for start nodes */}
          {!isStart && (
            <>
              <Handle
                type="target"
                position={Position.Top}
                id="target-top"
                className={handleClass}
              />
              <Handle
                type="target"
                position={Position.Left}
                id="target-left"
                className={handleClass}
              />
              <Handle
                type="target"
                position={Position.Right}
                id="target-right"
                className={handleClass}
              />
              <Handle
                type="target"
                position={Position.Bottom}
                id="target-bottom"
                className={handleClass}
              />
            </>
          )}

          {/* Source handles (outputs) - on all sides except for end nodes */}
          {!isEnd && (
            <>
              <Handle
                type="source"
                position={Position.Top}
                id="source-top"
                className={handleClass}
              />
              <Handle
                type="source"
                position={Position.Left}
                id="source-left"
                className={handleClass}
              />
              <Handle
                type="source"
                position={Position.Right}
                id="source-right"
                className={handleClass}
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id="source-bottom"
                className={handleClass}
              />
            </>
          )}
        </div>
      ) : (
        <>
          {/* Target handles (inputs) - on all sides except for start nodes */}
          {!isStart && (
            <>
              <Handle
                type="target"
                position={Position.Top}
                id="target-top"
                className={handleClass}
              />
              <Handle
                type="target"
                position={Position.Left}
                id="target-left"
                className={handleClass}
              />
              <Handle
                type="target"
                position={Position.Right}
                id="target-right"
                className={handleClass}
              />
              <Handle
                type="target"
                position={Position.Bottom}
                id="target-bottom"
                className={handleClass}
              />
            </>
          )}
        </>
      )}
      
      {!isFork && (
        <div className="flex items-center justify-center gap-2">
          {state.isSystemNode && (
            <Lock className="w-3 h-3 opacity-70" />
          )}
          <span className="font-medium text-sm">
            {state.label || state.id}
          </span>
        </div>
      )}

      {!isFork && hasSelfLoops && (
        <div className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 text-muted-foreground pointer-events-none">
          <Repeat className="h-3 w-3" />
        </div>
      )}
      
      {state.stereotype && state.stereotype !== state.id && (
        <div className="text-xs opacity-70 mt-1">
          «{state.stereotype}»
        </div>
      )}

      {!isFork && (
        <>
          {/* Source handles (outputs) - on all sides except for end nodes */}
          {!isEnd && (
            <>
              <Handle
                type="source"
                position={Position.Top}
                id="source-top"
                className={handleClass}
              />
              <Handle
                type="source"
                position={Position.Left}
                id="source-left"
                className={handleClass}
              />
              <Handle
                type="source"
                position={Position.Right}
                id="source-right"
                className={handleClass}
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id="source-bottom"
                className={handleClass}
              />
            </>
          )}
        </>
      )}
    </div>
  );
});

StateNodeComponent.displayName = 'StateNodeComponent';
