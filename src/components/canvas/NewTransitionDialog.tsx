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

interface TransitionFormData {
  messageType: string;
  flowType: string;
  revision: string;
  instrument: string;
  topic: string;
}

interface NewTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: string;
  target: string;
  onConfirm: (
    messageType: string,
    flowType: FlowType,
    revision?: string,
    instrument?: string,
    topic?: string
  ) => void;
}

export function NewTransitionDialog({
  open,
  onOpenChange,
  source,
  target,
  onConfirm,
}: NewTransitionDialogProps) {
  const { fieldConfig } = useDiagramStore();
  const [formData, setFormData] = useState<TransitionFormData>({
    messageType: '',
    flowType: '',
    revision: '',
    instrument: '',
    topic: '',
  });

  // Derive options from fieldConfig with fallbacks
  const messageTypeOptions = fieldConfig.messageTypes;
  const flowTypeOptions = fieldConfig.flowTypes.length > 0 
    ? fieldConfig.flowTypes 
    : DEFAULT_FLOW_TYPES;
  const revisionOptions = fieldConfig.revisions;
  const instrumentOptions = fieldConfig.instrumentTypes;
  const topicOptions = fieldConfig.topicTypes;

  const updateField = (field: keyof TransitionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (!formData.messageType.trim() || !formData.flowType.trim()) return;
    onConfirm(
      formData.messageType.trim(),
      formData.flowType.trim() as FlowType,
      formData.revision.trim() || undefined,
      formData.instrument.trim() || undefined,
      formData.topic.trim() || undefined
    );
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({
      messageType: '',
      flowType: '',
      revision: '',
      instrument: '',
      topic: '',
    });
  };

  const isValid = formData.messageType.trim() && formData.flowType.trim();

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
          {/* Required fields first */}
          <div className="space-y-2">
            <Label>MessageType *</Label>
            <Combobox
              value={formData.messageType}
              onChange={(v) => updateField('messageType', v)}
              options={messageTypeOptions}
              placeholder="Select or enter message type..."
            />
          </div>
          <div className="space-y-2">
            <Label>FlowType *</Label>
            <Combobox
              value={formData.flowType}
              onChange={(v) => updateField('flowType', v)}
              options={flowTypeOptions}
              placeholder="Select flow type..."
              allowClear={true}
            />
          </div>

          {/* Optional fields */}
          <div className="space-y-2">
            <Label>Revision</Label>
            <Combobox
              value={formData.revision}
              onChange={(v) => updateField('revision', v)}
              options={revisionOptions}
              placeholder="Select or enter revision..."
            />
          </div>
          <div className="space-y-2">
            <Label>Instrument</Label>
            <Combobox
              value={formData.instrument}
              onChange={(v) => updateField('instrument', v)}
              options={instrumentOptions}
              placeholder="Select or enter instrument..."
            />
          </div>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Combobox
              value={formData.topic}
              onChange={(v) => updateField('topic', v)}
              options={topicOptions}
              placeholder="Select or enter topic..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Create Transition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
