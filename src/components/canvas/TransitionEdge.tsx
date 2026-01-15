import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { TransitionKind } from '@/types/diagram';

interface TransitionEdgeData {
  label?: string;
  kind: TransitionKind;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const TransitionEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as unknown as TransitionEdgeData | undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    edgeData?.onSelect?.(id);
  };

  const isEdgeSelected = selected || edgeData?.isSelected;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isEdgeSelected ? 'hsl(217, 91%, 50%)' : 'hsl(215, 16%, 47%)',
          strokeWidth: isEdgeSelected ? 2.5 : 2,
        }}
        markerEnd="url(#arrow)"
        interactionWidth={20}
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            onClick={handleClick}
            className={cn(
              'absolute px-2 py-1 rounded text-xs font-medium pointer-events-auto cursor-pointer transition-colors',
              'bg-card text-card-foreground border shadow-sm',
              isEdgeSelected && 'ring-2 ring-primary ring-offset-1'
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

TransitionEdge.displayName = 'TransitionEdge';
