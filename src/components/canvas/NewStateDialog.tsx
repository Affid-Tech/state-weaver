import { useState } from 'react';
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
} from '@/components/ui/dialog';

interface NewStateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string, label?: string) => void;
}

export function NewStateDialog({ open, onOpenChange, onConfirm }: NewStateDialogProps) {
  const [stateId, setStateId] = useState('');
  const [stateLabel, setStateLabel] = useState('');

  const handleConfirm = () => {
    if (!stateId.trim()) return;
    onConfirm(stateId.trim(), stateLabel.trim() || undefined);
    setStateId('');
    setStateLabel('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setStateId('');
    setStateLabel('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create State</DialogTitle>
          <DialogDescription>
            Add a new state to the current topic.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>State ID *</Label>
            <Input
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              placeholder="e.g., Validated"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Label (optional)</Label>
            <Input
              value={stateLabel}
              onChange={(e) => setStateLabel(e.target.value)}
              placeholder="Human-friendly name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!stateId.trim()}>
            Create State
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
