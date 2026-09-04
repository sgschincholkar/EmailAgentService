import type { ValidationResult } from "@/domain/schemas";

type QuickChecksProps = {
  validationResults: ValidationResult[];
};

const SEVERITY_LABELS: Record<ValidationResult["severity"], string> = {
  error: "error",
  warning: "warning",
  info: "info",
};

export function QuickChecks({ validationResults }: QuickChecksProps) {
  const errors = validationResults.filter((result) => result.severity === "error");
  const warnings = validationResults.filter((result) => result.severity === "warning");
  const infos = validationResults.filter((result) => result.severity === "info");

  const summaryParts = [
    `${errors.length} error${errors.length === 1 ? "" : "s"}`,
    `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`,
  ];
  if (infos.length > 0) {
    summaryParts.push(`${infos.length} note${infos.length === 1 ? "" : "s"}`);
  }

  return (
    <section aria-label="Quick checks" className="quick-checks">
      <h2>Quick checks</h2>
      <p className="quick-checks-summary">{summaryParts.join(" · ")}</p>

      {validationResults.length === 0 ? (
        <p className="field-hint">No issues found for this draft.</p>
      ) : (
        <ul className="quick-checks-list">
          {[...errors, ...warnings, ...infos].map((result) => (
            <li className={`quick-check quick-check-${result.severity}`} key={result.id}>
              <span className="quick-check-severity">
                {SEVERITY_LABELS[result.severity]}
              </span>
              <div className="quick-check-body">
                <p>{result.message}</p>
                {result.blockId ? (
                  <p className="field-hint">Location: {result.blockId}</p>
                ) : null}
                {result.suggestedAction ? (
                  <p className="field-hint">{result.suggestedAction}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
