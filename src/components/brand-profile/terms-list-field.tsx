type TermsListFieldProps = {
  label: string;
  name: string;
  value: string[];
  hint: string;
  onChange: (value: string[]) => void;
};

export function TermsListField({
  label,
  name,
  value,
  hint,
  onChange,
}: TermsListFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(",")
              .map((term) => term.trim())
              .filter(Boolean),
          )
        }
        placeholder={hint}
        value={value.join(", ")}
      />
      <p className="field-hint">Separate words or phrases with commas.</p>
    </div>
  );
}
