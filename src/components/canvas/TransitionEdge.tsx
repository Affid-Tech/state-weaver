import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { Transition } from '@/types/diagram';

interface TransitionEdgeData {
  transition: Transition;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function getTransitionLabel(transition: Transition): string {
  const parts: string[] = [];
  if (transition.revision) parts.push(transition.revision);
  if (transition.instrument) parts.push(transition.instrument);
  if (transition.topic) parts.push(transition.topic);
  parts.push(transition.messageType);
  parts.push(transition.flowType);
  return parts.join('.');
}

// Generate a curved path that handles self-loops and bidirectional edges nicely
function generateCurvedPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  isSelfLoop: boolean
): { path: string; labelX: number; labelY: number } {
  if (isSelfLoop) {
    // Self-loop: create a loop on the right side of the node
    const loopSize = 60;
    const path = `M ${sourceX} ${sourceY} 
                  C ${sourceX + loopSize} ${sourceY - loopSize}, 
                    ${sourceX + loopSize} ${sourceY + loopSize}, 
                    ${targetX} ${targetY}`;
    return {
      path,
      labelX: sourceX + loopSize + 10,
      labelY: sourceY,
    };
  }

  // Calculate distance and midpoint
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate perpendicular offset for the curve
  // More offset for closer nodes to avoid overlap
  const curvature = Math.min(50, Math.max(20, distance * 0.15));
  
  // Perpendicular vector (normalized)
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Control point offset
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const ctrlX = midX + perpX * curvature;
  const ctrlY = midY + perpY * curvature;
  
  // Quadratic bezier curve
  const path = `M ${sourceX} ${sourceY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`;
  
  return {
    path,
    labelX: ctrlX,
    labelY: ctrlY,
  };
}

export const TransitionEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  target,
  data,
  selected,
}: EdgeProps) => {
  const isSelfLoop = source === target;
  const { path: edgePath, labelX, labelY } = generateCurvedPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    isSelfLoop
  );

  const edgeData = data as unknown as TransitionEdgeData | undefined;
  const transition = edgeData?.transition;
  const label = transition ? getTransitionLabel(transition) : '';

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
      {label && (
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
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

TransitionEdge.displayName = 'TransitionEdge';
