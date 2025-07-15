"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  triggerButtonClassName?: string;
  triggerButtonLabel?: string;
  dropdownOnly?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select or type...",
  allowCustom = true,
  open: controlledOpen,
  setOpen: setControlledOpen,
  triggerButtonClassName,
  triggerButtonLabel,
  dropdownOnly = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const actualOpen = isControlled ? controlledOpen : open;
  const setActualOpen = isControlled ? setControlledOpen! : setOpen;
  const [inputValue, setInputValue] = React.useState("");

  // Add ref for trigger
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [popoverWidth, setPopoverWidth] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (actualOpen && triggerRef.current) {
      setPopoverWidth(`${triggerRef.current.offsetWidth}px`);
    }
  }, [actualOpen]);

  React.useEffect(() => {
    if (!actualOpen) setInputValue("");
  }, [actualOpen]);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCustomOption =
    allowCustom &&
    inputValue &&
    !options.some(
      (option) =>
        option.label.toLowerCase() === inputValue.toLowerCase() ||
        option.value.toLowerCase() === inputValue.toLowerCase()
    );

  return (
    <Popover open={actualOpen} onOpenChange={setActualOpen}>
      {!dropdownOnly && (
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={actualOpen}
            className={triggerButtonClassName || "w-full justify-between"}
          >
            {triggerButtonLabel || (value
              ? options.find((option) => option.value === value)?.label || value
              : placeholder)}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent className="min-w-[200px] p-0" style={popoverWidth ? { width: popoverWidth } : {}}>
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setActualOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {showCustomOption && (
                <CommandItem
                  key={inputValue}
                  value={inputValue}
                  onSelect={() => {
                    onChange(inputValue);
                    setActualOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === inputValue ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Add "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Custom hook for fetching and saving custom options
import { useCallback, useEffect, useState } from "react";

export function useCustomOptions(optionType: string) {
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const getToken = () => {
    if (typeof window === "undefined") return "";
    const token = localStorage.getItem("token");
    return token || "";
  };

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        setOptions([]);
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_URL}/users/me/custom-options?option_type=${optionType}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOptions(data.map((option: any) => ({ value: option.value, label: option.value })));
      } else {
        setOptions([]);
        setError("Failed to fetch options");
      }
    } catch (err) {
      setOptions([]);
      setError("Failed to fetch options");
    } finally {
      setLoading(false);
    }
  }, [optionType]);

  const addOption = useCallback(async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/users/me/custom-options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ option_type: optionType, value }),
      });
      if (res.ok) {
        setOptions((prev) => [...prev, { value, label: value }]);
      } else {
        setError("Failed to add option");
      }
    } catch (err) {
      setError("Failed to add option");
    } finally {
      setLoading(false);
    }
  }, [optionType]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { options, loading, error, addOption, refetch: fetchOptions };
} 