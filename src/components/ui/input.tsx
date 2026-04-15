import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-ec-grey-80">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-ec-grey-60 px-3 py-2 text-ec-grey-80 placeholder:text-ec-grey-70 focus:border-ec-light-blue focus:outline-none focus:ring-2 focus:ring-ec-light-blue/20 ${error ? "border-ec-error" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-ec-error">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
