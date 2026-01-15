import { useCallback, useMemo, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '@/store/diagramStore';
import { StateNodeComponent } from './StateNode';
import { TransitionEdge } from './TransitionEdge';

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

export function DiagramCanvas() {
  const {
    project,
    selectedElementId,
    selectedElementType,
    selectElement,
    addTransition,
    updateStatePosition,
  } = useDiagramStore();

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

  const initialEdges: Edge[] = useMemo(() => {
    if (!selectedTopicData) return [];
    return selectedTopicData.transitions.map((transition) => ({
      id: transition.id,
      source: transition.from,
      target: transition.to,
      type: 'transition',
      data: {
        label: transition.label,
        kind: transition.kind,
        isSelected: selectedElementId === transition.id && selectedElementType === 'transition',
        onSelect: handleEdgeSelect,
      },
    }));
  }, [selectedTopicData, selectedElementId, selectedElementType, handleEdgeSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes and edges when topic changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!project.selectedTopicId || !params.source || !params.target) return;
      addTransition(project.selectedTopicId, params.source, params.target);
    },
    [project.selectedTopicId, addTransition]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!project.selectedTopicId) return;
      updateStatePosition(project.selectedTopicId, node.id, node.position);
    },
    [project.selectedTopicId, updateStatePosition]
  );

  const onPaneClick = useCallback(() => {
    selectElement(null, null);
  }, [selectElement]);

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
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
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
    </div>
  );
}
