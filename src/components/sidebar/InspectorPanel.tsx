import { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, AlertTriangle, CircleSlash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
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
import type { FlowType } from '@/types/diagram';

const DEFAULT_FLOW_TYPES: FlowType[] = ['B2B', 'B2C', 'C2B', 'C2C'];
const HANDLE_SIDES = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];


function getTransitionKindLabel(kind: string): string {
  switch (kind) {
    case 'startInstrument': return 'Start Instrument';
    case 'startTopic': return 'Start Topic';
    case 'endTopic': return 'End Topic';
    case 'endInstrument': return 'End Instrument';
    default: return 'Normal';
  }
}

export function InspectorPanel() {
  // Use selectors for reactive access
  const project = useDiagramStore(s => s.getActiveProject());
  const selectedElementId = useDiagramStore(s => s.selectedElementId);
  const selectedElementType = useDiagramStore(s => s.selectedElementType);
  const fieldConfig = useDiagramStore(s => s.fieldConfig);
  const addState = useDiagramStore(s => s.addState);
  const addInstrumentEnd = useDiagramStore(s => s.addInstrumentEnd);
  const addTopicEnd = useDiagramStore(s => s.addTopicEnd);
  const updateState = useDiagramStore(s => s.updateState);
  const deleteState = useDiagramStore(s => s.deleteState);
  const updateTransition = useDiagramStore(s => s.updateTransition);
  const updateTransitionRouting = useDiagramStore(s => s.updateTransitionRouting);
  const deleteTransition = useDiagramStore(s => s.deleteTransition);
  const selectElement = useDiagramStore(s => s.selectElement);
  const selectTopic = useDiagramStore(s => s.selectTopic);

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

  const hasInstrumentEnd = useMemo(() => {
    if (!selectedTopicData) return false;
    return selectedTopicData.states.some(s => s.systemNodeType === 'InstrumentEnd');
  }, [selectedTopicData]);

  const hasTopicEnd = useMemo(() => {
    if (!selectedTopicData) return false;
    return selectedTopicData.states.some(s => s.systemNodeType === 'TopicEnd');
  }, [selectedTopicData]);

  // Check if the selected state can be deleted (for system nodes, only if the other end exists)
  const canDeleteSelectedState = useMemo(() => {
    if (!selectedState) return false;
    if (!selectedState.isSystemNode) return true;
    
    // TopicEnd can NEVER be deleted - topic must always have a proper end
    if (selectedState.systemNodeType === 'TopicEnd') return false;
    
    // InstrumentEnd can be deleted only if TopicEnd exists
    if (selectedState.systemNodeType === 'InstrumentEnd') return hasTopicEnd;
    
    // Cannot delete start nodes (TopicStart, NewInstrument)
    return false;
  }, [selectedState, hasTopicEnd]);

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

  const handleAddInstrumentEnd = () => {
    if (!project?.selectedTopicId) return;
    addInstrumentEnd(project.selectedTopicId);
  };

  const handleAddTopicEnd = () => {
    if (!project?.selectedTopicId) return;
    addTopicEnd(project.selectedTopicId);
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
    <aside className="w-80 bg-card border-l border-border flex flex-col">
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
                <Button className="w-full" disabled={!project.selectedTopicId}>
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
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddStateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddState} disabled={!newStateLabel.trim()}>
                    Add State
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {!hasInstrumentEnd && (
              <Button 
                variant="outline" 
                className="w-full" 
                disabled={!project.selectedTopicId}
                onClick={handleAddInstrumentEnd}
              >
                <CircleSlash className="h-4 w-4 mr-2" />
                Add Instrument End
              </Button>
            )}

            {!hasTopicEnd && (
              <Button 
                variant="outline" 
                className="w-full" 
                disabled={!project.selectedTopicId}
                onClick={handleAddTopicEnd}
              >
                <CircleSlash className="h-4 w-4 mr-2" />
                Add Topic End
              </Button>
            )}
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
                    <Label>ID</Label>
                    <Input
                      value={selectedState.id}
                      disabled={selectedState.isSystemNode}
                      onChange={(e) => {
                        if (project.selectedTopicId) {
                          updateState(project.selectedTopicId, selectedState.id, { id: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={selectedState.label || ''}
                      disabled={selectedState.isSystemNode}
                      onChange={(e) => {
                        if (project.selectedTopicId) {
                          updateState(project.selectedTopicId, selectedState.id, { label: e.target.value });
                        }
                      }}
                      placeholder="Display label"
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

                  {selectedState.isSystemNode && (
                    <p className="text-sm text-muted-foreground">
                      System nodes cannot be edited or deleted.
                    </p>
                  )}
                </div>
              )}

              {selectedTransition && (
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
                      {selectedTransition.from} → {selectedTransition.to}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Type (derived)</Label>
                    <p className="text-sm px-3 py-2 bg-muted rounded-md">
                      {getTransitionKindLabel(selectedTransition.kind)}
                    </p>
                  </div>

                  {/* Only show editable properties for non-end transitions */}
                  {selectedTransition.kind !== 'endTopic' && selectedTransition.kind !== 'endInstrument' ? (
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
                          value={selectedTransition.messageType}
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
                          value={selectedTransition.flowType}
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
                      End transitions have no message properties.
                    </p>
                  )}

                  {/* Edge Routing Controls - available for all transitions */}
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Edge Routing</h4>
                    
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
                  </div>
                </div>
              )}

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
