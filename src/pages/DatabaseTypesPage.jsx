import { useState } from "react";
import { getDatabaseTypes, registerDatabaseType } from "../api";
import { useCached } from "../assets/cache";
import { useFeedback } from "../assets/hooks";
import { CheckboxField, DataTable, Feedback, Field, LoadingIndicator, Panel, Toggle } from "../components/ui";
import { getErrorMessage } from "../assets/utils";

export default function DatabaseTypesPage({ token }) {
  const fb = useFeedback();
  const { data, loading, reload } = useCached("dbtypes", getDatabaseTypes, { onError: fb.setError, fallback: "Could not load database types." });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [toggles, setToggles] = useState({});
  const rows = (data?.source_database_types || []).map((i) => (typeof i === "string" ? { type: i, enabled: true } : { type: i.source_db_type, enabled: i.enabled !== false }));

  async function handleSubmit(event) {
    event.preventDefault();
    fb.clearFeedback();
    if (!name.trim()) return fb.setError("Enter the database type.");
    setSaving(true);
    try {
      await registerDatabaseType({ source_db_type: name.trim().toLowerCase(), enabled }, token);
      fb.setSuccess(`Database type "${name.trim()}" saved.`);
      setName("");
      setEnabled(true);
      setShowForm(false);
      await reload();
    } catch (error) {
      fb.setError(getErrorMessage(error, "Could not save database type."));
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "type", label: "Type" },
    { key: "enabled", label: "Status", render: (r) => (r.enabled === true ? "Enabled" : "Disabled") },
    {
      key: "action",
      label: "Action",
      render: (r) => {
        const on = toggles[r.type] ?? (r.enabled !== false);
        return <Toggle on={on} title="Toggle database type status" label={`Toggle status for ${r.type}`} onClick={() => (setToggles((p) => ({ ...p, [r.type]: !on })), fb.setSuccess("The feature is under development."))} />;
      },
    },
  ];

  return (
    <div className="page-stack">
      <Feedback feedback={fb} />
      <Panel title="Ok to Use" action={<button className={`button ${showForm ? "button-secondary" : "button-primary"}`} type="button" onClick={() => setShowForm((p) => !p)}>{showForm ? "Cancel" : "+ Add database"}</button>}>
        {showForm && (
          <form className="database-type-form" onSubmit={handleSubmit} noValidate>
            <div className="database-type-form-row">
              <div className="database-type-name"><Field label="Name" name="databaseType" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="database-type-enabled"><CheckboxField name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} title="Enabled" /></div>
              <div className="database-type-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? <LoadingIndicator text="Saving..." inline /> : "Save"}</button></div>
            </div>
          </form>
        )}
        {loading ? <LoadingIndicator text="Loading..." /> : rows.length === 0 ? <div className="empty-state">No database types configured.</div> : <DataTable rowKey={(r) => r.type} columns={columns} rows={rows} />}
      </Panel>
    </div>
  );
}
