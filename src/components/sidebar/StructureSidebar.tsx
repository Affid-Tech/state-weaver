import { useState } from 'react';
import { Plus, Trash2, Crown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiagramStore } from '@/store/diagramStore';
import { cn } from '@/lib/utils';
import type { TopicKind } from '@/types/diagram';

export function StructureSidebar() {
  const {
    project,
    updateInstrument,
    createTopic,
    deleteTopic,
    selectTopic,
    setRootTopic,
  } = useDiagramStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTopicId, setNewTopicId] = useState('');
  const [newTopicLabel, setNewTopicLabel] = useState('');
  const [newTopicKind, setNewTopicKind] = useState<TopicKind>('normal');

  const handleCreateTopic = () => {
    if (!newTopicId.trim()) return;
    createTopic(newTopicId.trim(), newTopicKind, newTopicLabel.trim() || undefined);
    setNewTopicId('');
    setNewTopicLabel('');
    setNewTopicKind('normal');
    setIsCreateDialogOpen(false);
  };

  const handleDeleteTopic = (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this topic and all its states?')) {
      deleteTopic(topicId);
    }
  };

  const handleSetRoot = (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRootTopic(topicId);
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Instrument Section */}
      <div className="p-4 border-b border-sidebar-border">
        <Label className="text-xs text-sidebar-muted-foreground uppercase tracking-wider mb-3 block">
          Instrument
        </Label>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-sidebar-muted-foreground">ID</Label>
            <Input
              value={project.instrument.id}
              onChange={(e) => updateInstrument({ id: e.target.value })}
              placeholder="e.g., pacs_008"
              className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted-foreground"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-sidebar-muted-foreground">Label (optional)</Label>
            <Input
              value={project.instrument.label || ''}
              onChange={(e) => updateInstrument({ label: e.target.value })}
              placeholder="e.g., PACS 008 Payment"
              className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Topics Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 flex items-center justify-between">
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
                  <Label>Topic ID *</Label>
                  <Input
                    value={newTopicId}
                    onChange={(e) => setNewTopicId(e.target.value)}
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
          <div className="px-2 pb-4 space-y-1">
            {project.topics.length === 0 ? (
              <p className="text-sm text-sidebar-muted-foreground text-center py-8 px-4">
                No topics yet. Click + to create one.
              </p>
            ) : (
              project.topics.map((topicData) => (
                <div
                  key={topicData.topic.id}
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
                  {/* Root topic checkbox with crown icon */}
                  <div 
                    className="flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={topicData.topic.kind === 'root'}
                      onCheckedChange={() => setRootTopic(topicData.topic.id)}
                      className="h-4 w-4"
                      title={topicData.topic.kind === 'root' ? 'Unset as root' : 'Set as root'}
                    />
                    <Crown className={cn(
                      "h-4 w-4",
                      topicData.topic.kind === 'root' ? "text-yellow-400" : "text-muted-foreground/30"
                    )} />
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={(e) => handleDeleteTopic(topicData.topic.id, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
