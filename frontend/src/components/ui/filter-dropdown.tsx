"use client";
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterDropdownProps {
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function FilterDropdown({
  placeholder,
  options,
  onChange,
}: FilterDropdownProps) {
  return (
    <Select onValueChange={onChange}>
      <SelectTrigger className="w-full bg-black/30 border border-gray-700 text-sm text-gray-300 focus:ring-2 focus:ring-brand-red focus:border-brand-red">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-brand-dark-secondary border-gray-700 text-gray-300">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
