import { useEffect, useState } from "react";
import { registerCompany, validateDatabaseUrl } from "../api";
import { INITIAL_COMPANY_FORM, WIZARD_STEPS } from "../assets/constants";
import { Alert, Field, LoadingIndicator, Panel, SelectField } from "../components/ui";
import { getErrorMessage, isCount } from "../assets/utils";

const MSG = "Enter a positive whole number.";
const numberOrNull = (value) => (value ? Number(value) : null);

export default function CompanyWizard({ databaseTypes, models, token, onCancel, onDone }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...INITIAL_COMPANY_FORM, source_db_type: databaseTypes[0] || "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [databaseOk, setDatabaseOk] = useState(false);
  const [error, setError] = useState("");
  const locked = busy || checking;
  const fieldError = (name, message) => setErrors((c) => ({ ...c, [name]: message }));

  useEffect(() => {
    if (!form.source_db_type && databaseTypes.length) setForm((c) => ({ ...c, source_db_type: databaseTypes[0] }));
  }, [databaseTypes, form.source_db_type]);

  function update({ target: { name, value } }) {
    setForm((c) => ({ ...c, [name]: value }));
    fieldError(name, "");
    if (name === "source_db_type" || name === "source_database_url") setDatabaseOk(false);
  }

  const bind = (name, label, extra) => ({ label, name, value: form[name], onChange: update, error: errors[name], ...extra });

  const rules = [
    () => ({ name: !form.name.trim() && "Enter the company name." }),
    () => ({ source_db_type: !form.source_db_type && "Select a database type.", source_database_url: !form.source_database_url.trim() && "Enter the connection URL." }),
    () => ({ admin_password: form.admin_password.length < 8 && "Use at least 8 characters.", admin_password_confirm: form.admin_password !== form.admin_password_confirm && "The passwords do not match." }),
    () => ({ llm_max_tokens: !isCount(form.llm_max_tokens, 1) && MSG, llm_timeout_seconds: !isCount(form.llm_timeout_seconds, 1) && MSG }),
  ];

  function validateStep(index) {
    const next = Object.fromEntries(Object.entries(rules[index]?.() || {}).filter(([, message]) => message));
    setErrors(next);
    return !Object.keys(next).length;
  }

  async function verifyDatabase() {
    if (!form.source_db_type || !form.source_database_url.trim()) return (fieldError("source_database_url", "Enter the connection URL."), false);
    setChecking(true);
    try {
      const result = await validateDatabaseUrl({ sourceDbType: form.source_db_type, sourceDatabaseUrl: form.source_database_url.trim() });
      if (result.valid !== true) return (fieldError("source_database_url", result.message || "Connection failed."), false);
      setDatabaseOk(true);
      fieldError("source_database_url", "");
      return true;
    } catch (err) {
      fieldError("source_database_url", getErrorMessage(err, "Connection failed."));
      return false;
    } finally {
      setChecking(false);
    }
  }

  async function next() {
    setError("");
    if (!validateStep(step) || (step === 1 && !databaseOk && !(await verifyDatabase()))) return;
    setStep((s) => s + 1);
  }

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const result = await registerCompany({
        name: form.name.trim(),
        source_db_type: form.source_db_type,
        source_database_url: form.source_database_url.trim(),
        document_path: form.document_path.trim() || null,
        admin_password: form.admin_password,
        llm_catalog_id: numberOrNull(form.llm_catalog_id),
        embedding_catalog_id: numberOrNull(form.embedding_catalog_id),
        llm_api_key: form.llm_api_key.trim() || null,
        llm_max_tokens: Number(form.llm_max_tokens),
        llm_timeout_seconds: Number(form.llm_timeout_seconds),
      }, token);
      onDone(result);
    } catch (err) {
      setError(getErrorMessage(err, "Company registration failed."));
    } finally {
      setBusy(false);
    }
  }

  const modelOptions = (kind, empty) => [{ value: "", label: empty }, ...models.filter((m) => m.kind === kind).map((m) => ({ value: String(m.catalog_id), label: `${m.provider} / ${m.model}` }))];
  const modelLabel = (id, fallback) => { const m = models.find((x) => String(x.catalog_id) === id); return m ? `${m.provider} / ${m.model}` : fallback; };
  const review = [
    ["Company name", form.name], ["Database type", form.source_db_type], ["Document path", form.document_path.trim() || "Not set"], ["Administrator ID", "Generated automatically"],
    ["Language model", modelLabel(form.llm_catalog_id, "Server default")], ["Embedding model", modelLabel(form.embedding_catalog_id, "None")],
    ["Max response tokens", form.llm_max_tokens], ["Timeout", `${form.llm_timeout_seconds} seconds`],
  ];

  const panels = [
    <div className="company-name-field"><Field {...bind("name", "Company name", { maxLength: 200, autoFocus: true })} /></div>,
    <div className="database-registration-row">
      <SelectField label="Database type" name="source_db_type" value={form.source_db_type} onChange={update} error={errors.source_db_type} disabled={!databaseTypes.length}
        options={databaseTypes.length ? databaseTypes.map((t) => ({ value: t, label: t })) : [{ value: "", label: "No enabled database types" }]} />
      <Field {...bind("source_database_url", "DB Connection URL", { type: "text", autoComplete: "off", success: databaseOk ? "Connection successful." : undefined, hint: "Use a read-only account." })} />
      <Field {...bind("document_path", "Document path (optional)", { type: "text", autoComplete: "off", error: undefined, hint: "Optional company report history documents." })} />
      <div className="database-registration-action">
        <button type="button" className="button button-secondary" onClick={verifyDatabase} disabled={locked || !databaseTypes.length}>{checking ? "Validating..." : "Validate"}</button>
      </div>
    </div>,
    <div className="admin-registration-fields">
      <Field label="Administrator ID" name="admin_id_display" value="Generated automatically" readOnly disabled hint="Assigned sequentially when the company is registered." />
      <Field {...bind("admin_password", "Password", { type: "password", autoComplete: "new-password", hint: "Minimum 8 characters.", maxLength: 200, autoFocus: true })} />
      <Field {...bind("admin_password_confirm", "Confirm password", { type: "password", autoComplete: "new-password", maxLength: 200 })} />
    </div>,
    <div className="model-settings-form">
      <SelectField label="Language model" name="llm_catalog_id" value={form.llm_catalog_id} onChange={update} options={modelOptions("llm", "Server default")} />
      <SelectField label="Embedding model" name="embedding_catalog_id" value={form.embedding_catalog_id} onChange={update} options={modelOptions("embedding", "None")} />
      <Field {...bind("llm_max_tokens", "Max response tokens", { type: "number" })} />
      <Field {...bind("llm_timeout_seconds", "Timeout (seconds)", { type: "number" })} />
    </div>,
    <div className="company-review">
      <dl className="review-list">{review.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
    </div>,
  ];

  return (
    <Panel title="Register company" action={<button type="button" className="button button-secondary" onClick={onCancel} disabled={locked}>Cancel</button>}>
      <ol className="stepper">
        {WIZARD_STEPS.map((label, index) => (
          <li key={label} className={`step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}>
            <button type="button" className="step-button" disabled={index >= step || locked} onClick={() => setStep(index)}>
              <span className="step-number">{index < step ? "✓" : index + 1}</span>
              <span className="step-label">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="wizard-body">
        {error && <Alert type="error">{error}</Alert>}
        {panels[step]}
      </div>
      <div className="wizard-actions">
        <button type="button" className="button button-secondary" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || locked}>Back</button>
        {step < WIZARD_STEPS.length - 1
          ? <button type="button" className="button button-primary" onClick={next} disabled={locked}>Continue</button>
          : <button type="button" className="button button-primary" onClick={submit} disabled={locked}>{busy ? <LoadingIndicator text="Registering..." inline /> : "Register company"}</button>}
      </div>
    </Panel>
  );
}
