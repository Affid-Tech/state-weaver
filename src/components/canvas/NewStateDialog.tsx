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
  onConfirm: (label: string) => void;
}

export function NewStateDialog({ open, onOpenChange, onConfirm }: NewStateDialogProps) {
  const [stateLabel, setStateLabel] = useState('');

  const handleConfirm = () => {
    if (!stateLabel.trim()) return;
    onConfirm(stateLabel.trim());
    setStateLabel('');
    onOpenChange(false);
  };

  const handleCancel = () => {
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
            <Label>State Label *</Label>
            <Input
              value={stateLabel}
              onChange={(e) => setStateLabel(e.target.value)}
              placeholder="e.g., Payment Submitted"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The label will be converted to a PUML-safe ID automatically.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!stateLabel.trim()}>
            Create State
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
