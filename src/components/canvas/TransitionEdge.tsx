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

// Estimate node size for self-loop calculations
const NODE_WIDTH = 120;
const NODE_HEIGHT = 50;

// Get offset direction based on handle side
function getHandleOffset(side: string): { dx: number; dy: number } {
  switch (side) {
    case 'top': return { dx: 0, dy: -NODE_HEIGHT / 2 };
    case 'bottom': return { dx: 0, dy: NODE_HEIGHT / 2 };
    case 'left': return { dx: -NODE_WIDTH / 2, dy: 0 };
    case 'right': return { dx: NODE_WIDTH / 2, dy: 0 };
    default: return { dx: NODE_WIDTH / 2, dy: 0 };
  }
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
  const baseLoopSize = 60 + edgeIndex * 35 + Math.abs(manualCurveOffset) * 0.5;
  
  if (isSelfLoop) {
    const srcSide = sourceHandle?.replace('-source', '') || 'right';
    const tgtSide = targetHandle?.replace('-target', '') || 'right';
    
    // Calculate actual edge start/end points at node boundary
    const srcOffset = getHandleOffset(srcSide);
    const tgtOffset = getHandleOffset(tgtSide);
    const startX = sourceX + srcOffset.dx;
    const startY = sourceY + srcOffset.dy;
    const endX = targetX + tgtOffset.dx;
    const endY = targetY + tgtOffset.dy;
    
    const loopSize = baseLoopSize;
    let path: string;
    let labelX: number, labelY: number;
    
    // Same side loops: curve outward on that side
    if (srcSide === tgtSide) {
      switch (srcSide) {
        case 'right':
          path = `M ${startX} ${startY} C ${startX + loopSize} ${startY - loopSize * 0.6}, ${endX + loopSize} ${endY + loopSize * 0.6}, ${endX} ${endY}`;
          labelX = startX + loopSize + 15;
          labelY = (startY + endY) / 2;
          break;
        case 'left':
          path = `M ${startX} ${startY} C ${startX - loopSize} ${startY - loopSize * 0.6}, ${endX - loopSize} ${endY + loopSize * 0.6}, ${endX} ${endY}`;
          labelX = startX - loopSize - 15;
          labelY = (startY + endY) / 2;
          break;
        case 'top':
          path = `M ${startX} ${startY} C ${startX - loopSize * 0.6} ${startY - loopSize}, ${endX + loopSize * 0.6} ${endY - loopSize}, ${endX} ${endY}`;
          labelX = (startX + endX) / 2;
          labelY = startY - loopSize - 15;
          break;
        case 'bottom':
          path = `M ${startX} ${startY} C ${startX - loopSize * 0.6} ${startY + loopSize}, ${endX + loopSize * 0.6} ${endY + loopSize}, ${endX} ${endY}`;
          labelX = (startX + endX) / 2;
          labelY = startY + loopSize + 15;
          break;
        default:
          path = `M ${startX} ${startY} C ${startX + loopSize} ${startY - loopSize * 0.6}, ${endX + loopSize} ${endY + loopSize * 0.6}, ${endX} ${endY}`;
          labelX = startX + loopSize + 15;
          labelY = (startY + endY) / 2;
      }
      return { path, labelX, labelY };
    }
    
    // Cross-side loops: go around the block
    const arcSize = loopSize * 1.3;
    
    // Left-Right or Right-Left: arc over/under the block
    if ((srcSide === 'left' && tgtSide === 'right') || (srcSide === 'right' && tgtSide === 'left')) {
      const goOver = manualCurveOffset >= 0;
      const yOffset = arcSize * (goOver ? -1 : 1);
      path = `M ${startX} ${startY} C ${startX} ${startY + yOffset}, ${endX} ${endY + yOffset}, ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = startY + yOffset + (goOver ? -15 : 15);
    }
    // Top-Bottom or Bottom-Top: arc left/right of the block
    else if ((srcSide === 'top' && tgtSide === 'bottom') || (srcSide === 'bottom' && tgtSide === 'top')) {
      const goLeft = manualCurveOffset >= 0;
      const xOffset = arcSize * (goLeft ? -1 : 1);
      path = `M ${startX} ${startY} C ${startX + xOffset} ${startY}, ${endX + xOffset} ${endY}, ${endX} ${endY}`;
      labelX = startX + xOffset + (goLeft ? -15 : 15);
      labelY = (startY + endY) / 2;
    }
    // Adjacent sides: corner arc curving outward
    else {
      const ctrl1X = srcSide === 'left' ? startX - arcSize : srcSide === 'right' ? startX + arcSize : startX;
      const ctrl1Y = srcSide === 'top' ? startY - arcSize : srcSide === 'bottom' ? startY + arcSize : startY;
      const ctrl2X = tgtSide === 'left' ? endX - arcSize : tgtSide === 'right' ? endX + arcSize : endX;
      const ctrl2Y = tgtSide === 'top' ? endY - arcSize : tgtSide === 'bottom' ? endY + arcSize : endY;
      path = `M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`;
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