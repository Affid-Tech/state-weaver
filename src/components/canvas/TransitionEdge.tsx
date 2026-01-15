import { memo, useState, useCallback, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  useReactFlow,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { Transition, TransitionKind } from '@/types/diagram';

interface TransitionEdgeData {
  transition: Transition;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdateRouting?: (curveOffset: number) => void;
  edgeIndex?: number;
  totalEdges?: number;
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

interface PathResult {
  path: string;
  labelX: number;
  labelY: number;
  ctrlX: number;
  ctrlY: number;
}

// Generate path with better separation for multiple edges
function generatePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  isSelfLoop: boolean,
  edgeIndex: number = 0,
  totalEdges: number = 1,
  manualCurveOffset: number = 0
): PathResult {
  // Calculate offset multiplier - spread edges apart, plus manual offset
  const offsetMultiplier = totalEdges > 1 ? (edgeIndex - (totalEdges - 1) / 2) : 0;
  
  if (isSelfLoop) {
    // Self-loop: create distinctive loops on the right side
    const loopWidth = 80 + edgeIndex * 50 + Math.abs(manualCurveOffset);
    const loopHeight = 60 + edgeIndex * 40;
    const verticalOffset = edgeIndex * 25 + manualCurveOffset * 0.5;
    
    const path = `M ${sourceX} ${sourceY} 
                  C ${sourceX + loopWidth} ${sourceY - loopHeight - verticalOffset}, 
                    ${sourceX + loopWidth} ${sourceY + loopHeight + verticalOffset}, 
                    ${targetX} ${targetY}`;
    
    const ctrlX = sourceX + loopWidth;
    const ctrlY = sourceY + verticalOffset;
    
    return {
      path,
      labelX: ctrlX + 15,
      labelY: ctrlY,
      ctrlX,
      ctrlY,
    };
  }

  // Calculate direction vector
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 1) {
    return { 
      path: `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`, 
      labelX: sourceX, 
      labelY: sourceY,
      ctrlX: sourceX,
      ctrlY: sourceY,
    };
  }
  
  // Perpendicular vector for offset
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Calculate total offset: auto offset for multiple edges + manual offset
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
    ctrlX,
    ctrlY,
  };
}

// Calculate curve offset from mouse position
function calculateOffsetFromPosition(
  mouseX: number,
  mouseY: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): number {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 1) return 0;
  
  // Perpendicular unit vector
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  // Vector from midpoint to mouse
  const toMouseX = mouseX - midX;
  const toMouseY = mouseY - midY;
  
  // Project onto perpendicular (dot product)
  return toMouseX * perpX + toMouseY * perpY;
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
  const manualCurveOffset = transition?.curveOffset ?? 0;
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(manualCurveOffset);
  const { screenToFlowPosition } = useReactFlow();
  
  // Sync dragOffset with stored value when not dragging
  useEffect(() => {
    if (!isDragging) {
      setDragOffset(manualCurveOffset);
    }
  }, [manualCurveOffset, isDragging]);
  
  const isSelfLoop = source === target;
  
  // Use dragOffset while dragging, otherwise use stored value
  const currentOffset = isDragging ? dragOffset : manualCurveOffset;
  
  const { path: edgePath, labelX, labelY, ctrlX, ctrlY } = generatePath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    isSelfLoop,
    edgeIndex,
    totalEdges,
    currentOffset
  );

  const label = transition ? getTransitionLabel(transition) : '';
  const isEndTrans = transition ? isEndTransition(transition.kind) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    edgeData?.onSelect?.(id);
  };

  const isEdgeSelected = selected || edgeData?.isSelected;

  // Drag handlers for control point
  const handleControlPointMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const flowPosition = screenToFlowPosition({ 
        x: moveEvent.clientX, 
        y: moveEvent.clientY 
      });
      
      const newOffset = calculateOffsetFromPosition(
        flowPosition.x,
        flowPosition.y,
        sourceX,
        sourceY,
        targetX,
        targetY
      );
      
      setDragOffset(newOffset);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Persist the final offset
      edgeData?.onUpdateRouting?.(dragOffset);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [screenToFlowPosition, sourceX, sourceY, targetX, targetY, edgeData, dragOffset]);

  // Effect to persist offset on drag end
  useEffect(() => {
    if (!isDragging && dragOffset !== manualCurveOffset) {
      edgeData?.onUpdateRouting?.(dragOffset);
    }
  }, [isDragging, dragOffset, manualCurveOffset, edgeData]);

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
      {/* Draggable control point - shown when selected */}
      {isEdgeSelected && !isEndTrans && (
        <EdgeLabelRenderer>
          <div
            onMouseDown={handleControlPointMouseDown}
            className={cn(
              'absolute w-4 h-4 rounded-full pointer-events-auto border-2 shadow-md transition-colors',
              'bg-primary border-primary-foreground',
              isDragging ? 'cursor-grabbing scale-125' : 'cursor-grab hover:scale-110'
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${ctrlX}px,${ctrlY}px)`,
            }}
            title="Drag to adjust curve"
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
});

TransitionEdge.displayName = 'TransitionEdge';
