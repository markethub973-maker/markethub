"use client";

import { useState, type InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  validate?: (value: string) => string | null;
  hint?: string;
}

export default function GlassInput({
  label,
  validate,
  hint,
  className = "",
  ...props
}: GlassInputProps) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    if (validate) setError(validate(e.target.value));
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (touched && validate) setError(validate(e.target.value));
    props.onChange?.(e);
  };

  const statusClass = touched ? (error ? "invalid" : props.value ? "valid" : "") : "";

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label className="input-label">{label}</label>}
      <input
        {...props}
        className={`input-glass ${statusClass} ${className}`}
        onBlur={handleBlur}
        onChange={handleChange}
      />
      {touched && error && <div className="input-hint invalid">✕ {error}</div>}
      {touched && !error && props.value && <div className="input-hint valid">✓ Looks good</div>}
      {hint && !touched && (
        <div className="input-hint" style={{ color: "rgba(255,255,255,0.25)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
