import {useState} from 'react';
import {Plus, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from '@/components/ui/dialog';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {useDiagramStore} from '@/store/diagramStore';
import {toast} from 'sonner';
import {isValidEnumName} from '@/lib/validation';
import {FieldConfig} from '@/types/fieldConfig';

interface FieldConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FieldKey = keyof FieldConfig;

const FIELD_LABELS: Record<FieldKey, string> = {
  revisions: 'Revisions',
  instrumentTypes: 'Instrument Types',
  topicTypes: 'Topic Types',
  messageTypes: 'Message Types',
  flowTypes: 'Flow Types',
};

const FLOW_TYPE_COLOR_PRESETS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
];

export function FieldConfigDialog({ open, onOpenChange }: FieldConfigDialogProps) {
  const { fieldConfig, updateFieldConfig } = useDiagramStore();
  const [newValues, setNewValues] = useState<Record<FieldKey, string>>({
    revisions: '',
    instrumentTypes: '',
    topicTypes: '',
    messageTypes: '',
    flowTypes: '',
  });

  const handleAddValue = (field: FieldKey) => {
    const value = newValues[field].trim();
    if (!value) return;
    
    // Validate Java enum naming convention
    if (!isValidEnumName(value)) {
      toast.error('Invalid name: must follow Java enum convention (start with letter, only letters/numbers/underscores, no spaces)');
      return;
    }
    
    if (fieldConfig[field].includes(value)) {
      toast.error(`"${value}" already exists`);
      return;
    }
    updateFieldConfig({
      [field]: [...fieldConfig[field], value],
    });
    setNewValues((prev) => ({ ...prev, [field]: '' }));
  };

  const handleRemoveValue = (field: FieldKey, value: string) => {
    if (field === 'flowTypes') {
      const updatedColors = { ...(fieldConfig.flowTypeColors ?? {}) };
      delete updatedColors[value];
      updateFieldConfig({
        [field]: fieldConfig[field].filter((v) => v !== value),
        flowTypeColors: updatedColors,
      });
      return;
    }
    updateFieldConfig({
      [field]: fieldConfig[field].filter((v) => v !== value),
    });
  };

  const handleFlowTypeColorChange = (flowType: string, color: string) => {
    updateFieldConfig({
      flowTypeColors: {
        ...(fieldConfig.flowTypeColors ?? {}),
        [flowType]: color,
      },
    });
  };

  const renderFieldTab = (field: FieldKey) => (
    <TabsContent key={field} value={field} className="mt-0 flex-1 flex flex-col">
      <ScrollArea className="flex-1 max-h-64">
        <div className="space-y-2 p-1">
          {fieldConfig[field].length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No values configured. Add values below or import a config.
            </p>
          ) : (
            fieldConfig[field].map((value) => (
              <div
                key={value}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-muted"
              >
                {field === 'flowTypes' ? (
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-6 w-6 rounded-full border border-muted-foreground/40"
                          style={{ backgroundColor: fieldConfig.flowTypeColors?.[value] ?? 'transparent' }}
                          aria-label={`Pick color for ${value}`}
                        />
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-48 p-3">
                        <div className="flex flex-col gap-3">
                          <input
                            type="color"
                            value={fieldConfig.flowTypeColors?.[value] ?? '#000000'}
                            onChange={(event) => handleFlowTypeColorChange(value, event.target.value)}
                            className="h-8 w-full cursor-pointer rounded-md border border-input bg-background p-1"
                          />
                          <div className="flex flex-wrap gap-2">
                            {FLOW_TYPE_COLOR_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                className="h-6 w-6 rounded-full border border-muted-foreground/40"
                                style={{ backgroundColor: preset }}
                                onClick={() => handleFlowTypeColorChange(value, preset)}
                                aria-label={`Set ${value} color to ${preset}`}
                              />
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <span className="text-sm font-mono">{value}</span>
                  </div>
                ) : (
                  <span className="text-sm font-mono">{value}</span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveValue(field, value)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Input
          value={newValues[field]}
          onChange={(e) => setNewValues((prev) => ({ ...prev, [field]: e.target.value }))}
          placeholder={`Add new value (e.g., MY_VALUE)...`}
          onKeyDown={(e) => e.key === 'Enter' && handleAddValue(field)}
          className="font-mono"
        />
        <Button onClick={() => handleAddValue(field)} disabled={!newValues[field].trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Values must follow Java enum naming: letters, numbers, underscores only (e.g., MY_VALUE, R1)
      </p>
    </TabsContent>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Field Configuration</DialogTitle>
          <DialogDescription>
            Configure the available options for diagram fields. When values are configured,
            fields will show dropdowns restricted to these options only.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="revisions" className="flex flex-col">
          <TabsList className="grid grid-cols-5 mb-4">
            <>
              {(Object.keys(FIELD_LABELS) as FieldKey[]).map((tab) => {
                return (
                    <TabsTrigger key={tab} value={tab.toString()} className="text-xs px-2">{FIELD_LABELS[tab]}</TabsTrigger>
                );
              })}
            </>
          </TabsList>

          <>
            {(Object.keys(FIELD_LABELS) as FieldKey[]).map((tab) => {
              return renderFieldTab(tab)
            })}
          </>
        </Tabs>

        <div className="flex justify-end pt-4 border-t mt-4">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
