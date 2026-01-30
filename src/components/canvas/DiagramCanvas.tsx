import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  MarkerType,
  NodeTypes,
  EdgeTypes,
  OnEdgesChange,
  EdgeChange,
  reconnectEdge,
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
  OnNodesChange,
  XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '@/store/diagramStore';
import { StateNodeComponent } from './StateNode';
import { TransitionEdge } from './TransitionEdge';
import { NewTransitionDialog } from './NewTransitionDialog';
import { NewStateDialog } from './NewStateDialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Plus } from 'lucide-react';
import type { FlowType, StateNode as StateNodeType } from '@/types/diagram';

const nodeTypes: NodeTypes = {
  stateNode: StateNodeComponent as any,
};

const edgeTypes: EdgeTypes = {
  transition: TransitionEdge as any,
};

const defaultEdgeOptions = {
  type: 'transition',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: 'hsl(215, 16%, 47%)',
  },
};

interface PendingConnection {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Compute edge indices for multiple edges between same node pairs
function computeEdgeIndices(transitions: { id: string; from: string; to: string }[]): Map<string, { index: number; total: number }> {
  // Group edges by normalized source-target pair (treat A->B and B->A as same group for bidirectional)
  const pairGroups = new Map<string, string[]>();
  
  transitions.forEach(t => {
    // For self-loops, use just the node id
    const key = t.from === t.to 
      ? `self:${t.from}` 
      : [t.from, t.to].sort().join(':');
    
    if (!pairGroups.has(key)) {
      pairGroups.set(key, []);
    }
    pairGroups.get(key)!.push(t.id);
  });
  
  const result = new Map<string, { index: number; total: number }>();
  
  pairGroups.forEach((edgeIds) => {
    edgeIds.forEach((id, index) => {
      result.set(id, { index, total: edgeIds.length });
    });
  });
  
  return result;
}

function DiagramCanvasInner() {
  // Use selectors for reactive access
  const project = useDiagramStore(s => s.getActiveProject());
  const selectedElementId = useDiagramStore(s => s.selectedElementId);
  const selectedElementType = useDiagramStore(s => s.selectedElementType);
  const selectElement = useDiagramStore(s => s.selectElement);
  const addTransition = useDiagramStore(s => s.addTransition);
  const updateTransition = useDiagramStore(s => s.updateTransition);
  const updateTransitionRouting = useDiagramStore(s => s.updateTransitionRouting);
  const deleteTransition = useDiagramStore(s => s.deleteTransition);
  const deleteState = useDiagramStore(s => s.deleteState);
  const updateStatePosition = useDiagramStore(s => s.updateStatePosition);
  const addState = useDiagramStore(s => s.addState);
  const addFork = useDiagramStore(s => s.addFork);
  const fieldConfig = useDiagramStore(s => s.fieldConfig);
  const transitionVisibility = useDiagramStore(s => s.transitionVisibility);

  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newStateDialogOpen, setNewStateDialogOpen] = useState(false);
  const [newStatePosition, setNewStatePosition] = useState<XYPosition>({ x: 0, y: 0 });
  const [teleportAnchors, setTeleportAnchors] = useState<Record<string, { in: XYPosition; out: XYPosition }>>({});
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { getNodes, screenToFlowPosition } = useReactFlow();

  const selectedTopicData = useMemo(() => {
    if (!project?.selectedTopicId) return null;
    return project.topics.find(t => t.topic.id === project.selectedTopicId) ?? null;
  }, [project?.selectedTopicId, project?.topics]);

  const pendingSourceLabel = useMemo(() => {
    if (!pendingConnection) return '';
    if (!selectedTopicData) return pendingConnection.source;
    return selectedTopicData.states.find(state => state.id === pendingConnection.source)?.label ?? pendingConnection.source;
  }, [pendingConnection, selectedTopicData]);

  const pendingTargetLabel = useMemo(() => {
    if (!pendingConnection) return '';
    if (!selectedTopicData) return pendingConnection.target;
    return selectedTopicData.states.find(state => state.id === pendingConnection.target)?.label ?? pendingConnection.target;
  }, [pendingConnection, selectedTopicData]);

  const flowTypeMarkers = useMemo(() => {
    return Object.entries(fieldConfig.flowTypeColors ?? {});
  }, [fieldConfig.flowTypeColors]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    selectElement(nodeId, 'state');
  }, [selectElement]);

  const handleEdgeSelect = useCallback((edgeId: string) => {
    selectElement(edgeId, 'transition');
  }, [selectElement]);

  const initialNodes: Node[] = useMemo(() => {
    if (!selectedTopicData) return [];
    const selfLoopLookup = new Map<string, boolean>();
    selectedTopicData.transitions.forEach((transition) => {
      if (transition.from === transition.to) {
        selfLoopLookup.set(transition.from, true);
      }
    });
    return selectedTopicData.states
      .filter((state) => state.systemNodeType !== 'TopicEnd' && state.systemNodeType !== 'InstrumentEnd')
      .map((state) => ({
        id: state.id,
        type: 'stateNode',
        position: state.position,
        data: {
          state,
          isSelected: selectedElementId === state.id && selectedElementType === 'state',
          isConnecting,
          hasSelfLoops: selfLoopLookup.get(state.id) ?? false,
          onSelect: handleNodeSelect,
        },
      }));
  }, [selectedTopicData, selectedElementId, selectedElementType, handleNodeSelect, isConnecting, transitionVisibility]);

  // Compute edge indices for proper offset rendering
  const edgeIndices = useMemo(() => {
    if (!selectedTopicData) return new Map();
    return computeEdgeIndices(selectedTopicData.transitions);
  }, [selectedTopicData]);

  const buildTeleportAnchors = useCallback((source: XYPosition, target: XYPosition) => {
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy);
    const separation = 60;
    const offset = 18;

    if (distance < 1) {
      return {
        out: { x: midX - separation / 2, y: midY - offset },
        in: { x: midX + separation / 2, y: midY + offset },
      };
    }

    const ux = dx / distance;
    const uy = dy / distance;
    const perpX = -uy;
    const perpY = ux;

    return {
      out: {
        x: midX - ux * separation / 2 + perpX * offset,
        y: midY - uy * separation / 2 + perpY * offset,
      },
      in: {
        x: midX + ux * separation / 2 + perpX * offset,
        y: midY + uy * separation / 2 + perpY * offset,
      },
    };
  }, []);

  useEffect(() => {
    if (!selectedTopicData) return;
    setTeleportAnchors((prev) => {
      const next = { ...prev };
      const transitionIds = new Set(selectedTopicData.transitions.map((transition) => transition.id));

      Object.keys(next).forEach((transitionId) => {
        if (!transitionIds.has(transitionId)) {
          delete next[transitionId];
        }
      });

      if (Object.keys(next).length === 0) {
        const candidate = selectedTopicData.transitions.find(
          (transition) => transitionVisibility[transition.id] !== false
        );
        if (candidate) {
          const sourceState = selectedTopicData.states.find((state) => state.id === candidate.from);
          const targetState = selectedTopicData.states.find((state) => state.id === candidate.to);
          if (sourceState && targetState) {
            next[candidate.id] = buildTeleportAnchors(sourceState.position, targetState.position);
          }
        }
      }

      return next;
    });
  }, [selectedTopicData, transitionVisibility, buildTeleportAnchors]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!selectedTopicData) return [];
    return selectedTopicData.transitions
      .filter((transition) => transitionVisibility[transition.id] !== false)
      .map((transition) => {
      const indexInfo = edgeIndices.get(transition.id) ?? { index: 0, total: 1 };
      const sourceHandle = transition.sourceHandleId || 'source-bottom';
      const targetHandle = transition.targetHandleId || 'target-top';
      const isSelected = selectedElementId === transition.id && selectedElementType === 'transition';
      const teleportEnabled = transition.teleportEnabled === true;
      const sourceState = selectedTopicData.states.find((state) => state.id === transition.from);
      const targetState = selectedTopicData.states.find((state) => state.id === transition.to);
      const fallbackAnchors = teleportEnabled && sourceState && targetState
        ? buildTeleportAnchors(sourceState.position, targetState.position)
        : undefined;
      const teleportAnchorIn = teleportEnabled ? teleportAnchors[transition.id]?.in : undefined;
      const teleportAnchorOut = teleportEnabled ? teleportAnchors[transition.id]?.out : undefined;
      return {
        id: transition.id,
        source: transition.from,
        target: transition.to,
        sourceHandle,
        targetHandle,
        type: 'transition',
        zIndex: isSelected ? 10 : 0,
        data: {
          transition,
          isSelected,
          onSelect: handleEdgeSelect,
          onUpdateRouting: (curveOffset: number) => {
            if (project?.selectedTopicId) {
              updateTransitionRouting(project.selectedTopicId, transition.id, undefined, undefined, curveOffset);
            }
          },
          edgeIndex: indexInfo.index,
          totalEdges: indexInfo.total,
          sourceHandleId: sourceHandle,
          targetHandleId: targetHandle,
          ...(teleportEnabled
            ? {
                teleportAnchorIn,
                teleportAnchorOut,
              }
            : {}),
          onUpdateTeleportAnchor: (anchorType: 'in' | 'out', position: XYPosition) => {
            setTeleportAnchors((prev) => ({
              ...prev,
              [transition.id]: {
                ...(prev[transition.id] ?? fallbackAnchors ?? { in: position, out: position }),
                [anchorType]: position,
              },
            }));
          },
        },
      };
    });
  }, [selectedTopicData, selectedElementId, selectedElementType, handleEdgeSelect, edgeIndices, project?.selectedTopicId, transitionVisibility, updateTransitionRouting, teleportAnchors, buildTeleportAnchors]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes and edges when topic changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle keyboard shortcuts for bulk delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!project.selectedTopicId) return;
      
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        
        // Get all selected nodes and edges from React Flow
        const currentNodes = getNodes();
        const selectedNodes = currentNodes.filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);
        
        // Delete selected transitions
        selectedEdges.forEach(edge => {
          deleteTransition(project!.selectedTopicId!, edge.id);
        });
        
        // Delete selected states (will also remove connected transitions)
        selectedNodes.forEach(node => {
          deleteState(project!.selectedTopicId!, node.id);
        });
        
        // Clear selection if anything was deleted
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          selectElement(null, null);
        } else if (selectedElementId) {
          // Fallback for single selection via inspector
          if (selectedElementType === 'transition') {
            deleteTransition(project!.selectedTopicId!, selectedElementId);
          } else if (selectedElementType === 'state') {
            deleteState(project!.selectedTopicId!, selectedElementId);
          }
          selectElement(null, null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project?.selectedTopicId, selectedElementId, selectedElementType, deleteTransition, deleteState, selectElement, getNodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!project?.selectedTopicId || !params.source || !params.target || !selectedTopicData) return;
      
      const targetState = selectedTopicData.states.find(s => s.id === params.target);
      const sourceState = selectedTopicData.states.find(s => s.id === params.source);
      const isTargetFork = targetState?.systemNodeType === 'Fork';
      const isSourceFork = sourceState?.systemNodeType === 'Fork';
      
      if (isTargetFork) {
        // Auto-create transition without dialog - incoming fork transitions are routing-only
        const transitionId = addTransition(
          project.selectedTopicId,
          params.source,
          params.target,
          undefined,
          undefined,
          params.sourceHandle || 'source-bottom',
          params.targetHandle || 'target-top'
        );
        selectElement(transitionId, 'transition');
      } else if (isSourceFork) {
        // Always prompt for outgoing fork transitions
        setPendingConnection({ 
          source: params.source, 
          target: params.target,
          sourceHandle: params.sourceHandle || 'source-bottom',
          targetHandle: params.targetHandle || 'target-top',
        });
      } else {
        // Open dialog to collect transition details
        setPendingConnection({ 
          source: params.source, 
          target: params.target,
          sourceHandle: params.sourceHandle || 'source-bottom',
          targetHandle: params.targetHandle || 'target-top',
        });
      }
    },
    [project?.selectedTopicId, selectedTopicData, addTransition, selectElement]
  );

  const handleCreateTransition = useCallback(
    (messageType: string, flowType: FlowType, revision?: string, instrument?: string, topic?: string) => {
      if (!project?.selectedTopicId || !pendingConnection) return;
      const transitionId = addTransition(
        project.selectedTopicId, 
        pendingConnection.source, 
        pendingConnection.target, 
        messageType, 
        flowType,
        pendingConnection.sourceHandle,
        pendingConnection.targetHandle,
        revision,
        instrument,
        topic
      );
      setPendingConnection(null);
      // Select the new transition
      selectElement(transitionId, 'transition');
    },
    [project?.selectedTopicId, pendingConnection, addTransition, selectElement]
  );

  const handleCancelTransition = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // Handle drag stop for single node or selection
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      if (!project?.selectedTopicId) return;
      // Update positions for all dragged nodes (supports bulk move)
      draggedNodes.forEach(n => {
        updateStatePosition(project.selectedTopicId!, n.id, n.position);
      });
    },
    [project?.selectedTopicId, updateStatePosition]
  );

  const onPaneClick = useCallback(() => {
    selectElement(null, null);
  }, [selectElement]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (event.altKey) {
        event.stopPropagation();
        const overlappingEdges = edges.filter((candidate) => (
          candidate.source === edge.source &&
          candidate.target === edge.target &&
          (candidate.sourceHandle ?? null) === (edge.sourceHandle ?? null) &&
          (candidate.targetHandle ?? null) === (edge.targetHandle ?? null)
        ));

        if (overlappingEdges.length > 1) {
          const currentIndex = overlappingEdges.findIndex((candidate) => candidate.id === edge.id);
          const nextEdge = overlappingEdges[(currentIndex + 1) % overlappingEdges.length];

          setEdges((prevEdges) =>
            prevEdges.map((prevEdge) => ({
              ...prevEdge,
              selected: prevEdge.id === nextEdge.id,
            }))
          );
          setNodes((prevNodes) => prevNodes.map((node) => ({ ...node, selected: false })));
          selectElement(nextEdge.id, 'transition');
          return;
        }
      }

      handleEdgeSelect(edge.id);
    },
    [edges, handleEdgeSelect, selectElement, setEdges, setNodes]
  );

  // Connection mode handlers
  const onConnectStart = useCallback(() => {
    setIsConnecting(true);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnecting(false);
  }, []);

  // Context menu handler for new state
  const handleContextMenuNewState = useCallback((e: React.MouseEvent) => {
    if (!project?.selectedTopicId || !reactFlowWrapper.current) return;
    
    const position = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    setNewStatePosition(position);
    setNewStateDialogOpen(true);
  }, [project?.selectedTopicId, screenToFlowPosition]);

  const handleCreateState = useCallback((label: string) => {
    if (!project?.selectedTopicId) return;
    addState(project.selectedTopicId, label, newStatePosition);
    setNewStateDialogOpen(false);
  }, [project?.selectedTopicId, addState, newStatePosition]);

  const handleContextMenuNewFork = useCallback((e: React.MouseEvent) => {
    if (!project?.selectedTopicId) return;
    const position = screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    addFork(project.selectedTopicId, position);
  }, [project?.selectedTopicId, addFork, screenToFlowPosition]);

  // Handle edge reconnection (detach and reattach to different nodes)
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!project?.selectedTopicId || !newConnection.source || !newConnection.target) return;
      
      // Update the transition in the store with new source/target and handle IDs
      updateTransition(project.selectedTopicId, oldEdge.id, {
        from: newConnection.source,
        to: newConnection.target,
      });
      
      // Also update the handle IDs
      updateTransitionRouting(
        project.selectedTopicId,
        oldEdge.id,
        newConnection.sourceHandle || undefined,
        newConnection.targetHandle || undefined
      );
      
      // Update local edges state
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [project?.selectedTopicId, updateTransition, updateTransitionRouting, setEdges]
  );

  // Custom edges change handler to sync deletions with store
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      
      // Handle edge removals - sync with store
      changes.forEach((change) => {
        if (change.type === 'remove' && project?.selectedTopicId) {
          deleteTransition(project.selectedTopicId, change.id);
        }
      });
    },
    [onEdgesChange, project?.selectedTopicId, deleteTransition]
  );

  if (!selectedTopicData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No topic selected</p>
          <p className="text-sm mt-1">Create or select a topic from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full" ref={reactFlowWrapper}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={onConnect}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onReconnect={onReconnect}
              onNodeDragStop={onNodeDragStop}
              onPaneClick={onPaneClick}
              onEdgeClick={onEdgeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              defaultEdgeOptions={defaultEdgeOptions}
              fitView
              proOptions={{ hideAttribution: true }}
              edgesReconnectable
              elevateEdgesOnSelect
              reconnectRadius={10}
              selectionOnDrag
              selectNodesOnDrag
              multiSelectionKeyCode="Shift"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls />
              <MiniMap 
                nodeStrokeWidth={3}
                pannable
                zoomable
              />
              <svg>
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path
                      d="M 0 0 L 10 5 L 0 10 z"
                      fill="hsl(215, 16%, 47%)"
                    />
                  </marker>
                  {flowTypeMarkers.map(([flowType, color]) => (
                    <marker
                      key={flowType}
                      id={`arrow-${flowType}`}
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path
                        d="M 0 0 L 10 5 L 0 10 z"
                        fill={color}
                      />
                    </marker>
                  ))}
                </defs>
              </svg>
            </ReactFlow>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleContextMenuNewState}>
            <Plus className="h-4 w-4 mr-2" />
            New State
          </ContextMenuItem>
          <ContextMenuItem onClick={handleContextMenuNewFork}>
            <Plus className="h-4 w-4 mr-2" />
            New Fork
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <NewTransitionDialog
        open={pendingConnection !== null}
        onOpenChange={(open) => !open && handleCancelTransition()}
        source={pendingSourceLabel}
        target={pendingTargetLabel}
        onConfirm={handleCreateTransition}
      />

      <NewStateDialog
        open={newStateDialogOpen}
        onOpenChange={setNewStateDialogOpen}
        onConfirm={handleCreateState}
      />
    </div>
  );
}

// Wrap with provider for useReactFlow hook
export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner />
    </ReactFlowProvider>
  );
}
