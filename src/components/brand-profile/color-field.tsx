type ColorFieldProps = {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
};

export function ColorField({
  label,
  name,
  value,
  required,
  error,
  onChange,
}: ColorFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <div className="color-input-row">
        <span
          aria-hidden="true"
          className="color-swatch"
          style={{ backgroundColor: /^#[\dA-Fa-f]{6}$/.test(value) ? value : "#ffffff" }}
        />
        <input
          aria-describedby={error ? `${name}-error` : undefined}
          aria-invalid={Boolean(error)}
          id={name}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#285E61"
          required={required}
          value={value}
        />
      </div>
      {error ? (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
