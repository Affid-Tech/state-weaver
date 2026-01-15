import { useCallback, useMemo, useEffect, useState } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '@/store/diagramStore';
import { StateNodeComponent } from './StateNode';
import { TransitionEdge } from './TransitionEdge';
import { NewTransitionDialog } from './NewTransitionDialog';
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
  const {
    project,
    selectedElementId,
    selectedElementType,
    selectElement,
    addTransition,
    updateTransition,
    updateTransitionRouting,
    deleteTransition,
    deleteState,
    updateStatePosition,
  } = useDiagramStore();

  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const { getNodes } = useReactFlow();

  const selectedTopicData = useMemo(() => {
    if (!project.selectedTopicId) return null;
    return project.topics.find(t => t.topic.id === project.selectedTopicId) ?? null;
  }, [project.selectedTopicId, project.topics]);

  const handleNodeSelect = useCallback((nodeId: string) => {
    selectElement(nodeId, 'state');
  }, [selectElement]);

  const handleEdgeSelect = useCallback((edgeId: string) => {
    selectElement(edgeId, 'transition');
  }, [selectElement]);

  const initialNodes: Node[] = useMemo(() => {
    if (!selectedTopicData) return [];
    return selectedTopicData.states.map((state) => ({
      id: state.id,
      type: 'stateNode',
      position: state.position,
      data: {
        state,
        isSelected: selectedElementId === state.id && selectedElementType === 'state',
        onSelect: handleNodeSelect,
      },
    }));
  }, [selectedTopicData, selectedElementId, selectedElementType, handleNodeSelect]);

  // Compute edge indices for proper offset rendering
  const edgeIndices = useMemo(() => {
    if (!selectedTopicData) return new Map();
    return computeEdgeIndices(selectedTopicData.transitions);
  }, [selectedTopicData]);

  const initialEdges: Edge[] = useMemo(() => {
    if (!selectedTopicData) return [];
    return selectedTopicData.transitions.map((transition) => {
      const indexInfo = edgeIndices.get(transition.id) ?? { index: 0, total: 1 };
      return {
        id: transition.id,
        source: transition.from,
        target: transition.to,
        sourceHandle: transition.sourceHandleId || 'source-bottom',
        targetHandle: transition.targetHandleId || 'target-top',
        type: 'transition',
        data: {
          transition,
          isSelected: selectedElementId === transition.id && selectedElementType === 'transition',
          onSelect: handleEdgeSelect,
          edgeIndex: indexInfo.index,
          totalEdges: indexInfo.total,
        },
      };
    });
  }, [selectedTopicData, selectedElementId, selectedElementType, handleEdgeSelect, edgeIndices]);

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
          deleteTransition(project.selectedTopicId!, edge.id);
        });
        
        // Delete selected states (will also remove connected transitions)
        selectedNodes.forEach(node => {
          deleteState(project.selectedTopicId!, node.id);
        });
        
        // Clear selection if anything was deleted
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          selectElement(null, null);
        } else if (selectedElementId) {
          // Fallback for single selection via inspector
          if (selectedElementType === 'transition') {
            deleteTransition(project.selectedTopicId, selectedElementId);
          } else if (selectedElementType === 'state') {
            deleteState(project.selectedTopicId, selectedElementId);
          }
          selectElement(null, null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.selectedTopicId, selectedElementId, selectedElementType, deleteTransition, deleteState, selectElement, getNodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!project.selectedTopicId || !params.source || !params.target || !selectedTopicData) return;
      
      // Check if target is an end node (TopicEnd or InstrumentEnd)
      const targetState = selectedTopicData.states.find(s => s.id === params.target);
      const isEndNode = targetState?.systemNodeType === 'TopicEnd' || targetState?.systemNodeType === 'InstrumentEnd';
      
      if (isEndNode) {
        // Auto-create transition without dialog - end transitions have no properties
        const transitionId = addTransition(
          project.selectedTopicId,
          params.source,
          params.target,
          '', // Empty messageType for end transitions
          'B2B', // Default flowType (not used for end transitions)
          params.sourceHandle || 'source-bottom',
          params.targetHandle || 'target-top'
        );
        selectElement(transitionId, 'transition');
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
    [project.selectedTopicId, selectedTopicData, addTransition, selectElement]
  );

  const handleCreateTransition = useCallback(
    (messageType: string, flowType: FlowType) => {
      if (!project.selectedTopicId || !pendingConnection) return;
      const transitionId = addTransition(
        project.selectedTopicId, 
        pendingConnection.source, 
        pendingConnection.target, 
        messageType, 
        flowType,
        pendingConnection.sourceHandle,
        pendingConnection.targetHandle
      );
      setPendingConnection(null);
      // Select the new transition
      selectElement(transitionId, 'transition');
    },
    [project.selectedTopicId, pendingConnection, addTransition, selectElement]
  );

  const handleCancelTransition = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // Handle drag stop for single node or selection
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      if (!project.selectedTopicId) return;
      // Update positions for all dragged nodes (supports bulk move)
      draggedNodes.forEach(n => {
        updateStatePosition(project.selectedTopicId!, n.id, n.position);
      });
    },
    [project.selectedTopicId, updateStatePosition]
  );

  const onPaneClick = useCallback(() => {
    selectElement(null, null);
  }, [selectElement]);

  // Handle edge reconnection (detach and reattach to different nodes)
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!project.selectedTopicId || !newConnection.source || !newConnection.target) return;
      
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
    [project.selectedTopicId, updateTransition, updateTransitionRouting, setEdges]
  );

  // Custom edges change handler to sync deletions with store
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      
      // Handle edge removals - sync with store
      changes.forEach((change) => {
        if (change.type === 'remove' && project.selectedTopicId) {
          deleteTransition(project.selectedTopicId, change.id);
        }
      });
    },
    [onEdgesChange, project.selectedTopicId, deleteTransition]
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
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
        edgesReconnectable
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
          </defs>
        </svg>
      </ReactFlow>

      <NewTransitionDialog
        open={pendingConnection !== null}
        onOpenChange={(open) => !open && handleCancelTransition()}
        source={pendingConnection?.source ?? ''}
        target={pendingConnection?.target ?? ''}
        onConfirm={handleCreateTransition}
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
