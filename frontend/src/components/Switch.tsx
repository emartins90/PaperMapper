import React from "react";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label"?: string;
  className?: string;
};

export default function Switch({ checked, onChange, "aria-label": ariaLabel, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors duration-200 flex items-center ${checked ? "bg-[#58C890]" : "bg-gray-300"} ${className || ""}`}
    >
      <span
        className={`block w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
} 