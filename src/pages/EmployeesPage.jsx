import { useState } from "react";
import { generateEmployeeAccounts, getAvailableCompanyEmployees, getCompanyUsers } from "../api";
import { cached, invalidate, useCached } from "../assets/cache";
import { useFeedback } from "../assets/hooks";
import { DataTable, Feedback, LoadingIndicator, Modal, Panel } from "../components/ui";
import { formatDate, getErrorMessage } from "../assets/utils";

const USER_COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "role", label: "Role" },
  { key: "created_at", label: "Registered", render: (e) => formatDate(e.created_at) },
];

function composeEmail(accounts) {
  const body = "Hello,\n\nYour employee account has been created.\n\nPlease find your temporary login credentials below:\n\n"
    + accounts.map((a) => `Employee ID: ${a.employee_id}\nTemporary password: ${a.temporary_password}`).join("\n\n")
    + "\n\nPlease change your password after signing in.\n\nRegards";
  window.location.href = `mailto:?subject=${encodeURIComponent("Employee account credentials")}&body=${encodeURIComponent(body)}`;
}

function AccountResults({ result }) {
  const { created_accounts: created, skipped_employee_ids: skipped } = result;
  return (
    <div className="account-generation-results">
      <h3>Account generation results</h3>
      <p className="account-generation-summary">Created: <strong>{result.created_count}</strong>{" · "}Skipped: <strong>{result.skipped_count}</strong></p>
      {created.length > 0 && (
        <>
          <div className="account-generation-toolbar">
            <p className="account-generation-note">Temporary passwords are shown below. Copy and distribute them securely.</p>
            <button type="button" className="button button-primary" onClick={() => composeEmail(created)}>Compose email</button>
          </div>
          <div className="account-results-table-wrapper">
            <table className="account-results-table">
              <thead><tr><th>Employee ID</th><th>Temporary password</th><th className="account-copy-header">Action</th></tr></thead>
              <tbody>
                {created.map((a) => (
                  <tr key={a.user_id}>
                    <td className="account-employee-id">{a.employee_id}</td>
                    <td><code className="temporary-password">{a.temporary_password}</code></td>
                    <td className="account-copy-cell"><button type="button" className="button account-copy-button" onClick={() => navigator.clipboard.writeText(a.temporary_password)}>Copy</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {skipped.length > 0 && (
        <details className="account-skipped-details">
          <summary>Skipped employee IDs ({skipped.length})</summary>
          <ul>{skipped.map((id) => <li key={id}>{id}</li>)}</ul>
        </details>
      )}
    </div>
  );
}

export default function EmployeesPage({ user }) {
  const token = user.access_token;
  const fb = useFeedback();
  const { data, loading, reload } = useCached(`users:${token}`, () => getCompanyUsers(token), { onError: fb.setError, fallback: "Could not load employees." });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const users = data?.users || [];
  const registered = new Set(users.map((u) => String(u.employee_id)));
  const allSelected = available.length > 0 && available.every((e) => selected.includes(e.employee_id));

  async function loadAvailable(term = "", force = false) {
    setLoadingSource(true);
    try {
      const r = await cached(`emp:${token}:${term}`, () => getAvailableCompanyEmployees(token, term), force);
      setAvailable(r.employees || []);
    } catch (error) {
      fb.setError(getErrorMessage(error, "Could not load employees from the source database."));
    } finally {
      setLoadingSource(false);
    }
  }

  async function openDialog() {
    fb.clearFeedback();
    setSearch("");
    setSelected([]);
    setResult(null);
    setAvailable([]);
    setOpen(true);
    await loadAvailable("");
  }

  function changeSearch(event) {
    const term = event.target.value;
    setSearch(term);
    setSelected([]);
    setResult(null);
    loadAvailable(term);
  }

  const toggleOne = (id, checked) => setSelected((c) => (checked ? (c.includes(id) ? c : [...c, id]) : c.filter((s) => s !== id)));
  const toggleAll = (checked) => {
    const ids = available.map((e) => e.employee_id);
    setSelected((c) => (checked ? [...new Set([...c, ...ids])] : c.filter((id) => !ids.includes(id))));
  };

  async function generate() {
    fb.clearFeedback();
    setResult(null);
    if (!selected.length) return fb.setError("Select at least one employee.");
    setSaving(true);
    try {
      const r = await generateEmployeeAccounts(selected, token);
      setResult(r);
      setSelected([]);
      fb.setSuccess(`Account generation completed. Created: ${r.created_count}. Skipped: ${r.skipped_count}.`);
      invalidate("emp:");
      invalidate("analytics");
      await Promise.all([reload(), loadAvailable(search, true)]);
    } catch (error) {
      fb.setError(getErrorMessage(error, "Could not generate employee accounts."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <Feedback feedback={fb} />
      <Panel title="Registered Accounts" action={<button type="button" className="button button-primary" onClick={openDialog}>Generate Acc</button>}>
        {loading ? <LoadingIndicator text="Loading..." /> : users.length === 0 ? <div className="empty-state">No employees found.</div> : <DataTable rowKey={(e) => e.user_id} columns={USER_COLUMNS} rows={users} />}
      </Panel>
      {open && (
        <Modal id="employee-dialog-title" title="Generate employee accounts" closeText="Close" className="employee-modal" busy={saving} onClose={() => setOpen(false)}>
          <input className="employee-search" id="employee-source-search" type="search" value={search} onChange={changeSearch} placeholder="Enter an employee name or ID" disabled={saving} />
          <div className="employee-picker-count">{selected.length} selected</div>
          <div className="employee-picker-table-wrapper">
            {loadingSource ? <LoadingIndicator text="Loading employees..." /> : available.length === 0 ? <div className="empty-state">No source employees found.</div> : (
              <table className="employee-picker-table">
                <thead>
                  <tr>
                    <th className="employee-picker-checkbox-cell"><input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} disabled={saving} aria-label="Select all displayed employees" /></th>
                    <th>Employee ID</th><th>Employee Name</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {available.map((e) => {
                    const id = String(e.employee_id);
                    const taken = registered.has(id);
                    return (
                      <tr key={id}>
                        <td className="employee-picker-checkbox-cell"><input type="checkbox" checked={selected.includes(e.employee_id)} onChange={(ev) => toggleOne(e.employee_id, ev.target.checked)} disabled={saving || taken} aria-label={`Select employee ${id}`} /></td>
                        <td className="employee-picker-id">{id}</td>
                        <td className="employee-picker-name">{(e.display_name || e.employee_name || "—").replace(/\s*\(EMP\d+\)\s*$/, "")}</td>
                        <td>{taken ? "Already registered" : "Available"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p className="employee-picker-note">The list shows up to 500 matching employees. Search to find employees not currently displayed.</p>
          <div className="form-actions">
            <button className="button button-primary" type="button" disabled={saving || loadingSource || !selected.length} onClick={generate}>{saving ? <LoadingIndicator text="Registering..." inline /> : "Generate accounts"}</button>
          </div>
          {result && <AccountResults result={result} />}
        </Modal>
      )}
    </div>
  );
}
