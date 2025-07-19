"use client";

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
import { Badge } from "@/components/ui/badge";

export interface MultiComboboxOption {
  value: string;
  label: string;
}

interface MultiComboboxProps {
  options: MultiComboboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  triggerButtonClassName?: string;
  triggerButtonLabel?: string;
}

export const MultiCombobox: React.FC<MultiComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select or type...",
  allowCustom = true,
  triggerButtonClassName,
  triggerButtonLabel,
}) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [deletingTags, setDeletingTags] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open) setInputValue("");
  }, [open]);

  const filteredOptions = options.filter(
    (option) =>
      (option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        option.value.toLowerCase().includes(inputValue.toLowerCase())) &&
      !value.includes(option.value)
  );

  const showCustomOption =
    allowCustom &&
    inputValue &&
    !options.some(
      (option) =>
        option.label.toLowerCase() === inputValue.toLowerCase() ||
        option.value.toLowerCase() === inputValue.toLowerCase()
    ) &&
    !value.includes(inputValue);

  const handleSelect = (selectedValue: string) => {
    if (!value.includes(selectedValue)) {
      onChange([...value, selectedValue]);
    }
    setInputValue("");
  };

  const handleRemove = (tagToRemove: string) => {
    // Start animation
    setDeletingTags(prev => new Set(prev).add(tagToRemove));
    
    // Remove tag after animation completes
    setTimeout(() => {
      onChange(value.filter(tag => tag !== tagToRemove));
      setDeletingTags(prev => {
        const newSet = new Set(prev);
        newSet.delete(tagToRemove);
        return newSet;
      });
    }, 200); // Match the CSS transition duration
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (showCustomOption) {
        handleSelect(inputValue);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value);
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected tags display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className={cn(
                "flex items-center gap-1 px-2 py-1 bg-primary-200 text-foreground rounded-full transition-all duration-200 ease-in-out",
                deletingTags.has(tag) 
                  ? "opacity-0 scale-75 transform" 
                  : "opacity-100 scale-100"
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-primary-300/50 transition-colors"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {tag}</span>
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(triggerButtonClassName || "w-full justify-between", "h-auto min-h-9")}
          >
            <span className="truncate">
              {triggerButtonLabel || (value.length === 0 ? placeholder : `Add ${value.length === 1 ? 'another tag' : 'more tags'}...`)}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleKeyDown}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    {option.label}
                  </CommandItem>
                ))}
                {showCustomOption && (
                  <CommandItem
                    key={inputValue}
                    value={inputValue}
                    onSelect={() => handleSelect(inputValue)}
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    Add "{inputValue}"
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}; 