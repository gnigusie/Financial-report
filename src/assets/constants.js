export const NAVIGATION = [
  { id: "reports", label: "Summary", roles: ["admin", "sysadmin"] },
  { id: "settings", label: "Company settings", roles: ["admin"] },
  { id: "employees", label: "Users", roles: ["admin"] },
  { id: "companies", label: "Companies", roles: ["sysadmin"] },
  { id: "models", label: "Models", roles: ["sysadmin"] },
  { id: "databases", label: "Databases", roles: ["sysadmin"] },
  { id: "queries", label: "Ask me", roles: ["admin", "employee", "sysadmin"] },
];
export const ROLE_LABELS = { sysadmin: "System-Level", admin: "Company-Level", employee: "Staff" };
export const WIZARD_STEPS = ["Company", "Database", "Administrator", "Models", "Review"];
export const INITIAL_COMPANY_FORM = {
  name: "", source_db_type: "postgresql", source_database_url: "", document_path: "", admin_password: "", admin_password_confirm: "",
  llm_catalog_id: "", embedding_catalog_id: "", llm_api_key: "", llm_max_tokens: "2048", llm_timeout_seconds: "180",
};
