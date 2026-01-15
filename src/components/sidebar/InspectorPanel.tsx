import { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useDiagramStore } from '@/store/diagramStore';
import { validateProject } from '@/lib/validation';
import { cn } from '@/lib/utils';
import type { TransitionKind } from '@/types/diagram';

export function InspectorPanel() {
  const {
    project,
    selectedElementId,
    selectedElementType,
    addState,
    updateState,
    deleteState,
    updateTransition,
    deleteTransition,
    selectElement,
  } = useDiagramStore();

  const [isAddStateOpen, setIsAddStateOpen] = useState(false);
  const [newStateId, setNewStateId] = useState('');
  const [newStateLabel, setNewStateLabel] = useState('');

  const selectedTopicData = useMemo(() => {
    if (!project.selectedTopicId) return null;
    return project.topics.find(t => t.topic.id === project.selectedTopicId) ?? null;
  }, [project.selectedTopicId, project.topics]);

  const selectedState = useMemo(() => {
    if (!selectedTopicData || selectedElementType !== 'state' || !selectedElementId) return null;
    return selectedTopicData.states.find(s => s.id === selectedElementId) ?? null;
  }, [selectedTopicData, selectedElementType, selectedElementId]);

  const selectedTransition = useMemo(() => {
    if (!selectedTopicData || selectedElementType !== 'transition' || !selectedElementId) return null;
    return selectedTopicData.transitions.find(t => t.id === selectedElementId) ?? null;
  }, [selectedTopicData, selectedElementType, selectedElementId]);

  const validationIssues = useMemo(() => validateProject(project), [project]);
  const errors = validationIssues.filter(i => i.level === 'error');
  const warnings = validationIssues.filter(i => i.level === 'warning');

  const handleAddState = () => {
    if (!project.selectedTopicId || !newStateId.trim()) return;
    addState(project.selectedTopicId, newStateId.trim(), newStateLabel.trim() || undefined);
    setNewStateId('');
    setNewStateLabel('');
    setIsAddStateOpen(false);
  };

  const handleDeleteState = () => {
    if (!project.selectedTopicId || !selectedElementId || selectedElementType !== 'state') return;
    deleteState(project.selectedTopicId, selectedElementId);
    selectElement(null, null);
  };

  const handleDeleteTransition = () => {
    if (!project.selectedTopicId || !selectedElementId || selectedElementType !== 'transition') return;
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
          <div className="p-4 border-b border-border">
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
                    <Label>State ID *</Label>
                    <Input
                      value={newStateId}
                      onChange={(e) => setNewStateId(e.target.value)}
                      placeholder="e.g., Submitted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label (optional)</Label>
                    <Input
                      value={newStateLabel}
                      onChange={(e) => setNewStateLabel(e.target.value)}
                      placeholder="Display label"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddStateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddState} disabled={!newStateId.trim()}>
                    Add State
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {selectedState && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">State Properties</h3>
                    {!selectedState.isSystemNode && (
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
                    <Label>Label</Label>
                    <Input
                      value={selectedTransition.label || ''}
                      onChange={(e) => {
                        if (project.selectedTopicId) {
                          updateTransition(project.selectedTopicId, selectedTransition.id, { label: e.target.value });
                        }
                      }}
                      placeholder="Message label"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kind</Label>
                    <Select
                      value={selectedTransition.kind}
                      onValueChange={(v) => {
                        if (project.selectedTopicId) {
                          updateTransition(project.selectedTopicId, selectedTransition.id, { kind: v as TransitionKind });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="startTopic">Start Topic</SelectItem>
                        <SelectItem value="endTopic">End Topic</SelectItem>
                        <SelectItem value="startInstrument">Start Instrument</SelectItem>
                        <SelectItem value="endInstrument">End Instrument</SelectItem>
                      </SelectContent>
                    </Select>
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
