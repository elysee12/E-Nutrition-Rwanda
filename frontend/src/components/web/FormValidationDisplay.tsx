/**
 * Form Validation Display Component
 * Shows validation errors in a user-friendly way
 */

import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ValidationErrorProps {
  error: string | null;
  isValid?: boolean;
}

export function ValidationError({ error, isValid }: ValidationErrorProps) {
  if (!error && isValid !== false) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 text-sm mt-1">
      {error ? (
        <>
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-red-600">{error}</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-green-600">Valid</span>
        </>
      )}
    </div>
  );
}

interface FieldWithValidationProps {
  label: string;
  error?: string | null;
  isValid?: boolean;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function FieldWithValidation({
  label,
  error,
  isValid,
  required,
  hint,
  children,
}: FieldWithValidationProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      <ValidationError error={error} isValid={isValid} />
    </div>
  );
}
