import { useState } from "react";
import { getCompanies, getDatabaseTypes, getRegisteredModels, updateCompanyExcelUpload } from "../api";
import { invalidate, useCached } from "../assets/cache";
import { useFeedback } from "../assets/hooks";
import { DataTable, Feedback, LoadingIndicator, Panel, Toggle } from "../components/ui";
import { getErrorMessage, normalizeDatabaseTypes } from "../assets/utils";
import CompanyWizard from "./CompanyWizard";

export default function CompaniesPage({ token }) {
  const fb = useFeedback();
  const opts = { onError: fb.setError, fallback: "Could not load company data." };
  const companies = useCached("companies", getCompanies, opts);
  const models = useCached("models", getRegisteredModels, opts);
  const dbTypes = useCached("dbtypes", getDatabaseTypes, opts);
  const [showWizard, setShowWizard] = useState(false);
  const [updating, setUpdating] = useState([]);
  const [statusToggles, setStatusToggles] = useState({});
  const loading = companies.loading || models.loading || dbTypes.loading;

  async function toggleExcel(company) {
    const next = company.excel_upload_enabled !== true;
    setUpdating((p) => [...p, company.company_id]);
    try {
      await updateCompanyExcelUpload(token, company.company_id, next);
      companies.mutate((r) => ({ ...r, companies: r.companies.map((c) => (c.company_id === company.company_id ? { ...c, excel_upload_enabled: next } : c)) }));
      fb.setSuccess(`Excel uploads ${next ? "enabled" : "disabled"} for ${company.name}.`);
    } catch (error) {
      fb.setError(getErrorMessage(error, "Could not update Excel upload setting."));
    } finally {
      setUpdating((p) => p.filter((id) => id !== company.company_id));
    }
  }

  if (showWizard) {
    return (
      <CompanyWizard
        databaseTypes={normalizeDatabaseTypes(dbTypes.data)}
        models={models.data?.models || []}
        token={token}
        onCancel={() => setShowWizard(false)}
        onDone={async (result) => {
          setShowWizard(false);
          fb.setSuccess(`Company "${result.name}" registered. Company ID: ${result.company_id}. Administrator: ${result.admin_employee_id}.`);
          invalidate("analytics");
          await companies.reload();
        }}
      />
    );
  }

  const columns = [
    { key: "company_id", label: "Company ID" },
    { key: "name", label: "Company Name" },
    { key: "source_db_type", label: "Database Type" },
    { key: "max_tables_per_question", label: "Max Tables" },
    { key: "llm_max_tokens", label: "LLM Max Tokens" },
    { key: "llm_timeout_seconds", label: "LLM Timeout (s)" },
    { key: "document_retrieval_enabled", label: "Document Retrieval", render: (c) => (c.document_retrieval_enabled ? "Enabled" : "Disabled") },
    {
      key: "excel_upload_enabled",
      label: "Excel Upload",
      render: (c) => {
        const on = c.excel_upload_enabled === true;
        return <Toggle on={on} disabled={updating.includes(c.company_id)} onClick={() => toggleExcel(c)} title={`Excel uploads ${on ? "enabled" : "disabled"}`} label={`Toggle Excel uploads for ${c.name}`} />;
      },
    },
    {
      key: "action",
      label: "Status",
      render: (c) => {
        const on = statusToggles[c.company_id] ?? (c.enabled !== false);
        return <Toggle on={on} title="Toggle company status" label={`Toggle status for ${c.name}`} onClick={() => (setStatusToggles((p) => ({ ...p, [c.company_id]: !on })), fb.setSuccess("The feature is under development."))} />;
      },
    },
  ];
  const rows = companies.data?.companies || [];

  return (
    <div className="page-stack">
      <Feedback feedback={fb} />
      <Panel title="Onboarding" action={<button className="button button-primary" type="button" disabled={loading} onClick={() => (fb.clearFeedback(), setShowWizard(true))}>+ Add company</button>}>
        {loading ? <LoadingIndicator text="Loading..." /> : rows.length === 0 ? <div className="empty-state">No companies registered.</div> : <DataTable rowKey={(c) => c.company_id} columns={columns} rows={rows} />}
      </Panel>
    </div>
  );
}
