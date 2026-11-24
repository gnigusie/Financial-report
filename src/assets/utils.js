export const getErrorMessage = (error, fallback) => (error instanceof Error && error.message ? error.message : fallback);
export const normalizeDatabaseTypes = (result) => (result?.source_database_types || []).map((item) => (typeof item === "string" ? item : item.source_db_type)).filter(Boolean);
export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};
export const formatNumber = (value) => (typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—");
export const displayValue = (value) => (value === null || value === undefined || value === "" ? "Not available" : String(value));
export const cellText = (value) => (value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value));
export const companyOptions = (companies, first) => [first, ...companies.map((c) => ({ value: String(c.company_id), label: c.name }))];
export const isCount = (value, min = 0) => Number.isInteger(Number(value)) && Number(value) >= min;
export function downloadText(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}
export function parseResponse(text) {
  const t = String(text || "").trim();
  if (!t) return { answer: "", summary: "" };
  const a = t.match(/^\s*(?:\*\*)?Answer(?:\*\*)?\s*:\s*/i);
  const s = t.match(/\s*(?:\*\*)?Detailed summary(?:\*\*)?\s*:\s*/i);
  const summary = s ? t.slice(s.index + s[0].length).trim() : "";
  if (a) return { answer: (s ? t.slice(a[0].length, s.index) : t.slice(a[0].length)).trim() || t, summary };
  return s ? { answer: "", summary } : { answer: "", summary: t };
}
