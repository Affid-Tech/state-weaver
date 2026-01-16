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
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useDiagramStore } from '@/store/diagramStore';
import type { FlowType } from '@/types/diagram';

const DEFAULT_FLOW_TYPES: FlowType[] = ['B2B', 'B2C', 'C2B', 'C2C'];

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
  const { fieldConfig } = useDiagramStore();
  const [messageType, setMessageType] = useState('');
  const [flowType, setFlowType] = useState<FlowType>('B2B');

  // Derive options from fieldConfig with fallbacks
  const messageTypeOptions = fieldConfig.messageTypes;
  const flowTypeOptions = fieldConfig.flowTypes.length > 0 
    ? fieldConfig.flowTypes 
    : DEFAULT_FLOW_TYPES;

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
            <Combobox
              value={messageType}
              onChange={setMessageType}
              options={messageTypeOptions}
              placeholder="Select or enter message type..."
            />
          </div>
          <div className="space-y-2">
            <Label>FlowType *</Label>
            <Combobox
              value={flowType}
              onChange={(v) => v && setFlowType(v as FlowType)}
              options={flowTypeOptions}
              placeholder="Select flow type..."
              allowClear={false}
            />
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
