import { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function Checkbox({ label, className = "", id, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className={`flex items-center gap-2 text-sm ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-black/25 accent-brand-purple"
        {...props}
      />
      {label}
    </label>
  );
}
