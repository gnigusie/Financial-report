import { useEffect, useState } from "react";
import { getCompanies, getSysadminSetupStatus, login, registerEmployee, registerSysadmin, resetPassword } from "../api";
import { useCached } from "../assets/cache";
import { Alert, Field, SelectField } from "../components/ui";
import { companyOptions, getErrorMessage } from "../assets/utils";
import { LoadingIndicator } from "../components/ui";

const MIN = "Minimum 8 characters.";
const NEW = { type: "password", autoComplete: "new-password" };
const USER = { autoComplete: "username" };
const EMPTY = { companyId: "", employeeId: "", password: "", confirm: "", setupKey: "" };
const TITLES = { signin: "Sign in to Rubani QA", create: "Create account", forgot: "Reset password", sysadmin: "Initial sysadmin setup" };
const loading = (text) => <LoadingIndicator text={text} inline />;
const SUBMIT = { signin: ["Sign in", loading("Signing in...")], create: ["Create account", loading("Please wait...")], forgot: ["Reset password", loading("Please wait...")], sysadmin: ["Create system administrator", loading("Creating...")] };
const FALLBACKS = { signin: "Unable to sign in.", create: "Could not create the account.", forgot: "Could not reset the password.", sysadmin: "Could not create the system administrator." };
const fieldsFor = (view) =>
  view === "signin"
    ? [["User ID", "loginUserId", "employeeId", USER], ["Password", "loginPassword", "password", { type: "password", autoComplete: "current-password" }]]
    : view === "sysadmin"
      ? [["Setup key", "sysadminSetupKey", "setupKey", { type: "password", autoComplete: "off" }], ["User ID", "sysadminUserId", "employeeId", USER], ["Password", "sysadminPassword", "password", { ...NEW, hint: MIN }], ["Confirm password", "sysadminConfirm", "confirm", NEW]]
      : [["Employee ID", "authEmployeeId", "employeeId", USER], [view === "create" ? "Password" : "New password", "authPassword", "password", { ...NEW, hint: MIN }], ["Confirm password", "authConfirm", "confirm", NEW]];
export default function AuthScreen({ onAuthenticated, notice: initialNotice = "" }) {
  const [view, setView] = useState("signin");
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(initialNotice);
  const [loading, setLoading] = useState(false);
  const [sysadminRegistered, setSysadminRegistered] = useState(null);
  const account = view === "create" || view === "forgot";
  const companies = useCached("companies", getCompanies, { enabled: account, onError: setError, fallback: "Could not load companies." });
  useEffect(() => {
    getSysadminSetupStatus().then((r) => setSysadminRegistered(r.sysadmin_registered)).catch(() => setSysadminRegistered(null));
  }, []);
  const set = (key) => (event) => (setF((c) => ({ ...c, [key]: event.target.value })), setError(""));
  function switchView(next, message = "") {
    setView(next);
    setError("");
    setNotice(message);
    setF((c) => ({ ...c, password: "", confirm: "", ...(next === "signin" && !message ? { employeeId: "" } : {}) }));
  }

  const validate = () => {
    if (view === "sysadmin" && !f.setupKey.trim()) return "Enter the setup key.";
    if (account && !f.companyId) return "Select your company.";
    if (!f.employeeId.trim()) return view === "signin" ? "Enter your employee ID." : "Enter your user ID.";
    if (view === "signin") return f.password ? "" : "Enter your password.";
    if (f.password.length < 8) return "The password must be at least 8 characters.";
    return f.password === f.confirm ? "" : "The passwords do not match.";
  };

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const invalid = validate();
    if (invalid) return setError(invalid);
    const id = f.employeeId.trim();
    setLoading(true);
    try {
      if (view === "signin") {
        const result = await login({ employeeId: id, password: f.password });
        if (!result.authenticated || !result.access_token) return setError("Authentication failed. Check your credentials.");
        onAuthenticated(result);
      } else if (view === "create") {
        await registerEmployee({ company_id: Number(f.companyId), employee_id: id, password: f.password });
        switchView("signin", "Account created. You can now sign in.");
      } else if (view === "forgot") {
        await resetPassword({ companyId: Number(f.companyId), employeeId: id, newPassword: f.password });
        switchView("signin", "Password updated. You can now sign in.");
      } else {
        await registerSysadmin({ employeeId: id, password: f.password }, f.setupKey.trim());
        setF((c) => ({ ...c, setupKey: "" }));
        switchView("signin", "System administrator created. You can now sign in.");
      }
    } catch (err) {
      setError(getErrorMessage(err, FALLBACKS[view]));
    } finally {
      setLoading(false);
    }
  }

  const links = view === "signin"
    ? [["Create account", "create"], ["Forgot password?", "forgot"]]
    : [["Back to sign in", "signin"], ...(account && sysadminRegistered === false ? [["Initial sysadmin setup", "sysadmin"]] : [])];

  return (
    <main className="login-screen">
      <section className="login-card">
        <h1>{TITLES[view]}</h1>
        <form className="form-stack" onSubmit={submit} noValidate>
          {account && <SelectField label="Company" name="authCompany" value={f.companyId} onChange={set("companyId")} options={companyOptions(companies.data?.companies || [], { value: "", label: "Select company" })} />}
          {fieldsFor(view).map(([label, name, key, extra]) => <Field key={name} label={label} name={name} value={f[key]} onChange={set(key)} {...extra} />)}
          {view === "signin" && notice && <Alert type="success">{notice}</Alert>}
          {error && <Alert type="error">{error}</Alert>}
          <button className="button button-primary button-full" type="submit" disabled={loading}>{SUBMIT[view][loading ? 1 : 0]}</button>
          <div className="auth-links">
            {links.map(([label, next]) => <button key={next} type="button" className="link-button" onClick={() => switchView(next)}>{label}</button>)}
          </div>
        </form>
      </section>
    </main>
  );
}
