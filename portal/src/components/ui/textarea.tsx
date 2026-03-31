import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helperText?: string;
  errorText?: string;
};

export function Textarea({ label, helperText, errorText, className = "", required, ...props }: TextareaProps) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {required ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600">Required</span> : null}
        {!required && helperText?.toLowerCase().includes("optional") ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Optional</span> : null}
      </span>
      <textarea
        {...props}
        aria-invalid={errorText ? true : undefined}
        className={`min-h-28 w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition ${
          errorText ? "border-rose-300 bg-rose-50/60 focus:border-rose-500" : "border-slate-200 focus:border-emerald-600"
        } ${className}`}
      />
      {errorText ? <span className="text-xs font-medium text-rose-600">{errorText}</span> : helperText ? <span className="text-xs text-slate-500">{helperText}</span> : null}
    </label>
  );
}
