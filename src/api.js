const API_BASE_URL = "/api";
const CONNECTION_ERROR = "Unable to connect to the server. Please try again later.";
const UNAVAILABLE_ERROR = "The server is temporarily unavailable. Please try again later.";
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const statusMessage = (status, result) =>
  status === 502 ? UNAVAILABLE_ERROR
  : status === 503 ? "The service is temporarily unavailable. Please try again shortly."
  : status === 504 ? "The request timed out. Please try again."
  : result.detail || result.message || `Request failed (${status}).`;

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }
  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      const contentType = response.headers.get("content-type") || "";
      const looksLikeHtml = contentType.includes("text/html") || /^\s*<!doctype html/i.test(responseText) || /^\s*<html(?:\s|>)/i.test(responseText);
      if (looksLikeHtml) throw new Error(UNAVAILABLE_ERROR);
      result = { detail: responseText };
    }
  }
  if (!response.ok) {
    const errorMessage = statusMessage(response.status, result);
    if (response.status === 401 && !["/login", "/account-setup-status"].includes(path)) window.dispatchEvent(new Event("rubani:session-expired"));
    throw new Error(errorMessage);
  }
  return result;
}

const postJson = (path, data, headers = {}) => request(path, { method: "POST", headers, body: JSON.stringify(data) });
const patchJson = (path, data, token) => request(path, { method: "PATCH", headers: auth(token), body: JSON.stringify(data) });
const getAuth = (path, token) => request(path, { headers: auth(token) });

export const login = ({ employeeId, password }) => postJson("/login", { employee_id: employeeId, password });
export const registerSysadmin = ({ employeeId, password }, setupKey) => postJson("/add-sysadmin", { employee_id: employeeId, password }, { "x-setup-key": setupKey });
export const getSysadminSetupStatus = () => request("/account-setup-status");
export const resetPassword = ({ companyId, employeeId, newPassword }) => postJson("/reset-password", { company_id: Number(companyId), employee_id: employeeId, new_password: newPassword });
export const getCompanies = () => request("/registered-companies-list");
export const getRegisteredModels = () => request("/Registered-models");
export const getDatabaseTypes = () => request("/allowed-db-lists");
export const validateDatabaseUrl = ({ sourceDbType, sourceDatabaseUrl }) => postJson("/validate-database-url", { source_db_type: sourceDbType, source_database_url: sourceDatabaseUrl });
export const registerCompany = (data, token) => postJson("/add-new-company", data, auth(token));
export const registerModel = (data, token) => postJson("/add-new-llm", data, auth(token));
export const registerDatabaseType = (data, token) => postJson("/add-new-db-source", data, auth(token));
export const getCompanySettings = (token) => getAuth("/company-setting", token);
export const updateCompanySettings = (data, token) => patchJson("/config-company-setting", data, token);
export const getCompanyUsers = (token) => getAuth("/company-users", token);
export const registerEmployee = (data) => postJson("/register", data);
export const synchronizeCompanySchema = (token) => postJson("/schema-sync", {}, auth(token));
export const getSchemaSyncProgress = (token) => getAuth("/schema-sync/progress", token);
export const submitFinancialQuery = (question, token, companyId) => postJson("/query", companyId ? { question, company_id: companyId } : { question }, auth(token));
export const getCompanySourceSchema = (token) => getAuth("/company/source-schema", token);
export const getSchemaInspectionSettings = (token) => getAuth("/company/schema-inspection-settings", token);
export const updateSchemaInspectionSettings = (data, token) => patchJson("/company/schema-inspection-settings", data, token);

export function getSystemAnalytics(token, companyId) {
  const query = companyId !== undefined && companyId !== null ? `?company_id=${encodeURIComponent(companyId)}` : "";
  return getAuth(`/reports/system-analytics${query}`, token);
}

export function getAvailableCompanyEmployees(token, search = "") {
  const query = new URLSearchParams({ search, limit: "500" });
  return getAuth(`/company/available-employees?${query.toString()}`, token);
}

export const generateEmployeeAccounts = (employeeIds, token) => postJson("/company/generate-employee-accounts", { employee_ids: employeeIds }, auth(token));

export async function uploadCompanyExcel(file, token) {
  const formData = new FormData();
  formData.append("file", file);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/company/upload-excel`, { method: "POST", headers: auth(token), body: formData });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }
  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { detail: responseText };
    }
  }
  if (!response.ok) {
    const errorMessage = statusMessage(response.status, result);
    if (response.status === 401) window.dispatchEvent(new Event("rubani:session-expired"));
    throw new Error(errorMessage);
  }
  return result;
}

export const updateCompanyExcelUpload = (token, companyId, enabled) => patchJson(`/sysadmin/companies/${companyId}/excel-upload`, { enabled }, token);