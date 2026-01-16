import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDiagramStore } from '@/store/diagramStore';
import { toast } from 'sonner';
import type { DiagramProject } from '@/types/diagram';

interface EditInstrumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: DiagramProject | null;
}

export function EditInstrumentDialog({ open, onOpenChange, project }: EditInstrumentDialogProps) {
  const { fieldConfig, updateInstrument, selectProject, activeProjectId, projects } = useDiagramStore();
  
  const [instrumentType, setInstrumentType] = useState('');
  const [revision, setRevision] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const instrumentTypeOptions = fieldConfig.instrumentTypes;
  const revisionOptions = fieldConfig.revisions;

  // Populate form when project changes
  useEffect(() => {
    if (project) {
      setInstrumentType(project.instrument.type);
      setRevision(project.instrument.revision);
      setLabel(project.instrument.label || '');
      setDescription(project.instrument.description || '');
    }
  }, [project]);

  // Check for duplicate type+revision combination (excluding current project)
  const isDuplicate = projects.some(
    p => p.id !== project?.id &&
         p.instrument.type === instrumentType.trim() && 
         p.instrument.revision === revision.trim()
  );

  const handleSave = () => {
    if (!project || !instrumentType.trim() || !revision.trim()) return;
    
    if (isDuplicate) {
      toast.error(`An instrument with type "${instrumentType}" and revision "${revision}" already exists.`);
      return;
    }
    
    // Temporarily select this project to update it
    const previousActiveId = activeProjectId;
    selectProject(project.id);
    
    updateInstrument({
      type: instrumentType.trim(),
      revision: revision.trim(),
      label: label.trim() || undefined,
      description: description.trim() || undefined,
    });
    
    // Restore previous selection if different
    if (previousActiveId && previousActiveId !== project.id) {
      selectProject(previousActiveId);
    }
    
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isValid = instrumentType.trim() && revision.trim() && !isDuplicate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Instrument Details</DialogTitle>
          <DialogDescription>
            Update the instrument metadata.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Instrument Type *</Label>
            <Combobox
              value={instrumentType}
              onChange={setInstrumentType}
              options={instrumentTypeOptions}
              placeholder="Select or enter type..."
              allowClear={false}
            />
          </div>
          <div className="space-y-2">
            <Label>Revision *</Label>
            <Combobox
              value={revision}
              onChange={setRevision}
              options={revisionOptions}
              placeholder="Select or enter revision..."
              allowClear={false}
            />
          </div>
          <div className="space-y-2">
            <Label>Label (optional)</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Human-friendly name..."
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
