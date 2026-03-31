"use client";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (nextValue: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  variant?: "success" | "warning" | "neutral";
};

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  compact = false,
  className = "",
  variant = "success"
}: ToggleSwitchProps) {
  const sizeClasses = compact ? "h-6 w-11" : "h-7 w-12";
  const knobClasses = compact
    ? checked
      ? "translate-x-5"
      : "translate-x-1"
    : checked
      ? "translate-x-6"
      : "translate-x-1";
  const knobSize = compact ? "h-4 w-4" : "h-5 w-5";
  const activeClasses =
    variant === "warning"
      ? "border-amber-600 bg-amber-500"
      : variant === "neutral"
        ? "border-slate-700 bg-slate-700"
        : "border-emerald-700 bg-emerald-700";

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <button
        aria-checked={checked}
        className={`relative inline-flex ${sizeClasses} shrink-0 items-center rounded-full border transition ${
          checked ? activeClasses : "border-slate-300 bg-slate-200"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`inline-block ${knobSize} ${knobClasses} rounded-full bg-white shadow-sm transition-transform`}
        />
      </button>
      {label ? (
        <div>
          <p className="text-sm font-medium text-slate-800">{label}</p>
          {description ? <p className="text-xs text-slate-500">{description}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
