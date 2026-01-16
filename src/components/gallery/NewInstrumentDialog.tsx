import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

interface NewInstrumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (projectId: string) => void;
}

export function NewInstrumentDialog({ open, onOpenChange, onCreated }: NewInstrumentDialogProps) {
  const { fieldConfig, createProject } = useDiagramStore();
  
  const [instrumentType, setInstrumentType] = useState('');
  const [revision, setRevision] = useState('');
  const [description, setDescription] = useState('');

  const instrumentTypeOptions = fieldConfig.instrumentTypes;
  const revisionOptions = fieldConfig.revisions;

  const handleCreate = () => {
    if (!instrumentType.trim() || !revision.trim()) return;
    
    const projectId = createProject({
      type: instrumentType.trim(),
      revision: revision.trim(),
      description: description.trim() || undefined,
    });
    
    // Reset form
    setInstrumentType('');
    setRevision('');
    setDescription('');
    onOpenChange(false);
    onCreated(projectId);
  };

  const handleCancel = () => {
    setInstrumentType('');
    setRevision('');
    setDescription('');
    onOpenChange(false);
  };

  const isValid = instrumentType.trim() && revision.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Instrument</DialogTitle>
          <DialogDescription>
            Create a new instrument to define a state machine.
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
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this instrument..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isValid}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
