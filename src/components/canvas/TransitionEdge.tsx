import { memo, useState, useCallback, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  useReactFlow,
} from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { StateNode, Transition, TransitionKind } from '@/types/diagram';
import { isRoutingOnlyTransition } from '@/types/diagram';

interface TransitionEdgeData {
  transition: Transition;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdateRouting?: (curveOffset: number) => void;
  edgeIndex?: number;
  totalEdges?: number;
  sourceHandleId?: string;
  targetHandleId?: string;
}

// Direction vectors for each handle position
const HANDLE_DIRECTIONS: Record<string, { x: number; y: number }> = {
  'source-top': { x: 0, y: -1 },
  'source-bottom': { x: 0, y: 1 },
  'source-left': { x: -1, y: 0 },
  'source-right': { x: 1, y: 0 },
  'target-top': { x: 0, y: -1 },
  'target-bottom': { x: 0, y: 1 },
  'target-left': { x: -1, y: 0 },
  'target-right': { x: 1, y: 0 },
  'top': { x: 0, y: -1 },
  'bottom': { x: 0, y: 1 },
  'left': { x: -1, y: 0 },
  'right': { x: 1, y: 0 },
};

function getTransitionLabel(transition: Transition): string {
  // No label for end transitions
  if (transition.kind === 'endTopic' || transition.kind === 'endInstrument') {
    return '';
  }

  if (!transition.messageType || !transition.flowType) {
    return '';
  }
  
  const parts: string[] = [];
  if (transition.revision) parts.push(transition.revision);
  if (transition.instrument) parts.push(transition.instrument);
  if (transition.topic) parts.push(transition.topic);
  parts.push(transition.messageType);
  parts.push(transition.flowType);
  return parts.join(' / ');
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

// Generate self-loop path based on handle positions
function generateSelfLoopPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceHandle: string,
  targetHandle: string,
  edgeIndex: number = 0,
  manualCurveOffset: number = 0
): PathResult {
  const sourceDir = HANDLE_DIRECTIONS[sourceHandle] || HANDLE_DIRECTIONS['source-right'];
  const targetDir = HANDLE_DIRECTIONS[targetHandle] || HANDLE_DIRECTIONS['target-right'];
  
  const baseDistance = 80 + edgeIndex * 30;
  const offsetDistance = baseDistance + Math.abs(manualCurveOffset);
  
  // Control points extend outward from each handle position
  const ctrl1X = sourceX + sourceDir.x * offsetDistance;
  const ctrl1Y = sourceY + sourceDir.y * offsetDistance;
  
  const ctrl2X = targetX + targetDir.x * offsetDistance;
  const ctrl2Y = targetY + targetDir.y * offsetDistance;
  
  // For same-direction handles (e.g., top->top), create a loop in that direction
  // For opposite handles (e.g., top->bottom), shift control points laterally
  const isSameDirection = sourceDir.x === targetDir.x && sourceDir.y === targetDir.y;
  const isOpposite = sourceDir.x === -targetDir.x && sourceDir.y === -targetDir.y;
  
  let finalCtrl1X = ctrl1X;
  let finalCtrl1Y = ctrl1Y;
  let finalCtrl2X = ctrl2X;
  let finalCtrl2Y = ctrl2Y;
  
  if (isSameDirection) {
    // Same handle side: create a wide loop
    // Shift control points perpendicular to the direction
    const perpX = sourceDir.y; // perpendicular vector
    const perpY = -sourceDir.x;
    const spread = 40 + Math.abs(manualCurveOffset) * 0.5;
    const spreadDir = manualCurveOffset >= 0 ? 1 : -1;
    
    finalCtrl1X = ctrl1X + perpX * spread * spreadDir;
    finalCtrl1Y = ctrl1Y + perpY * spread * spreadDir;
    finalCtrl2X = ctrl2X - perpX * spread * spreadDir;
    finalCtrl2Y = ctrl2Y - perpY * spread * spreadDir;
  } else if (isOpposite) {
    // Opposite handles (top->bottom, left->right): arc around one side
    // Use curveOffset sign to determine which side
    const isVertical = sourceDir.x === 0;
    const sideOffset = offsetDistance * 0.8;
    const sideDir = manualCurveOffset >= 0 ? 1 : -1;
    
    if (isVertical) {
      // top-bottom: go left or right
      finalCtrl1X = sourceX + sideOffset * sideDir;
      finalCtrl2X = targetX + sideOffset * sideDir;
    } else {
      // left-right: go up or down
      finalCtrl1Y = sourceY + sideOffset * sideDir;
      finalCtrl2Y = targetY + sideOffset * sideDir;
    }
  }
  // Adjacent handles work well with the default outward control points
  
  const path = `M ${sourceX} ${sourceY} C ${finalCtrl1X} ${finalCtrl1Y}, ${finalCtrl2X} ${finalCtrl2Y}, ${targetX} ${targetY}`;
  
  // Label at curve midpoint (t=0.5 on cubic bezier)
  const t = 0.5;
  const mt = 1 - t;
  const labelX = mt*mt*mt*sourceX + 3*mt*mt*t*finalCtrl1X + 3*mt*t*t*finalCtrl2X + t*t*t*targetX;
  const labelY = mt*mt*mt*sourceY + 3*mt*mt*t*finalCtrl1Y + 3*mt*t*t*finalCtrl2Y + t*t*t*targetY;
  
  // Control point for dragging (use midpoint between ctrl1 and ctrl2)
  const ctrlX = (finalCtrl1X + finalCtrl2X) / 2;
  const ctrlY = (finalCtrl1Y + finalCtrl2Y) / 2;
  
  return { path, labelX, labelY, ctrlX, ctrlY };
}

// Generate path with handle-aware cubic Bezier for all edges
function generatePath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  isSelfLoop: boolean,
  edgeIndex: number = 0,
  totalEdges: number = 1,
  manualCurveOffset: number = 0,
  sourceHandle?: string,
  targetHandle?: string
): PathResult {
  // For self-loops, use handle-aware path generation
  if (isSelfLoop) {
    return generateSelfLoopPath(
      sourceX, sourceY, targetX, targetY,
      sourceHandle || 'source-right',
      targetHandle || 'target-right',
      edgeIndex,
      manualCurveOffset
    );
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

  // Get handle direction vectors (default: exit bottom, enter top)
  const sourceDir = HANDLE_DIRECTIONS[sourceHandle || 'source-bottom'] || { x: 0, y: 1 };
  const targetDir = HANDLE_DIRECTIONS[targetHandle || 'target-top'] || { x: 0, y: -1 };
  
  // Calculate offset multiplier for multiple edges
  const offsetMultiplier = totalEdges > 1 ? (edgeIndex - (totalEdges - 1) / 2) : 0;
  const autoOffset = offsetMultiplier * 40;
  const totalOffset = autoOffset + manualCurveOffset;
  
  // Control distance scales with edge distance
  const baseControlDist = Math.min(120, Math.max(50, distance * 0.4));
  
  // Control point 1: extends from source in handle direction
  let ctrl1X = sourceX + sourceDir.x * baseControlDist;
  let ctrl1Y = sourceY + sourceDir.y * baseControlDist;
  
  // Control point 2: extends from target in handle direction
  let ctrl2X = targetX + targetDir.x * baseControlDist;
  let ctrl2Y = targetY + targetDir.y * baseControlDist;
  
  // Apply perpendicular offset for manual curve control and multiple edges
  const perpX = -dy / distance;
  const perpY = dx / distance;
  
  ctrl1X += perpX * totalOffset;
  ctrl1Y += perpY * totalOffset;
  ctrl2X += perpX * totalOffset;
  ctrl2Y += perpY * totalOffset;
  
  // Cubic Bezier path
  const path = `M ${sourceX} ${sourceY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${targetX} ${targetY}`;
  
  // Label at curve midpoint (t=0.5 on cubic bezier)
  const t = 0.5;
  const mt = 1 - t;
  const labelX = mt*mt*mt*sourceX + 3*mt*mt*t*ctrl1X + 3*mt*t*t*ctrl2X + t*t*t*targetX;
  const labelY = mt*mt*mt*sourceY + 3*mt*mt*t*ctrl1Y + 3*mt*t*t*ctrl2Y + t*t*t*targetY;
  
  // Control point for dragging (use midpoint between ctrl1 and ctrl2)
  const ctrlX = (ctrl1X + ctrl2X) / 2;
  const ctrlY = (ctrl1Y + ctrl2Y) / 2;
  
  return {
    path,
    labelX,
    labelY,
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
  const sourceHandleId = edgeData?.sourceHandleId;
  const targetHandleId = edgeData?.targetHandleId;
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(manualCurveOffset);
  const { screenToFlowPosition, getNode } = useReactFlow();
  
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
    currentOffset,
    sourceHandleId,
    targetHandleId
  );

  const targetNode = getNode(target);
  const targetState = targetNode?.data?.state as StateNode | undefined;
  const isIncomingToFork = transition ? isRoutingOnlyTransition(transition, targetState) : false;
  const label = transition && !isIncomingToFork ? getTransitionLabel(transition) : '';
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
