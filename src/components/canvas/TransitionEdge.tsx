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
  const offsetMultiplier = totalEdges > 1 ? (edgeIndex - (totalEdges - 1) / 2) : 0;
  const baseLoopSize = 70 + edgeIndex * 40 + Math.abs(manualCurveOffset);
  
  if (isSelfLoop) {
    const srcSide = sourceHandle?.replace('-source', '') || 'right';
    const tgtSide = targetHandle?.replace('-target', '') || 'right';
    
    // Same side loops: curve outward on that side
    if (srcSide === tgtSide) {
      const loopSize = baseLoopSize;
      let path: string;
      let labelX: number, labelY: number;
      
      switch (srcSide) {
        case 'right':
          path = `M ${sourceX} ${sourceY} C ${sourceX + loopSize} ${sourceY - loopSize/2}, ${sourceX + loopSize} ${targetY + loopSize/2}, ${targetX} ${targetY}`;
          labelX = sourceX + loopSize + 10;
          labelY = (sourceY + targetY) / 2;
          break;
        case 'left':
          path = `M ${sourceX} ${sourceY} C ${sourceX - loopSize} ${sourceY - loopSize/2}, ${sourceX - loopSize} ${targetY + loopSize/2}, ${targetX} ${targetY}`;
          labelX = sourceX - loopSize - 10;
          labelY = (sourceY + targetY) / 2;
          break;
        case 'top':
          path = `M ${sourceX} ${sourceY} C ${sourceX - loopSize/2} ${sourceY - loopSize}, ${targetX + loopSize/2} ${targetY - loopSize}, ${targetX} ${targetY}`;
          labelX = (sourceX + targetX) / 2;
          labelY = sourceY - loopSize - 10;
          break;
        case 'bottom':
          path = `M ${sourceX} ${sourceY} C ${sourceX - loopSize/2} ${sourceY + loopSize}, ${targetX + loopSize/2} ${targetY + loopSize}, ${targetX} ${targetY}`;
          labelX = (sourceX + targetX) / 2;
          labelY = sourceY + loopSize + 10;
          break;
        default:
          path = `M ${sourceX} ${sourceY} C ${sourceX + loopSize} ${sourceY - loopSize/2}, ${sourceX + loopSize} ${targetY + loopSize/2}, ${targetX} ${targetY}`;
          labelX = sourceX + loopSize + 10;
          labelY = (sourceY + targetY) / 2;
      }
      return { path, labelX, labelY };
    }
    
    // Cross-side loops: go around the block
    const arcSize = baseLoopSize * 1.2;
    let path: string;
    let labelX: number, labelY: number;
    
    // Left-Right or Right-Left: arc over/under the block
    if ((srcSide === 'left' && tgtSide === 'right') || (srcSide === 'right' && tgtSide === 'left')) {
      const goOver = manualCurveOffset >= 0;
      const yDir = goOver ? -1 : 1;
      path = `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + yDir * arcSize}, ${targetX} ${targetY + yDir * arcSize}, ${targetX} ${targetY}`;
      labelX = (sourceX + targetX) / 2;
      labelY = sourceY + yDir * (arcSize + 15);
    }
    // Top-Bottom or Bottom-Top: arc left/right of the block
    else if ((srcSide === 'top' && tgtSide === 'bottom') || (srcSide === 'bottom' && tgtSide === 'top')) {
      const goLeft = manualCurveOffset >= 0;
      const xDir = goLeft ? -1 : 1;
      path = `M ${sourceX} ${sourceY} C ${sourceX + xDir * arcSize} ${sourceY}, ${targetX + xDir * arcSize} ${targetY}, ${targetX} ${targetY}`;
      labelX = sourceX + xDir * (arcSize + 15);
      labelY = (sourceY + targetY) / 2;
    }
    // Adjacent sides (top-left, top-right, bottom-left, bottom-right): corner arc
    else {
      const ctrl1X = srcSide === 'left' ? sourceX - arcSize : srcSide === 'right' ? sourceX + arcSize : sourceX;
      const ctrl1Y = srcSide === 'top' ? sourceY - arcSize : srcSide === 'bottom' ? sourceY + arcSize : sourceY;
      const ctrl2X = tgtSide === 'left' ? targetX - arcSize : tgtSide === 'right' ? targetX + arcSize : targetX;
      const ctrl2Y = tgtSide === 'top' ? targetY - arcSize : tgtSide === 'bottom' ? targetY + arcSize : targetY;
      path = `M ${sourceX} ${sourceY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${targetX} ${targetY}`;
      labelX = (ctrl1X + ctrl2X) / 2;
      labelY = (ctrl1Y + ctrl2Y) / 2;
    }
    
    return { path, labelX, labelY };
  }

  // Non-self-loop: regular curved edge
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 1) {
    return { path: `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`, labelX: sourceX, labelY: sourceY };
  }
  
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  const autoOffset = offsetMultiplier * 60;
  const totalOffset = autoOffset + manualCurveOffset;
  const baseCurvature = Math.min(60, Math.max(25, distance * 0.15));
  const curvature = baseCurvature + Math.abs(totalOffset) * 0.5;
  const direction = totalOffset !== 0 ? Math.sign(totalOffset) : 1;
  
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const ctrlX = midX + perpX * curvature * direction;
  const ctrlY = midY + perpY * curvature * direction;
  
  const path = `M ${sourceX} ${sourceY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`;
  
  return { path, labelX: ctrlX, labelY: ctrlY };
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