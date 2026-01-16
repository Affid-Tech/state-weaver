import { useState } from 'react';
import { Plus, Trash2, Crown, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox } from '@/components/ui/combobox';
import { useDiagramStore } from '@/store/diagramStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TopicKind, TopicData } from '@/types/diagram';

export function StructureSidebar() {
  // Use selectors for reactive access
  const project = useDiagramStore(s => s.getActiveProject());
  const fieldConfig = useDiagramStore(s => s.fieldConfig);
  const createTopic = useDiagramStore(s => s.createTopic);
  const updateTopic = useDiagramStore(s => s.updateTopic);
  const deleteTopic = useDiagramStore(s => s.deleteTopic);
  const selectTopic = useDiagramStore(s => s.selectTopic);
  const setRootTopic = useDiagramStore(s => s.setRootTopic);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTopicId, setNewTopicId] = useState('');
  const [newTopicLabel, setNewTopicLabel] = useState('');
  const [newTopicKind, setNewTopicKind] = useState<TopicKind>('normal');

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicData | null>(null);
  const [editTopicId, setEditTopicId] = useState('');
  const [editTopicLabel, setEditTopicLabel] = useState('');

  // Handle null project case
  if (!project) {
    return (
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col items-center justify-center">
        <p className="text-sm text-sidebar-muted-foreground">No project selected</p>
      </aside>
    );
  }

  const handleCreateTopic = () => {
    if (!newTopicId.trim()) return;
    
    // Check for duplicate topic type
    const exists = project.topics.some(t => t.topic.id === newTopicId.trim());
    if (exists) {
      toast.error(`Topic type "${newTopicId.trim()}" already exists in this instrument.`);
      return;
    }
    
    createTopic(newTopicId.trim(), newTopicKind, newTopicLabel.trim() || undefined);
    setNewTopicId('');
    setNewTopicLabel('');
    setNewTopicKind('normal');
    setIsCreateDialogOpen(false);
  };

  const handleDeleteTopic = (topicId: string) => {
    if (confirm('Delete this topic and all its states?')) {
      deleteTopic(topicId);
    }
  };

  const handleEditTopic = (topicData: TopicData) => {
    setEditingTopic(topicData);
    setEditTopicId(topicData.topic.id);
    setEditTopicLabel(topicData.topic.label || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTopic || !editTopicId.trim()) return;
    
    // Check for duplicate topic type (excluding current topic being edited)
    const trimmedId = editTopicId.trim();
    const isDuplicate = project.topics.some(
      t => t.topic.id === trimmedId && t.topic.id !== editingTopic.topic.id
    );
    
    if (isDuplicate) {
      toast.error(`Topic type "${trimmedId}" already exists in this instrument.`);
      return;
    }
    
    updateTopic(editingTopic.topic.id, {
      id: trimmedId,
      label: editTopicLabel.trim() || undefined,
    });
    
    setIsEditDialogOpen(false);
    setEditingTopic(null);
  };

  // Compute available topic types for create dialog (exclude already used)
  const usedTopicTypesForCreate = project.topics.map(t => t.topic.id);
  const availableTopicTypesForCreate = fieldConfig.topicTypes.filter(
    type => !usedTopicTypesForCreate.includes(type)
  );

  // Compute available topic types for edit dialog (exclude used except current)
  const usedTopicTypesForEdit = project.topics
    .filter(t => t.topic.id !== editingTopic?.topic.id)
    .map(t => t.topic.id);
  const availableTopicTypesForEdit = fieldConfig.topicTypes.filter(
    type => !usedTopicTypesForEdit.includes(type)
  );

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Topics Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
          <Label className="text-xs text-sidebar-muted-foreground uppercase tracking-wider">
            Topics
          </Label>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Topic</DialogTitle>
                <DialogDescription>
                  Add a new topic (message subtype) to this instrument.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Topic Type *</Label>
                  <Combobox
                    value={newTopicId}
                    onChange={setNewTopicId}
                    options={availableTopicTypesForCreate}
                    placeholder="e.g., Release"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label (optional)</Label>
                  <Input
                    value={newTopicLabel}
                    onChange={(e) => setNewTopicLabel(e.target.value)}
                    placeholder="Human-friendly name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kind</Label>
                  <Select value={newTopicKind} onValueChange={(v) => setNewTopicKind(v as TopicKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="root">Root (Instrument Entry)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTopic} disabled={!newTopicId.trim()}>
                  Create Topic
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 py-4 space-y-1">
            {project.topics.length === 0 ? (
              <p className="text-sm text-sidebar-muted-foreground text-center py-8 px-4">
                No topics yet. Click + to create one.
              </p>
            ) : (
              project.topics.map((topicData) => (
                <ContextMenu key={topicData.topic.id}>
                  <ContextMenuTrigger>
                    <div
                      onClick={() => selectTopic(topicData.topic.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors group',
                        project.selectedTopicId === topicData.topic.id
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {topicData.topic.label || topicData.topic.id}
                        </p>
                        {topicData.topic.label && (
                          <p className="text-xs opacity-70 truncate">{topicData.topic.id}</p>
                        )}
                      </div>
                      {/* Crown indicator for root status */}
                      {topicData.topic.kind === 'root' && (
                        <Crown className="h-4 w-4 text-yellow-400 fill-yellow-400/20 flex-shrink-0" />
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleEditTopic(topicData)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setRootTopic(topicData.topic.id)}>
                      <Crown className="h-4 w-4 mr-2" />
                      {topicData.topic.kind === 'root' ? 'Unset Root' : 'Set as Root'}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => handleDeleteTopic(topicData.topic.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Edit Topic Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
            <DialogDescription>
              Update the topic ID and label.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Topic Type *</Label>
              <Combobox
                value={editTopicId}
                onChange={setEditTopicId}
                options={availableTopicTypesForEdit}
                placeholder="e.g., Release"
              />
            </div>
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={editTopicLabel}
                onChange={(e) => setEditTopicLabel(e.target.value)}
                placeholder="Human-friendly name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editTopicId.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
