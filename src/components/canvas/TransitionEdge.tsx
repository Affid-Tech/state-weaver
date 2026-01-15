import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { Transition, TransitionKind } from '@/types/diagram';

interface TransitionEdgeData {
  transition: Transition;
  isSelected: boolean;
  onSelect: (id: string) => void;
  edgeIndex?: number;
  totalEdges?: number;
  curveOffset?: number;
}

function getTransitionLabel(transition: Transition): string {
  // No label for end transitions
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

// Generate path with better separation for multiple edges
function generatePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
  isSelfLoop: boolean,
  edgeIndex: number = 0,
  totalEdges: number = 1,
  manualCurveOffset: number = 0
): { path: string; labelX: number; labelY: number } {
  // Calculate offset multiplier - spread edges apart, plus manual offset
  const offsetMultiplier = totalEdges > 1 ? (edgeIndex - (totalEdges - 1) / 2) : 0;
  const baseOffset = offsetMultiplier * 60 + manualCurveOffset; // Add manual curve offset
  
  if (isSelfLoop) {
    // Self-loop: create distinctive loops on the right side
    // Each loop gets progressively larger and more offset, plus manual adjustment
    const loopWidth = 80 + edgeIndex * 50 + Math.abs(manualCurveOffset);
    const loopHeight = 60 + edgeIndex * 40;
    const verticalOffset = edgeIndex * 25 + manualCurveOffset * 0.5;
    
    // Start from right side of node, loop out and back
    const path = `M ${sourceX} ${sourceY} 
                  C ${sourceX + loopWidth} ${sourceY - loopHeight - verticalOffset}, 
                    ${sourceX + loopWidth} ${sourceY + loopHeight + verticalOffset}, 
                    ${targetX} ${targetY}`;
    
    return {
      path,
      labelX: sourceX + loopWidth + 15,
      labelY: sourceY + verticalOffset,
    };
  }

  // Calculate direction vector
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 1) {
    return { path: `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`, labelX: sourceX, labelY: sourceY };
  }
  
  // Perpendicular vector for offset
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Calculate total offset: auto offset for multiple edges + manual offset
  // Manual offset directly controls direction (negative = flip side)
  const autoOffset = offsetMultiplier * 60;
  const totalOffset = autoOffset + manualCurveOffset;
  
  // Base curvature that scales with distance
  const baseCurvature = Math.min(60, Math.max(25, distance * 0.15));
  
  // Final curvature: base + absolute offset value, direction from sign
  const curvature = baseCurvature + Math.abs(totalOffset) * 0.5;
  const direction = totalOffset !== 0 ? Math.sign(totalOffset) : 1;
  
  // Control point
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const ctrlX = midX + perpX * curvature * direction;
  const ctrlY = midY + perpY * curvature * direction;
  
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
  sourceHandleId,
  targetHandleId,
  data,
  selected,
}: EdgeProps) => {
  const edgeData = data as unknown as TransitionEdgeData | undefined;
  const transition = edgeData?.transition;
  const edgeIndex = edgeData?.edgeIndex ?? 0;
  const totalEdges = edgeData?.totalEdges ?? 1;
  const manualCurveOffset = transition?.curveOffset ?? 0;
  
  const isSelfLoop = source === target;
  const { path: edgePath, labelX, labelY } = generatePath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceHandleId,
    targetHandleId,
    isSelfLoop,
    edgeIndex,
    totalEdges,
    manualCurveOffset
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