import { useState } from "react";
import { getRegisteredModels, registerModel } from "../api";
import { useCached } from "../assets/cache";
import { useFeedback } from "../assets/hooks";
import { DataTable, Feedback, Field, LoadingIndicator, Panel, SelectField } from "../components/ui";
import { getErrorMessage } from "../assets/utils";

const EMPTY = { kind: "llm", provider: "openrouter", model: "", route_key: "" };
const KINDS = [{ value: "llm", label: "Language model" }, { value: "embedding", label: "Embedding model" }];
const PROVIDERS = [{ value: "openrouter", label: "OpenRouter" }, { value: "ollama", label: "Ollama" }];
const COLUMNS = [
  { key: "catalog_id", label: "ID" },
  { key: "kind", label: "Type", render: (m) => (m.kind == null || m.kind === "" ? "—" : String(m.kind)) },
  { key: "provider", label: "Provider" },
  { key: "model", label: "Model" },
];

export default function ModelsPage({ token }) {
  const fb = useFeedback();
  const { data, loading, reload } = useCached("models", getRegisteredModels, { onError: fb.setError, fallback: "Could not load models." });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const models = data?.models || [];
  const router = form.provider === "openrouter";
  const set = (key) => (event) => setForm((c) => ({ ...c, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    fb.clearFeedback();
    if (!form.model.trim()) return fb.setError("Enter the model name.");
    if (router && !form.route_key.trim()) return fb.setError("Route key is required for OpenRouter.");
    setSaving(true);
    try {
      await registerModel({ kind: form.kind, provider: form.provider, model: form.model.trim(), ...(router ? { route_key: form.route_key.trim() } : {}) }, token);
      fb.setSuccess("Model registered.");
      setShowForm(false);
      setForm(EMPTY);
      await reload();
    } catch (error) {
      fb.setError(getErrorMessage(error, "Could not register the model."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <Feedback feedback={fb} />
      <Panel title="Active Models" action={<button className={`button ${showForm ? "button-secondary" : "button-primary"}`} type="button" onClick={() => setShowForm((p) => !p)}>{showForm ? "Cancel" : "+ Add model"}</button>}>
        {showForm && (
          <form className="form-stack model-register-form" onSubmit={handleSubmit} noValidate>
            <div className="form-grid-three">
              <SelectField label="Type" name="modelKind" value={form.kind} onChange={set("kind")} options={KINDS} />
              <SelectField label="Provider" name="modelProvider" value={form.provider} onChange={set("provider")} options={PROVIDERS} />
              <Field label="Model name" name="modelName" value={form.model} onChange={set("model")} required />
            </div>
            {router && <Field label="Route key" name="modelRouteKey" type="password" autoComplete="off" value={form.route_key} onChange={set("route_key")} required />}
            <div className="form-actions">
              <button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoadingIndicator text="Registering..." inline /> : "Register model"}</button>
            </div>
          </form>
        )}
        {loading ? <LoadingIndicator text="Loading..." /> : models.length === 0 ? <div className="empty-state">No models registered.</div> : <DataTable rowKey={(m) => m.catalog_id} columns={COLUMNS} rows={models} />}
      </Panel>
    </div>
  );
}
