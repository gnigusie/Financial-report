export const Alert = ({ type = "info", children }) => <div className={`alert alert-${type}`} role={type === "error" ? "alert" : "status"}>{children}</div>;
export const Panel = ({ title, action, children }) => (
  <section className="panel">
    {(title || action) && <div className="panel-heading"><h2>{title}</h2>{action}</div>}
    <div className="panel-body">{children}</div>
  </section>
);

export function Field({ label, name, value, onChange, error, hint, success, action, ...props }) {
  const input = <input id={name} name={name} value={value ?? ""} onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined} {...props} />;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {action ? <div className="input-row">{input}{action}</div> : input}
      {error && <small id={`${name}-error`} className="field-error">{error}</small>}
      {!error && success && <small className="field-success">{success}</small>}
      {!error && !success && hint && <small id={`${name}-hint`} className="field-hint">{hint}</small>}
    </div>
  );
}

export const SelectField = ({ label, name, value, onChange, options, error, ...props }) => (
  <div className="field">
    <label htmlFor={name}>{label}</label>
    <select id={name} name={name} value={value ?? ""} onChange={onChange} aria-invalid={Boolean(error)} {...props}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <small className="field-error">{error}</small>}
  </div>
);

export const CheckboxField = ({ name, checked, onChange, title, description }) => (
  <label className="checkbox-row">
    <input type="checkbox" name={name} checked={checked} onChange={onChange} />
    <span><strong>{title}</strong>{description && <small>{description}</small>}</span>
  </label>
);

export const DataTable = ({ columns, rows, rowKey }) => (
  <div className="table-scroll">
    <table className="data-table">
      <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, i) => <tr key={rowKey ? rowKey(row, i) : i}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

export function Feedback({ feedback: { error, success, clearFeedback } }) {
  const message = error || success;
  if (!message) return null;
  return (
    <div className={`settings-toast ${error ? "settings-toast-error" : "settings-toast-success"}`} role={error ? "alert" : "status"}>
      <span>{message}</span>
      <button type="button" onClick={clearFeedback} aria-label="Dismiss message">×</button>
    </div>
  );
}

export const LoadingIndicator = ({ text = "Loading...", inline = false }) => (
  <div className={`loading-indicator${inline ? " loading-indicator-inline" : ""}`} role="status" aria-live="polite">
    <span className="loading-spinner" aria-hidden="true" />
    <span>{text}</span>
  </div>
);

export const HelpTooltip = ({ text }) => (
  <span className="help-tooltip"><button type="button" className="help-tooltip-trigger" aria-label="Help" title={text}>?</button></span>
);

export const Toggle = ({ on, onClick, disabled, title, label }) => (
  <button type="button" role="switch" aria-checked={on} disabled={disabled} className={`settings-toggle ${on ? "settings-toggle-on" : ""}`} onClick={onClick} title={title} aria-label={label}>
    <span className="settings-toggle-thumb" />
  </button>
);

export const Modal = ({ id, title, onClose, busy, closeText = "×", className = "", children }) => (
  <div className="settings-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
    <section className={`settings-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={id}>
      <div className="settings-modal-heading">
        <h2 id={id}>{title}</h2>
        <button type="button" className="button button-secondary" onClick={onClose} disabled={busy} aria-label="Close dialog">{closeText}</button>
      </div>
      {children}
    </section>
  </div>
);
