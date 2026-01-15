import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { Transition, TransitionKind } from '@/types/diagram';

interface TransitionEdgeData {
  transition: Transition;
  isSelected: boolean;
  onSelect: (id: string) => void;
  edgeIndex?: number; // Index among edges with same source/target pair
  totalEdges?: number; // Total edges between same nodes
}

function getTransitionLabel(transition: Transition): string {
  // No label for end transitions (to InstrumentEnd or TopicEnd)
  if (transition.kind === 'endTopic' || transition.kind === 'endInstrument') {
    return '';
  }
  
  const parts: string[] = [];
  if (transition.revision) parts.push(transition.revision);
  if (transition.instrument) parts.push(transition.instrument);
  if (transition.topic) parts.push(transition.topic);
  parts.push(transition.messageType);
  parts.push(transition.flowType);
  return parts.join('.');
}

function isEndTransition(kind: TransitionKind): boolean {
  return kind === 'endTopic' || kind === 'endInstrument';
}

// Generate a curved path with offset support for multiple edges
function generateCurvedPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  isSelfLoop: boolean,
  edgeIndex: number = 0,
  totalEdges: number = 1
): { path: string; labelX: number; labelY: number } {
  // Calculate offset for multiple edges between same nodes
  const baseOffset = (edgeIndex - (totalEdges - 1) / 2) * 40;
  
  if (isSelfLoop) {
    // Self-loop: create a loop on the right side of the node
    // Offset each additional self-loop further out
    const loopSize = 50 + edgeIndex * 30;
    const loopOffset = edgeIndex * 20;
    const path = `M ${sourceX} ${sourceY} 
                  C ${sourceX + loopSize} ${sourceY - loopSize - loopOffset}, 
                    ${sourceX + loopSize} ${sourceY + loopSize + loopOffset}, 
                    ${targetX} ${targetY}`;
    return {
      path,
      labelX: sourceX + loopSize + 10,
      labelY: sourceY + loopOffset,
    };
  }

  // Calculate distance and midpoint
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular vector (normalized)
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Base curvature + offset for multiple edges
  const curvature = Math.min(50, Math.max(20, distance * 0.15)) + baseOffset;
  
  // Control point
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
  const edgeData = data as unknown as TransitionEdgeData | undefined;
  const transition = edgeData?.transition;
  const edgeIndex = edgeData?.edgeIndex ?? 0;
  const totalEdges = edgeData?.totalEdges ?? 1;
  
  const isSelfLoop = source === target;
  const { path: edgePath, labelX, labelY } = generateCurvedPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    isSelfLoop,
    edgeIndex,
    totalEdges
  );

  const label = transition ? getTransitionLabel(transition) : '';
  const isEndTrans = transition ? isEndTransition(transition.kind) : false;

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
          stroke: isEdgeSelected ? 'hsl(217, 91%, 50%)' : isEndTrans ? 'hsl(215, 16%, 60%)' : 'hsl(215, 16%, 47%)',
          strokeWidth: isEdgeSelected ? 2.5 : 2,
          strokeDasharray: isEndTrans ? '4 2' : undefined,
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
