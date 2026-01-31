import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area.tsx";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  allowClear?: boolean;
  triggerProps?: React.ComponentPropsWithoutRef<typeof Button>;
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select...",
  emptyMessage = "No options found.",
  className,
  allowClear = true,
  triggerProps,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const triggerTourId =
    typeof triggerProps?.["data-tour"] === "string"
      ? triggerProps["data-tour"]
      : undefined;
  const optionsTourId = triggerTourId ? `${triggerTourId}-options` : undefined;

  // Keep inputValue in sync with value prop
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
  };

  // If no options configured, render as simple input (free text allowed)
  if (options.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  // Options exist: render as strict select (no custom values allowed)
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setInputValue(selectedValue);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    // Don't call onChange - only select from options is allowed
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          {...triggerProps}
          className={cn(
            "w-full justify-between font-normal",
            className,
            triggerProps?.className
          )}
        >
          <span className={cn(!value && "text-muted-foreground", "flex-1 text-left truncate")}>
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {allowClear && value && (
              <span
                role="button"
                tabIndex={0}
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100 cursor-pointer"
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        data-tour={optionsTourId}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Filter ${placeholder.toLowerCase()}...`}
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {filteredOptions.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
