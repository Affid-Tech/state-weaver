import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FlowType } from '@/types/diagram';

const FLOW_TYPES: FlowType[] = ['B2B', 'B2C', 'C2B', 'C2C'];

interface NewTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: string;
  target: string;
  onConfirm: (messageType: string, flowType: FlowType) => void;
}

export function NewTransitionDialog({
  open,
  onOpenChange,
  source,
  target,
  onConfirm,
}: NewTransitionDialogProps) {
  const [messageType, setMessageType] = useState('');
  const [flowType, setFlowType] = useState<FlowType>('B2B');

  const handleConfirm = () => {
    if (!messageType.trim()) return;
    onConfirm(messageType.trim(), flowType);
    setMessageType('');
    setFlowType('B2B');
  };

  const handleCancel = () => {
    setMessageType('');
    setFlowType('B2B');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Transition</DialogTitle>
          <DialogDescription>
            Create a transition from <strong>{source}</strong> to <strong>{target}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>MessageType *</Label>
            <Input
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              placeholder="e.g., Submit, Validate, Reject"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>FlowType *</Label>
            <Select value={flowType} onValueChange={(v) => setFlowType(v as FlowType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLOW_TYPES.map((ft) => (
                  <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!messageType.trim()}>
            Create Transition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
