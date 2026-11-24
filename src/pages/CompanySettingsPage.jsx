import { useEffect, useState } from "react";
import { getCompanySettings, getCompanySourceSchema, getSchemaSyncProgress, synchronizeCompanySchema, updateCompanySettings, uploadCompanyExcel } from "../api";
import { invalidate, useCached } from "../assets/cache";
import { useFeedback } from "../assets/hooks";
import { CheckboxField, DataTable, Feedback, Field, HelpTooltip, LoadingIndicator, Modal, Panel } from "../components/ui";
import { getErrorMessage, isCount } from "../assets/utils";

const FLAGS = [
  ["schema_ranking_enabled", "Enable schema ranking", "Selects the most relevant database tables for each question."],
  ["sql_correction_enabled", "Enable SQL correction", "Allows the system to retry a query after an SQL error."],
  ["document_retrieval_enabled", "Enable document retrieval", "Enables retrieval of relevant information from uploaded documents."],
];
const NUMBERS = [
  ["max_tables_per_question", "Maximum tables per question", "Sets the maximum number of tables considered for a query.", "0 means no limit."],
  ["sample_rows_per_table", "Sample rows per table", "Sets how many example rows are used to understand table contents.", "0 disables samples."],
];
const withTip = (label, tip) => <>{label}<HelpTooltip text={tip} /></>;
const count = (value) => (Array.isArray(value) ? value.length : String(value ?? 0));

function normalize(result) {
  const d = result.settings || result.company_settings || result;
  return {
    employee_table: d.employee_table || "",
    employee_id_column: d.employee_id_column || "",
    selected_schema_tables: d.selected_schema_tables || [],
    schema_ranking_enabled: Boolean(d.schema_ranking_enabled),
    max_tables_per_question: Number(d.max_tables_per_question ?? 0),
    sample_rows_per_table: Number(d.sample_rows_per_table ?? 0),
    sql_correction_enabled: Boolean(d.sql_correction_enabled),
    document_retrieval_enabled: Boolean(d.document_retrieval_enabled),
    excel_upload_enabled: d.excel_upload_enabled === true,
  };
}

function useSchemaSync(token, fb) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  async function start() {
    fb.clearFeedback();
    setSyncing(true);
    setResult(null);
    setProgress({ status: "", stage: "", message: "Schema sync", current: 0, total: 0 });
    try {
      await synchronizeCompanySchema(token);
      while (true) {
        const p = await getSchemaSyncProgress(token);
        setProgress(p);
        if (p.status === "completed") {
          setResult(p.result);
          invalidate("analytics");
          fb.setSuccess("Schema synchronized successfully.");
          break;
        }
        if (p.status === "failed") throw new Error(p.message || "Schema synchronization failed.");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      const message = getErrorMessage(error, "Schema synchronization failed.");
      setProgress((c) => ({ ...c, status: "failed", message }));
      fb.setError(message);
    } finally {
      setSyncing(false);
    }
  }
  return { syncing, progress, result, setResult, start };
}

function SyncProgress({ progress }) {
  return (
    <div className="schema-sync-progress" role="status" aria-live="polite">
      <div className="schema-sync-status">
        <span className="spinner" aria-hidden="true" />
        <div className="schema-sync-status-text">
          <strong>{progress.message || "Synchronizing schema..."}</strong>
          {progress.stage && <span>Stage: {progress.stage}</span>}
        </div>
      </div>
      {progress.total > 0
        ? <progress value={progress.current || 0} max={progress.total} className="schema-sync-progress-bar" aria-label="Schema synchronization progress" />
        : <div className="schema-sync-indeterminate" aria-hidden="true"><span /></div>}
    </div>
  );
}

function ExcelUploadModal({ token, fb, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    fb.clearFeedback();
    if (!file) return fb.setError("Select an Excel workbook.");
    if (!file.name.toLowerCase().endsWith(".xlsx")) return fb.setError("Only .xlsx files are supported.");
    if (file.size > 20 * 1024 * 1024) return fb.setError("The workbook must not exceed 20 MB.");
    setUploading(true);
    try {
      await uploadCompanyExcel(file, token);
      onClose();
      fb.setSuccess("Excel workbook uploaded successfully.");
    } catch (error) {
      fb.setError(getErrorMessage(error, "Could not upload the Excel workbook."));
      setUploading(false);
    }
  }

  return (
    <Modal id="excel-upload-title" title="Upload Excel" className="excel-upload-modal" busy={uploading} onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Excel Data</span>
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading} />
        </label>
        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={!file || uploading}>
            {uploading ? <LoadingIndicator text="Uploading..." inline /> : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TableSelector({ tables, selected, onChange, loading }) {
  const [search, setSearch] = useState("");
  const visible = tables.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()));
  const allSelected = visible.length > 0 && visible.every((t) => selected.includes(t.name));
  const toggleOne = (name) => onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);
  const toggleAll = () => {
    const names = visible.map((t) => t.name);
    onChange(allSelected ? selected.filter((n) => !names.includes(n)) : [...new Set([...selected, ...names])]);
  };
  return (
    <div className="schema-table-selector">
      <h3>Source database tables</h3>
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tables..." aria-label="Search source tables" />
      <div className="schema-table-actions">
        <label className="schema-table-select-all">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={loading || visible.length === 0} />
          <span>Select all</span>
        </label>
        <span>{selected.length} selected</span>
      </div>
      {loading ? <LoadingIndicator text="Loading source tables..." /> : visible.length === 0 ? <p>No matching tables found.</p> : (
        <div className="schema-table-list">
          {visible.map((t) => (
            <label key={t.name} className="schema-table-option">
              <input type="checkbox" checked={selected.includes(t.name)} onChange={() => toggleOne(t.name)} />
              <span>{t.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfigureModal({ settings, setSettings, tables, tablesLoading, saving, onSubmit, onReset, onClose }) {
  const update = ({ target: { name, value, type, checked } }) => setSettings((c) => ({ ...c, [name]: type === "checkbox" ? checked : value }));
  const columns = tables.find((t) => t.name === settings.employee_table)?.columns || [];
  return (
    <Modal id="configure-company-title" title="Configure company" closeText="Cancel" busy={saving} onClose={onClose}>
      <form className="form-stack" onSubmit={onSubmit} noValidate>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Employee table</span>
            <select name="employee_table" value={settings.employee_table} disabled={tablesLoading} onChange={(e) => setSettings((c) => ({ ...c, employee_table: e.target.value, employee_id_column: "" }))}>
              {tablesLoading ? <option value="">Loading source tables...</option> : <><option value="">Select employee table</option>{tables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}</>}
            </select>
            {tablesLoading && <LoadingIndicator text="Loading source tables..." inline />}
          </label>
          <label className="field">
            <span className="field-label">Employee ID column</span>
            <select name="employee_id_column" value={settings.employee_id_column} onChange={update} disabled={!settings.employee_table}>
              <option value="">Select employee ID column</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          {NUMBERS.map(([name, label, tip, hint]) => <Field key={name} label={withTip(label, tip)} name={name} type="number" min="0" value={String(settings[name])} onChange={update} hint={hint} />)}
        </div>
        <TableSelector tables={tables} loading={tablesLoading} selected={settings.selected_schema_tables || []} onChange={(list) => setSettings((c) => ({ ...c, selected_schema_tables: list }))} />
        <div className="settings-checkboxes">
          {FLAGS.map(([name, label, tip]) => <CheckboxField key={name} name={name} checked={settings[name]} onChange={update} title={withTip(label, tip)} />)}
        </div>
        <div className="form-actions form-actions-center">
          <button type="button" className="button button-secondary" onClick={onReset} disabled={saving}>Reset</button>
          <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function CompanySettingsPage({ token }) {
  const fb = useFeedback();
  const server = useCached(`settings:${token}`, async () => normalize(await getCompanySettings(token)), { onError: fb.setError, fallback: "Could not load company settings." });
  const schema = useCached(`schema:${token}`, () => getCompanySourceSchema(token), { onError: fb.setError, fallback: "Could not load source database tables." });
  const sync = useSchemaSync(token, fb);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showConfigure, setShowConfigure] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const tables = Array.isArray(schema.data?.tables) ? schema.data.tables : [];

  useEffect(() => { if (server.data) setSettings(server.data); }, [server.data]);

  if (!settings) {
    return <div className="page-stack"><Feedback feedback={fb} /><Panel>{server.loading ? <LoadingIndicator text="Loading..." /> : <div className="empty-state">Settings unavailable.</div>}</Panel></div>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    fb.clearFeedback();
    if (Boolean(settings.employee_table.trim()) !== Boolean(settings.employee_id_column.trim())) return fb.setError("Enter both the employee table and the ID column, or leave both empty.");
    for (const [name, label] of NUMBERS) if (!isCount(settings[name])) return fb.setError(`${label} must be zero or a positive whole number.`);
    setSaving(true);
    try {
      const result = await updateCompanySettings({
        employee_table: settings.employee_table.trim() || null,
        employee_id_column: settings.employee_id_column.trim() || null,
        selected_schema_tables: settings.selected_schema_tables || [],
        schema_ranking_enabled: settings.schema_ranking_enabled,
        max_tables_per_question: Number(settings.max_tables_per_question),
        sample_rows_per_table: Number(settings.sample_rows_per_table),
        sql_correction_enabled: settings.sql_correction_enabled,
        document_retrieval_enabled: settings.document_retrieval_enabled,
      }, token);
      if (result?.schema_sync) sync.setResult(result.schema_sync);
      await server.reload();
      setShowConfigure(false);
      fb.setSuccess("Settings saved.");
    } catch (error) {
      fb.setError(getErrorMessage(error, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  }

  const rows = [
    ["Employee table", settings.employee_table || "—"],
    ["Employee ID column", settings.employee_id_column || "—"],
    ...NUMBERS.map(([name, label]) => [label, String(settings[name])]),
    ...FLAGS.map(([name, label]) => [label, settings[name] ? "Enabled" : "Disabled"]),
  ];

  return (
    <div className="page-stack">
      <Feedback feedback={fb} />
      <Panel>
        <div className="settings-panel-header">
          <h2>Settings</h2>
          <div className="settings-header-actions">
            {settings.excel_upload_enabled && <button type="button" className="button button-secondary" onClick={() => (fb.clearFeedback(), setShowExcel(true))} disabled={sync.syncing || saving}>Upload Excel</button>}
            <button type="button" className="button button-secondary" onClick={sync.start} disabled={sync.syncing || saving}>{sync.syncing ? "Synchronizing..." : "Synchronize"}</button>
            <button type="button" className="button button-primary" onClick={() => (fb.clearFeedback(), setShowConfigure(true))} disabled={saving}>Configure</button>
          </div>
        </div>
        <div className="settings-table-wrapper">
          <table className="settings-summary-table">
            <thead><tr>{rows.map(([label]) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody><tr>{rows.map(([label, value]) => <td key={label}>{value}</td>)}</tr></tbody>
          </table>
        </div>
        {sync.syncing && sync.progress && <SyncProgress progress={sync.progress} />}
        {sync.result && <DataTable columns={[{ key: "indexed", label: "Tables indexed" }, { key: "deleted", label: "Tables removed" }]} rows={[{ indexed: count(sync.result.indexed_tables), deleted: count(sync.result.deleted_tables) }]} />}
      </Panel>
      {settings.excel_upload_enabled && showExcel && <ExcelUploadModal token={token} fb={fb} onClose={() => setShowExcel(false)} />}
      {showConfigure && <ConfigureModal settings={settings} setSettings={setSettings} tables={tables} tablesLoading={schema.loading} saving={saving} onSubmit={handleSubmit} onReset={() => setSettings(server.data)} onClose={() => setShowConfigure(false)} />}
    </div>
  );
}
