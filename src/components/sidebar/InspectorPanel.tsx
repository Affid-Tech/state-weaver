import { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { useDiagramStore } from '@/store/diagramStore';
import { validateProject } from '@/lib/validation';
import { cn } from '@/lib/utils';
import { getTopicEndKind } from '@/types/diagram';
import type { FlowType, Transition } from '@/types/diagram';

const DEFAULT_FLOW_TYPES: FlowType[] = ['B2B', 'B2C', 'C2B', 'C2C'];
const HANDLE_SIDES = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];



export function InspectorPanel() {
  // Use selectors for reactive access
  const project = useDiagramStore(s => s.getActiveProject());
  const selectedElementId = useDiagramStore(s => s.selectedElementId);
  const selectedElementType = useDiagramStore(s => s.selectedElementType);
  const fieldConfig = useDiagramStore(s => s.fieldConfig);
  const addState = useDiagramStore(s => s.addState);
  const addFork = useDiagramStore(s => s.addFork);
  const updateState = useDiagramStore(s => s.updateState);
  const deleteState = useDiagramStore(s => s.deleteState);
  const updateTransition = useDiagramStore(s => s.updateTransition);
  const updateTransitionRouting = useDiagramStore(s => s.updateTransitionRouting);
  const deleteTransition = useDiagramStore(s => s.deleteTransition);
  const getTransitionTeleportEnabled = useDiagramStore(s => s.getTransitionTeleportEnabled);
  const setTransitionTeleportEnabled = useDiagramStore(s => s.setTransitionTeleportEnabled);
  const selectElement = useDiagramStore(s => s.selectElement);
  const selectTopic = useDiagramStore(s => s.selectTopic);
  const transitionVisibility = useDiagramStore(s => s.transitionVisibility);
  const setTransitionVisibility = useDiagramStore(s => s.setTransitionVisibility);
  const setTransitionsVisibility = useDiagramStore(s => s.setTransitionsVisibility);

  // Derive available options from fieldConfig with fallbacks
  const revisionOptions = fieldConfig.revisions;
  const instrumentOptions = fieldConfig.instrumentTypes;
  const topicOptions = fieldConfig.topicTypes;
  const messageTypeOptions = fieldConfig.messageTypes;
  const flowTypeOptions = fieldConfig.flowTypes.length > 0 
    ? fieldConfig.flowTypes 
    : DEFAULT_FLOW_TYPES;

  const [isAddStateOpen, setIsAddStateOpen] = useState(false);
  const [newStateLabel, setNewStateLabel] = useState('');

  const selectedTopicData = useMemo(() => {
    if (!project?.selectedTopicId) return null;
    return project.topics.find(t => t.topic.id === project.selectedTopicId) ?? null;
  }, [project?.selectedTopicId, project?.topics]);

  const selectedState = useMemo(() => {
    if (!selectedTopicData || selectedElementType !== 'state' || !selectedElementId) return null;
    return selectedTopicData.states.find(s => s.id === selectedElementId) ?? null;
  }, [selectedTopicData, selectedElementType, selectedElementId]);

  const selectedTransition = useMemo(() => {
    if (!selectedTopicData || selectedElementType !== 'transition' || !selectedElementId) return null;
    return selectedTopicData.transitions.find(t => t.id === selectedElementId) ?? null;
  }, [selectedTopicData, selectedElementType, selectedElementId]);

  const transitionTeleportEnabled = useMemo(() => {
    if (!project?.selectedTopicId || !selectedTransition) return false;
    return getTransitionTeleportEnabled(project.selectedTopicId, selectedTransition.id);
  }, [getTransitionTeleportEnabled, project?.selectedTopicId, selectedTransition]);

  const selfLoopTransitions = useMemo(() => {
    if (!selectedTopicData || !selectedState) return [];
    return selectedTopicData.transitions.filter(
      transition => transition.from === selectedState.id && transition.to === selectedState.id
    );
  }, [selectedTopicData, selectedState]);

  const getTransitionMessageLabel = (transition: Transition) => {
    const parts: string[] = [];
    if (transition.revision) parts.push(transition.revision);
    if (transition.instrument) parts.push(transition.instrument);
    if (transition.topic) parts.push(transition.topic);
    if (transition.messageType) parts.push(transition.messageType);
    if (transition.flowType) parts.push(transition.flowType);
    return parts.length > 0 ? parts.join(' / ') : 'No message properties';
  };

  // Check if the selected state can be deleted (system nodes are protected except forks)
  const canDeleteSelectedState = useMemo(() => {
    if (!selectedState) return false;
    if (!selectedState.isSystemNode) return true;

    if (selectedState.systemNodeType === 'Fork') return true;

    // Cannot delete start nodes (TopicStart, NewInstrument)
    return false;
  }, [selectedState]);

  // Pass fieldConfig to validation
  const validationIssues = useMemo(() => project ? validateProject(project, fieldConfig) : [], [project, fieldConfig]);
  const errors = validationIssues.filter(i => i.level === 'error');
  const warnings = validationIssues.filter(i => i.level === 'warning');

  const handleAddState = () => {
    if (!project?.selectedTopicId || !newStateLabel.trim()) return;
    addState(project.selectedTopicId, newStateLabel.trim());
    setNewStateLabel('');
    setIsAddStateOpen(false);
  };

  const handleAddFork = () => {
    if (!project?.selectedTopicId) return;
    addFork(project.selectedTopicId);
  };

  const handleDeleteState = () => {
    if (!project?.selectedTopicId || !selectedElementId || selectedElementType !== 'state') return;
    if (!canDeleteSelectedState) return;
    deleteState(project.selectedTopicId, selectedElementId);
    selectElement(null, null);
  };

  const handleDeleteTransition = () => {
    if (!project?.selectedTopicId || !selectedElementId || selectedElementType !== 'transition') return;
    deleteTransition(project.selectedTopicId, selectedElementId);
    selectElement(null, null);
  };

  const handleIssueClick = (issue: typeof validationIssues[0]) => {
    if (issue.elementId && issue.elementType) {
      if (issue.topicId && issue.topicId !== project.selectedTopicId) {
        useDiagramStore.getState().selectTopic(issue.topicId);
      }
      selectElement(issue.elementId, issue.elementType);
    }
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col" data-tour="editor-inspector">
      <Tabs defaultValue="inspector" className="flex-1 flex flex-col">
        <TabsList className="m-2 grid grid-cols-2">
          <TabsTrigger value="inspector">Inspector</TabsTrigger>
          <TabsTrigger value="validation" className="relative">
            Validation
            {errors.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                {errors.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inspector" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
          <div className="p-4 border-b border-border space-y-2">
            <Dialog open={isAddStateOpen} onOpenChange={setIsAddStateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" disabled={!project.selectedTopicId} data-tour="editor-inspector-add-state">
                  <Plus className="h-4 w-4 mr-2" />
                  Add State
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add State</DialogTitle>
                  <DialogDescription>
                    Create a new state in the current topic.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>State Label *</Label>
                    <Input
                      value={newStateLabel}
                      onChange={(e) => setNewStateLabel(e.target.value)}
                      placeholder="e.g., Payment Submitted"
                      data-tour="editor-add-state-label"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddStateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddState} disabled={!newStateLabel.trim()} data-tour="editor-add-state-confirm">
                    Add State
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              className="w-full" 
              disabled={!project.selectedTopicId}
              onClick={handleAddFork}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Fork
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {selectedState && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">State Properties</h3>
                    {canDeleteSelectedState && (
                      <Button size="sm" variant="destructive" onClick={handleDeleteState}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Label *</Label>
                    <Input
                      value={selectedState.label || ''}
                      disabled={selectedState.isSystemNode}
                      onChange={(e) => {
                        if (project.selectedTopicId && e.target.value.trim()) {
                          updateState(project.selectedTopicId, selectedState.id, { label: e.target.value });
                        }
                      }}
                      placeholder="State label (required)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Stereotype</Label>
                    <Input
                      value={selectedState.stereotype || ''}
                      disabled={selectedState.isSystemNode}
                      onChange={(e) => {
                        if (project.selectedTopicId) {
                          updateState(project.selectedTopicId, selectedState.id, { stereotype: e.target.value });
                        }
                      }}
                      placeholder="Stereotype for styling"
                    />
                  </div>

                  {!selectedState.isSystemNode && (() => {
                    const topicEndKind = getTopicEndKind(selectedState);
                    return (
                      <div className="space-y-2">
                        <Label htmlFor="state-topic-end">End-of-topic marker</Label>
                        <Select
                          value={topicEndKind ?? 'none'}
                          onValueChange={(value) => {
                            if (project.selectedTopicId) {
                              updateState(project.selectedTopicId, selectedState.id, {
                                topicEndKind: value === 'none' ? undefined : (value as 'positive' | 'negative'),
                              });
                            }
                          }}
                        >
                          <SelectTrigger id="state-topic-end">
                            <SelectValue placeholder="Not marked" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not marked</SelectItem>
                            <SelectItem value="positive">Final (Positive)</SelectItem>
                            <SelectItem value="negative">Final (Negative)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Marks the end-of-topic semantics only; this does not make the state terminal.
                        </p>
                      </div>
                    );
                  })()}

                  {selectedState.isSystemNode && !canDeleteSelectedState && (
                    <p className="text-sm text-muted-foreground">
                      System nodes cannot be edited or deleted.
                    </p>
                  )}

                  {selfLoopTransitions.length > 0 && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground">Self-loop transitions</h4>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setTransitionsVisibility(selfLoopTransitions.map(t => t.id), true)}
                          >
                            Show all
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setTransitionsVisibility(selfLoopTransitions.map(t => t.id), false)}
                          >
                            Hide all
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {selfLoopTransitions.map((transition) => {
                          const isVisible = transitionVisibility[transition.id] !== false;
                          const label = getTransitionMessageLabel(transition);
                          const checkboxId = `self-loop-${transition.id}`;
                          const helpTextId = `${checkboxId}-help`;
                          return (
                            <div
                              key={transition.id}
                              className={cn(
                                'flex items-start gap-2 rounded-md p-2 transition-colors',
                                isVisible ? 'bg-transparent' : 'bg-muted/40'
                              )}
                            >
                              <Checkbox
                                id={checkboxId}
                                checked={isVisible}
                                onCheckedChange={(checked) => {
                                  setTransitionVisibility(transition.id, checked === true);
                                }}
                                aria-describedby={helpTextId}
                              />
                              <div className="flex flex-col">
                                <Label
                                  htmlFor={checkboxId}
                                  className={cn(
                                    'text-sm',
                                    isVisible ? 'text-foreground' : 'text-muted-foreground line-through'
                                  )}
                                  title={label}
                                >
                                  {label}
                                </Label>
                                <span id={helpTextId} className="text-xs text-muted-foreground">
                                  {isVisible ? 'Visible on canvas' : 'Hidden on canvas'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedTransition && (() => {
                const fromState = selectedTopicData?.states.find(s => s.id === selectedTransition.from);
                const toState = selectedTopicData?.states.find(s => s.id === selectedTransition.to);
                
                return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Transition Properties</h3>
                    <Button size="sm" variant="destructive" onClick={handleDeleteTransition}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>From → To</Label>
                    <p className="text-sm text-muted-foreground">
                      {fromState?.label || 'Unknown'} → {toState?.label || 'Unknown'}
                    </p>
                  </div>

                  {selectedTransition.kind === 'endTopic' && (
                    <div className="space-y-2">
                      <Label>End Topic Kind</Label>
                      <Select
                        value={selectedTransition.endTopicKind ?? 'positive'}
                        onValueChange={(value) => {
                          if (project.selectedTopicId) {
                            updateTransition(project.selectedTopicId, selectedTransition.id, {
                              endTopicKind: value as 'positive' | 'negative',
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Only show editable properties for non-end transitions */}
                  {selectedTransition.kind !== 'endTopic'
                  && selectedTransition.kind !== 'endInstrument'
                  && !selectedTransition.isRoutingOnly ? (
                    <>
                      <div className="space-y-2">
                        <Label>Revision (optional)</Label>
                        <Combobox
                          value={selectedTransition.revision || ''}
                          onChange={(v) => {
                            if (project.selectedTopicId) {
                              updateTransition(project.selectedTopicId, selectedTransition.id, { 
                                revision: v || undefined 
                              });
                            }
                          }}
                          options={revisionOptions}
                          placeholder="Select revision..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Instrument (optional)</Label>
                        <Combobox
                          value={selectedTransition.instrument || ''}
                          onChange={(v) => {
                            if (project.selectedTopicId) {
                              updateTransition(project.selectedTopicId, selectedTransition.id, { 
                                instrument: v || undefined 
                              });
                            }
                          }}
                          options={instrumentOptions}
                          placeholder="Select instrument..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Topic (optional)</Label>
                        <Combobox
                          value={selectedTransition.topic || ''}
                          onChange={(v) => {
                            if (project.selectedTopicId) {
                              updateTransition(project.selectedTopicId, selectedTransition.id, { 
                                topic: v || undefined 
                              });
                            }
                          }}
                          options={topicOptions}
                          placeholder="Select topic..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>MessageType *</Label>
                        <Combobox
                          value={selectedTransition.messageType ?? ''}
                          onChange={(v) => {
                            if (project.selectedTopicId) {
                              updateTransition(project.selectedTopicId, selectedTransition.id, { 
                                messageType: v 
                              });
                            }
                          }}
                          options={messageTypeOptions}
                          placeholder="Select message type..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>FlowType *</Label>
                        <Combobox
                          value={selectedTransition.flowType ?? ''}
                          onChange={(v) => {
                            if (project.selectedTopicId && v) {
                              updateTransition(project.selectedTopicId, selectedTransition.id, { 
                                flowType: v as FlowType 
                              });
                            }
                          }}
                          options={flowTypeOptions}
                          placeholder="Select flow type..."
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {selectedTransition.isRoutingOnly
                        ? 'Fork transitions have no message properties.'
                        : 'End transitions have no message properties.'}
                    </p>
                  )}

                  {/* Edge Routing Controls - available for all transitions */}
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Edge Routing</h4>
                    <p className="text-xs text-muted-foreground">
                      Tip: Click an edge to reveal its endpoints—drag the highlighted handles to reconnect. Alt+click cycles through overlapping edges that share the same handles.
                    </p>
                    
                    <div className="space-y-2">
                      <Label>Source Side</Label>
                      <Select
                        value={selectedTransition.sourceHandleId?.replace('source-', '') || 'bottom'}
                        onValueChange={(v) => {
                          if (project.selectedTopicId) {
                            updateTransitionRouting(
                              project.selectedTopicId, 
                              selectedTransition.id, 
                              `source-${v}`,
                              undefined,
                              undefined
                            );
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HANDLE_SIDES.map((side) => (
                            <SelectItem key={side.value} value={side.value}>{side.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Side</Label>
                      <Select
                        value={selectedTransition.targetHandleId?.replace('target-', '') || 'top'}
                        onValueChange={(v) => {
                          if (project.selectedTopicId) {
                            updateTransitionRouting(
                              project.selectedTopicId, 
                              selectedTransition.id, 
                              undefined,
                              `target-${v}`,
                              undefined
                            );
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HANDLE_SIDES.map((side) => (
                            <SelectItem key={side.value} value={side.value}>{side.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Curve Offset: {selectedTransition.curveOffset ?? 0}</Label>
                      <Slider
                        value={[selectedTransition.curveOffset ?? 0]}
                        onValueChange={(values) => {
                          if (project.selectedTopicId) {
                            updateTransitionRouting(
                              project.selectedTopicId, 
                              selectedTransition.id, 
                              undefined,
                              undefined,
                              values[0]
                            );
                          }
                        }}
                        min={-150}
                        max={150}
                        step={5}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Adjust to move the curve left (-) or right (+)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`transition-teleport-${selectedTransition.id}`}
                          checked={transitionTeleportEnabled}
                          onCheckedChange={(checked) => {
                            if (project.selectedTopicId) {
                              setTransitionTeleportEnabled(
                                project.selectedTopicId,
                                selectedTransition.id,
                                checked === true
                              );
                            }
                          }}
                        />
                        <Label htmlFor={`transition-teleport-${selectedTransition.id}`}>
                          Enable teleport routing
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Draws a split edge with midpoint anchors instead of a single curve.
                      </p>
                    </div>
                  </div>
                </div>
              ); })()}

              {!selectedState && !selectedTransition && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a state or transition to edit its properties
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="validation" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {errors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Errors ({errors.length})
                  </h3>
                  {errors.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => handleIssueClick(issue)}
                      className={cn(
                        'p-3 rounded-md bg-destructive/10 text-sm cursor-pointer hover:bg-destructive/20 transition-colors',
                        issue.elementId && 'hover:ring-2 ring-destructive'
                      )}
                    >
                      <p className="text-destructive">{issue.message}</p>
                      {issue.topicId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Topic: {issue.topicId}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    Warnings ({warnings.length})
                  </h3>
                  {warnings.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => handleIssueClick(issue)}
                      className={cn(
                        'p-3 rounded-md bg-yellow-500/10 text-sm cursor-pointer hover:bg-yellow-500/20 transition-colors',
                        issue.elementId && 'hover:ring-2 ring-yellow-500'
                      )}
                    >
                      <p className="text-yellow-700">{issue.message}</p>
                      {issue.topicId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Topic: {issue.topicId}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {errors.length === 0 && warnings.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✓</div>
                  <p className="text-sm text-muted-foreground">
                    No validation issues
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
