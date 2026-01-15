import { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StateNode } from '@/types/diagram';

interface StateNodeData {
  state: StateNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

interface StateNodeProps {
  data: StateNodeData;
  id: string;
}

export const StateNodeComponent = memo(({ data, id }: StateNodeProps) => {
  const { state, isSelected, onSelect } = data;

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
        default:
          return 'bg-state text-state-foreground border-state-border';
      }
    }
    return 'bg-state text-state-foreground border-state-border';
  };

  const isStart = state.systemNodeType === 'TopicStart' || state.systemNodeType === 'NewInstrument';
  const isEnd = state.systemNodeType === 'TopicEnd' || state.systemNodeType === 'InstrumentEnd';

  return (
    <div
      onClick={handleClick}
      className={cn(
        'px-4 py-3 rounded-lg border-2 shadow-sm cursor-pointer transition-all min-w-[120px] text-center',
        getNodeStyle(),
        isSelected && 'ring-2 ring-state-selected-ring ring-offset-2 ring-offset-background'
      )}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-primary !border-background"
        />
      )}
      
      <div className="flex items-center justify-center gap-2">
        {state.isSystemNode && (
          <Lock className="w-3 h-3 opacity-70" />
        )}
        <span className="font-medium text-sm">
          {state.label || state.id}
        </span>
      </div>
      
      {state.stereotype && state.stereotype !== state.id && (
        <div className="text-xs opacity-70 mt-1">
          «{state.stereotype}»
        </div>
      )}

      {!isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-primary !border-background"
        />
      )}
    </div>
  );
});

StateNodeComponent.displayName = 'StateNodeComponent';
