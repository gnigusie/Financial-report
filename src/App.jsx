import { useEffect, useRef, useState } from "react";
import "./assets/App.css";

const API_BASE_URL = "/api";
const CONNECTION_ERROR = "Unable to connect to the server. Please try again later.";
const UNAVAILABLE_ERROR = "The server is temporarily unavailable. Please try again later.";
const ACCEPTED_SUFFIXES = [".pdf", ".xlsx", ".xlsm", ".csv"];
const STATUS_LABELS = {
  waiting: "Waiting",
  working: "Processing",
  new: "Ingested",
  updated: "Updated",
  unchanged: "Already ingested",
  failed: "Failed",
};

const EXTRA_STYLES = `
[hidden] { display: none !important; }
.rq-shell { height: 100vh; display: flex; flex-direction: column; background: #f4f5f7; color: #101828; }
.rq-head { display: flex; align-items: center; gap: 40px; height: 60px; flex-shrink: 0; padding: 0 32px; background: #fff; border-bottom: 1px solid #e4e7ec; }
.rq-head h1 { margin: 0; font-size: 17px; font-weight: 700; }
.rq-head p { margin: 0 0 0 auto; font-size: 12px; color: #667085; }
.rq-tabs { display: flex; gap: 28px; height: 100%; }
.rq-tab { height: 100%; padding: 0 2px; border: 0; border-bottom: 2px solid transparent; background: none; color: #667085; font-size: 14px; font-weight: 500; cursor: pointer; }
.rq-tab:hover { color: #101828; }
.rq-tab.active { color: #2f5bea; border-bottom-color: #2f5bea; }
.rq-main { flex: 1; min-height: 0; overflow: auto; padding: 32px 24px; }
.rq-pane { max-width: 760px; margin: 0 auto; }
.rq-pane.rq-ask { max-width: 1180px; height: 100%; }
.rq-ask-row { display: flex; justify-content: center; gap: 20px; height: 100%; }
.rq-ask-row > .rq-chat-panel { flex: 0 1 860px; min-width: 0; }
.rq-shell .panel { background: #fff; border: 1px solid #e4e7ec; border-radius: 12px; box-shadow: 0 1px 3px rgba(16,24,40,.06); overflow: hidden; }
.rq-shell .panel-heading { display: block; padding: 20px 28px; border-bottom: 1px solid #e4e7ec; }
.rq-shell .panel-heading h2 { margin: 0; font-size: 16px; font-weight: 600; }
.rq-shell .panel-body { padding: 28px; }
.rq-shell .form-stack { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 24px; align-items: start; }
.rq-shell .form-stack > * { margin: 0; min-width: 0; }
.rq-full { grid-column: 1 / -1; }
.rq-shell .field label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #344054; }
.rq-shell .field input, .rq-shell .field select { display: block; width: 100%; box-sizing: border-box; height: 40px; padding: 0 12px; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; font-size: 14px; color: #101828; }
.rq-shell .checkbox-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1px solid #e4e7ec; border-radius: 8px; background: #fafbfc; font-size: 13px; }
.rq-shell .checkbox-row span { display: grid; gap: 2px; }
.rq-shell .checkbox-row small { color: #667085; }
.rq-primary { display: inline-flex; align-items: center; justify-content: center; width: fit-content; height: 40px; padding: 0 24px; border: 0; border-radius: 8px; background: #2f5bea; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; justify-self: end; }
.rq-primary:hover:not(:disabled) { background: #2447c0; }
.rq-primary:disabled { background: #d0d5dd; cursor: not-allowed; }
.rq-drop { padding: 24px 16px; border: 1.5px dashed #d0d5dd; border-radius: 10px; background: #fafbfc; color: #667085; text-align: center; font-size: 13px; cursor: pointer; }
.rq-drop:hover, .rq-drop.over { border-color: #2f5bea; background: #f0f4ff; color: #2f5bea; }
.rq-drop strong { display: block; margin-bottom: 4px; color: #101828; font-size: 14px; }
.rq-files, .rq-progress { display: grid; gap: 8px; padding: 0; list-style: none; }
.rq-files li, .rq-progress li { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #e4e7ec; border-radius: 8px; background: #fff; font-size: 13px; }
.rq-progress li { flex-direction: column; align-items: stretch; gap: 4px; }
.rq-progress .row { display: flex; align-items: center; gap: 10px; }
.rq-files span, .rq-progress .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rq-progress .detail { color: #667085; font-size: 12px; }
.rq-live { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rq-files button { border: 0; background: none; color: #98a2b3; font-size: 18px; cursor: pointer; }
.rq-badge { padding: 2px 10px; border-radius: 100px; background: #f2f4f7; color: #667085; font-size: 11px; font-weight: 500; white-space: nowrap; }
.rq-badge.working { background: #eef2ff; color: #2f5bea; }
.rq-badge.new, .rq-badge.updated { background: #e6f4ea; color: #1e6b34; }
.rq-badge.failed { background: #fde8e8; color: #a32020; }
.rq-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 220px; padding: 3px 10px; border-radius: 100px; background: #eef2ff; color: #2f5bea; font-size: 12px; }
.rq-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rq-chip button { padding: 0; border: 0; background: none; color: inherit; cursor: pointer; }
.rq-chat-panel { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.rq-chat-panel .cx { flex: 1; min-height: 0; }
.rq-ins { display: grid; gap: 12px; width: 100%; }
.rq-ins-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #667085; }
.rq-ins-tools, .rq-ins-actions { display: inline-flex; gap: 8px; align-items: center; }
.rq-ins-card { padding: 14px 16px; border: 1px solid #e4e7ec; border-radius: 10px; background: #fff; cursor: pointer; }
.rq-ins-card.sel { border-color: #2f5bea; box-shadow: 0 0 0 2px rgba(47,91,234,.12); }
.rq-ins-card h3 { margin: 0 0 6px; font-size: 14px; }
.rq-ins-card p { margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #344054; }
.rq-ins-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border: 1px solid #d0d5dd; border-radius: 8px; background: #fff; color: #2f5bea; font-size: 12px; font-weight: 600; cursor: pointer; }
.rq-ins-btn:disabled { color: #98a2b3; cursor: not-allowed; }
.cx-bar .rq-ins-btn { margin-left: auto; }
.rq-entities { width: 300px; flex: none; overflow-y: auto; padding: 16px; border: 1px solid #e4e7ec; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px rgba(16,24,40,.06); }
.rq-entities-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.rq-entities-head h3 { margin: 0; font-size: 14px; font-weight: 600; }
.rq-entities-close { border: 0; background: none; color: #98a2b3; font-size: 20px; line-height: 1; cursor: pointer; }
.rq-entity { padding: 10px 0; border-top: 1px solid #f2f4f7; }
.rq-entity-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
.rq-entity-meta { margin-top: 4px; font-size: 12px; color: #667085; }
@media (max-width: 900px) { .rq-ask-row { flex-direction: column; } .rq-entities { width: auto; } }
@media (max-width: 700px) { .rq-shell .form-stack { grid-template-columns: minmax(0, 1fr); } .rq-head { gap: 16px; padding: 0 16px; } .rq-head p { display: none; } .rq-main { padding: 16px 12px; } .rq-shell .panel-body { padding: 18px; } }
`;

const PLUG_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
  </svg>
);

const statusMessage = (status, result) =>
  status === 502 ? UNAVAILABLE_ERROR
  : status === 503 ? "The service is temporarily unavailable. Please try again shortly."
  : status === 504 ? "The request timed out. Please try again."
  : (typeof result.detail === "string" ? result.detail : result.detail ? JSON.stringify(result.detail) : result.message) || `Request failed (${status}).`;

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { "ngrok-skip-browser-warning": "true", ...(typeof options.body === "string" ? { "Content-Type": "application/json" } : {}), ...options.headers },
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }

  const type = response.headers.get("content-type") || "";
  if (response.ok && type.includes("application/pdf")) {
    const blob = await response.blob();
    let summary = "";
    try {
      summary = decodeURIComponent(response.headers.get("X-Summary") || "");
    } catch {
      summary = response.headers.get("X-Summary") || "";
    }
    return { summary, report_url: URL.createObjectURL(blob) };
  }

  const responseText = await response.text();
  let result = {};
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      const looksLikeHtml = type.includes("text/html") || /^\s*<!doctype html/i.test(responseText) || /^\s*<html(?:\s|>)/i.test(responseText);
      if (looksLikeHtml) throw new Error(UNAVAILABLE_ERROR);
      result = { detail: responseText };
    }
  }
  if (!response.ok) throw new Error(statusMessage(response.status, result));
  return result;
}

function sendQuery(question, templateFile) {
  const form = new FormData();
  form.append("question", question);
  if (templateFile) form.append("template", templateFile);
  return request("/query", { method: "POST", body: form });
}

function findReportLink(result) {
  const value = result && (result.report_url || result.report || result.report_path);
  if (typeof value !== "string" || !value) return null;
  return /^(https?:|blob:)/.test(value) ? value : `${API_BASE_URL}/${value.replace(/^\/+/, "")}`;
}

function isAccepted(file) {
  return ACCEPTED_SUFFIXES.some((suffix) => file.name.toLowerCase().endsWith(suffix));
}

async function waitForIngest(onUpdate) {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const job = await request("/documents/progress");
    onUpdate(job);
    if (job.state === "error") throw new Error(job.error || "Ingest failed.");
    if (job.state === "done") return job.result;
    if (job.state === "idle") throw new Error("Ingest did not start. Please try again.");
  }
}

function summarizeIngest(result) {
  if (!result) return "Ingest finished.";
  const keys = ["new", "updated", "unchanged", "failed"];
  if (!keys.some((key) => typeof result[key] === "number")) return "Ingest finished.";
  const added = (result.new || 0) + (result.updated || 0);
  const unchanged = result.unchanged || 0;
  const failed = result.failed || 0;
  if (added === 0 && failed === 0) {
    return `Nothing new. ${unchanged} file${unchanged === 1 ? " was" : "s were"} already ingested.`;
  }
  const parts = [];
  if (result.new) parts.push(`${result.new} new`);
  if (result.updated) parts.push(`${result.updated} updated`);
  if (unchanged) parts.push(`${unchanged} already ingested`);
  if (failed) parts.push(`${failed} failed`);
  return `${parts.join(", ")}.`;
}

function ProgressList({ files }) {
  if (!files || files.length === 0) return null;
  return (
    <ul className="rq-progress rq-full">
      {files.map((file) => (
        <li key={file.name}>
          <div className="row">
            <span className="name" title={file.name}>{file.name}</span>
            <span className={`rq-badge ${file.status}`}>{STATUS_LABELS[file.status] || file.status}</span>
          </div>
          {file.status === "failed" && file.detail && <span className="detail">{file.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

function DocumentsPanel() {
  const [files, setFiles] = useState([]);
  const [parser, setParser] = useState("pymupdf");
  const [captions, setCaptions] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [live, setLive] = useState("");

  useEffect(() => {
    if (!busy) {
      setLive("");
      return undefined;
    }
    let active = true;
    let baseline = null;
    async function poll() {
      try {
        const info = await request("/documents/live");
        if (!active) return;
        if (baseline === null) baseline = info.seq;
        else if (info.seq > baseline && info.message) setLive(info.message);
      } catch {
        /* keep the last line */
      }
    }
    poll();
    const timer = setInterval(poll, 700);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [busy]);
  const inputRef = useRef(null);

  function addFiles(list) {
    const accepted = Array.from(list).filter(isAccepted);
    setFiles((previous) => [...previous, ...accepted.filter((file) => !previous.some((item) => item.name === file.name))]);
    setDone("");
  }

  async function uploadAll() {
    setError("");
    setDone("");
    setJob(null);
    setBusy(true);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const isLast = index === files.length - 1;
        setStep(`Uploading ${files[index].name} (${index + 1} of ${files.length})`);
        const form = new FormData();
        form.append("file", files[index]);
        form.append("parser", parser);
        form.append("captions", String(captions));
        form.append("ingest_now", String(isLast));
        await request("/documents", { method: "POST", body: form });
      }
      setStep("Starting ingest");
      const result = await waitForIngest((latest) => {
        setJob(latest);
        if (latest.message) setStep(latest.message);
      });
      setDone(summarizeIngest(result));
      setFiles([]);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setStep("");
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading"><h2>Documents</h2></div>
      <div className="panel-body form-stack">
        <div
          className={`rq-drop rq-full${dragOver ? " over" : ""}`}
          onClick={() => inputRef.current.click()}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => { event.preventDefault(); setDragOver(false); addFiles(event.dataTransfer.files); }}
        >
          <strong>Drop files or click to browse</strong>
          PDF, Excel or CSV
          <input ref={inputRef} type="file" multiple hidden accept={ACCEPTED_SUFFIXES.join(",")} onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
        </div>
        {files.length > 0 && (
          <ul className="rq-files rq-full">
            {files.map((file) => (
              <li key={file.name}>
                <span>{file.name}</span>
                <button type="button" aria-label={`Remove ${file.name}`} disabled={busy} onClick={() => setFiles(files.filter((item) => item !== file))}>×</button>
              </li>
            ))}
          </ul>
        )}
        <div className="field">
          <select id="parser" value={parser} onChange={(event) => setParser(event.target.value)}>
            <option value="pymupdf">PyMuPDF</option>
            <option value="docling">Docling</option>
          </select>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={captions} onChange={(event) => setCaptions(event.target.checked)} />
          <span><strong>Describe charts and images</strong></span>
        </label>
        <button type="button" className="rq-primary rq-full" disabled={!files.length || busy || (captions && parser !== "pymupdf")} onClick={uploadAll}>
          {files.length > 1 ? `Upload and ingest ${files.length} files` : "Upload and ingest"}
        </button>
        {busy && <div className="loading-indicator rq-full"><span className="loading-spinner" /><span className="rq-live" aria-live="polite">{live || step}</span></div>}
        {job && <ProgressList files={job.files} />}
        {error && <div className="alert alert-error rq-full" role="alert">{error}</div>}
        {done && <div className="alert alert-success rq-full" role="status">{done}</div>}
      </div>
    </section>
  );
}

const EMPTY_SETTINGS = {
  timeout_s: "180",
  sql_correction: false,
  sample_limit: "0",
  schema_top_k: "0",
  database_path: "",
  workspace: "",
  ingest_dir: "",
};

function settingsFromConfig(config) {
  return {
    timeout_s: String(config.timeout_s ?? 180),
    sql_correction: Boolean(config.sql_correction),
    sample_limit: String(config.sample_limit ?? 0),
    schema_top_k: String(config.schema_top_k ?? 0),
    database_path: config.database_path || "",
    workspace: config.workspace || "",
    ingest_dir: config.ingest_dir || "",
  };
}

function SettingsPanel() {
  const [values, setValues] = useState(EMPTY_SETTINGS);
  const [defaultIngestDir, setDefaultIngestDir] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let active = true;
    request("/config")
      .then((config) => {
        if (!active) return;
        setValues(settingsFromConfig(config));
        setDefaultIngestDir(config.ingest_dir_effective || "");
        setLoaded(true);
      })
      .catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, []);

  function change(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setSaved("");
  }

  async function save() {
    setError("");
    setSaved("");
    const timeout = Number(values.timeout_s);
    const sampleLimit = Number(values.sample_limit);
    const topK = Number(values.schema_top_k);
    if (!Number.isInteger(timeout) || timeout < 1) return setError("Timeout must be a whole number of seconds, 1 or more.");
    if (!Number.isInteger(sampleLimit) || sampleLimit < 0) return setError("Sample rows must be 0 or a positive whole number.");
    if (!Number.isInteger(topK) || topK < 0) return setError("Schema top-k must be 0 or a positive whole number.");
    setBusy(true);
    try {
      const result = await request("/config", {
        method: "POST",
        body: JSON.stringify({
          timeout_s: timeout,
          sql_correction: values.sql_correction,
          sample_limit: sampleLimit,
          schema_top_k: topK,
          database_path: values.database_path,
          workspace: values.workspace,
          ingest_dir: values.ingest_dir,
        }),
      });
      setValues(settingsFromConfig(result));
      setDefaultIngestDir(result.ingest_dir_effective || "");
      setSaved(result.changed && result.changed.length ? `Saved: ${result.changed.join(", ")}.` : "No changes.");
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  const locked = !loaded || busy;
  return (
    <section className="panel">
      <div className="panel-heading"><h2>Settings</h2></div>
      <div className="panel-body form-stack">
        {unavailable && <div className="alert alert-error rq-full" role="alert">Settings are not available on this server version.</div>}
        <div className="field rq-full">
          <label htmlFor="database_path">Database URL or SQLite path</label>
          <input id="database_path" type="text" value={values.database_path} disabled={locked} onChange={(event) => change("database_path", event.target.value)} />
        </div>
        <div className="field rq-full">
          <label htmlFor="workspace">Workspace folder</label>
          <input id="workspace" type="text" value={values.workspace} disabled={locked} onChange={(event) => change("workspace", event.target.value)} />
        </div>
        <div className="field rq-full">
          <label htmlFor="ingest_dir">Ingest folder</label>
          <input id="ingest_dir" type="text" value={values.ingest_dir} placeholder={defaultIngestDir} disabled={locked} onChange={(event) => change("ingest_dir", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="timeout_s">Model timeout (seconds)</label>
          <input id="timeout_s" type="number" min="1" value={values.timeout_s} disabled={locked} onChange={(event) => change("timeout_s", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sample_limit">Sample rows per table (0 = off)</label>
          <input id="sample_limit" type="number" min="0" value={values.sample_limit} disabled={locked} onChange={(event) => change("sample_limit", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="schema_top_k">Tables kept per question (0 = off)</label>
          <input id="schema_top_k" type="number" min="0" value={values.schema_top_k} disabled={locked} onChange={(event) => change("schema_top_k", event.target.value)} />
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={values.sql_correction} disabled={locked} onChange={(event) => change("sql_correction", event.target.checked)} />
          <span><strong>SQL correction</strong><small>Retry once with a corrected query when the SQL fails.</small></span>
        </label>
        <button type="button" className="rq-primary rq-full" disabled={locked} onClick={save}>{busy ? "Saving" : "Save settings"}</button>
        {error && <div className="alert alert-error rq-full" role="alert">{error}</div>}
        {saved && <div className="alert alert-success rq-full" role="status">{saved}</div>}
      </div>
    </section>
  );
}

function InsightFeed({ templateFile, onSelect, onConnect }) {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selectedId, setSelectedId] = useState("");

  function load() {
    setCards(null);
    setError("");
    request("/insights").then((result) => setCards(result.insights || [])).catch((caught) => setError(caught.message));
  }

  useEffect(load, []);

  async function makeReport(ids) {
    setBusyId(ids.length === 1 ? ids[0] : "all");
    setError("");
    try {
      const form = new FormData();
      form.append("ids", JSON.stringify(ids));
      if (templateFile) form.append("template", templateFile);
      const result = await request("/insights/report", { method: "POST", body: form });
      const link = document.createElement("a");
      link.href = result.report_url;
      link.download = "insight-report.pdf";
      link.click();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusyId("");
    }
  }

  if (error && !cards) return <div className="cx-note">{error}</div>;
  if (!cards) return <div className="cx-empty">Detecting insights</div>;
  if (cards.length === 0) return <div className="cx-empty">Upload documents, then ask a question.</div>;
  const allText = cards.map((card) => `${card.title}. ${card.summary}`).join(" ");
  return (
    <div className="rq-ins">
      <div className="rq-ins-head">
        <span>{cards.length} insights detected</span>
        <span className="rq-ins-tools">
          <button type="button" className="rq-ins-btn" title="Connect entity resolver to all insights" onClick={() => onConnect(allText)}>{PLUG_ICON} Entities</button>
          <button type="button" className="rq-ins-btn" onClick={load}>Refresh</button>
          <button type="button" className="rq-ins-btn" disabled={busyId !== ""} onClick={() => makeReport(cards.map((card) => card.id))}>{busyId === "all" ? "Building" : "Full report PDF"}</button>
        </span>
      </div>
      {error && <div className="cx-note">{error}</div>}
      {cards.map((card) => (
        <div key={card.id} className={`rq-ins-card${selectedId === card.id ? " sel" : ""}`} onClick={() => { setSelectedId(card.id); onSelect(`${card.title}. ${card.summary}`); }}>
          <h3>{card.title}</h3>
          <p>{card.summary}</p>
          <div className="rq-ins-actions">
            <button type="button" className="rq-ins-btn" disabled={busyId !== ""} onClick={(event) => { event.stopPropagation(); makeReport([card.id]); }}>{busyId === card.id ? "Building" : "Generate PDF"}</button>
            <button type="button" className="rq-ins-btn" title="Connect entity resolver to this topic" onClick={(event) => { event.stopPropagation(); setSelectedId(card.id); onConnect(`${card.title}. ${card.summary}`); }}>{PLUG_ICON} Entities</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EntityPanel({ text, open, onClose }) {
  const [entities, setEntities] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    request("/entities").then((result) => { if (active) setEntities(result.entities || []); }).catch(() => {});
    return () => { active = false; };
  }, [open, text]);

  if (!open) return null;
  const lowered = (text || "").toLowerCase();
  const matches = entities.filter((entity) => entity.aliases.some((alias) => {
    const escaped = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(^|[^a-z0-9])" + escaped + "([^a-z0-9]|$)").test(lowered);
  }));
  return (
    <aside className="rq-entities">
      <div className="rq-entities-head">
        <h3>Entities</h3>
        <button type="button" className="rq-entities-close" aria-label="Disconnect entity resolver" onClick={onClose}>×</button>
      </div>
      {matches.length === 0 && <div className="rq-entity-meta">No meaningful entities found for this topic.</div>}
      {matches.map((entity) => (
        <div key={entity.name} className="rq-entity">
          <div className="rq-entity-top"><strong>{entity.name}</strong><span className="rq-badge">{entity.type}</span></div>
          <div className="rq-entity-meta">Found in {entity.mentions} places</div>
          {entity.aliases.length > 1 && <div className="rq-entity-meta">Also written as: {entity.aliases.slice(1, 5).join(", ")}</div>}
        </div>
      ))}
    </aside>
  );
}

function ChatPanel({ onFocus, onConnect }) {
  const [question, setQuestion] = useState("");
  const [templateFile, setTemplateFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const templateRef = useRef(null);
  const endRef = useRef(null);
  const lastAnswer = [...messages].reverse().map((item) => item.result && item.result.summary).find(Boolean) || "";

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function ask() {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setQuestion("");
    setMessages((previous) => [...previous, { question: text, pending: true }]);
    let outcome;
    try {
      outcome = { result: await sendQuery(text, templateFile) };
      if (outcome.result && outcome.result.summary) onFocus(outcome.result.summary);
    } catch (caught) {
      outcome = { error: caught.message };
    }
    setMessages((previous) => previous.map((message, index) => (index === previous.length - 1 ? { question: text, ...outcome } : message)));
    setBusy(false);
  }

  return (
    <section className="panel rq-chat-panel">
      <div className="panel-heading"><h2>Ask</h2></div>
      <div className="cx">
        <div className="cx-bar">
          <button type="button" onClick={() => templateRef.current.click()}>Attach report template</button>
          <input ref={templateRef} type="file" hidden accept=".pdf" onChange={(event) => { setTemplateFile(event.target.files[0] || null); event.target.value = ""; }} />
          {templateFile && <span className="rq-chip"><span>{templateFile.name}</span><button type="button" aria-label="Remove template" onClick={() => setTemplateFile(null)}>×</button></span>}
          <button type="button" className="rq-ins-btn" title="Connect entity resolver to the last answer" disabled={!lastAnswer} onClick={() => onConnect(lastAnswer)}>{PLUG_ICON} Entities</button>
        </div>
        <div className="cx-scroll">
          <div className="cx-inner">
            {messages.length === 0 && <InsightFeed templateFile={templateFile} onSelect={onFocus} onConnect={onConnect} />}
            {messages.map((message, index) => {
              const reportLink = findReportLink(message.result);
              const summaryText = message.result && (message.result.summary || message.result.answer);
              return (
                <div key={index} style={{ display: "contents" }}>
                  <div className="cx-user">{message.question}</div>
                  <div className="cx-bot">
                    {message.pending && <div className="cx-thinking"><span className="cx-wave"><i /><i /><i /><i /></span>Thinking</div>}
                    {message.error && <div className="cx-note">{message.error}</div>}
                    {message.result?.error && <div className="cx-note">{message.result.error}</div>}
                    {message.result?.report_error && <div className="cx-note">{message.result.report_error}</div>}
                    {summaryText && <div className="cx-summary" style={{ whiteSpace: "pre-wrap" }}>{summaryText}</div>}
                    {reportLink && <div className="cx-actions"><button type="button" onClick={() => window.open(reportLink, "_blank", "noopener")}>Open report PDF</button></div>}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>
        <div className="cx-composer">
          <div className="cx-box">
            <textarea
              rows={1}
              value={question}
              placeholder="Ask about your documents"
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); ask(); } }}
            />
            <button type="button" className="cx-send" aria-label="Send" disabled={!question.trim() || busy} onClick={ask}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </div>
          <div className="cx-hint">{templateFile ? "A report will be built from the attached template." : "Enter to send, Shift+Enter for a new line."}</div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState("ask");
  const [entity, setEntity] = useState({ open: false, text: "" });
  const tabs = [["ask", "Ask"], ["documents", "Documents"], ["settings", "Settings"]];
  return (
    <>
      <style>{EXTRA_STYLES}</style>
      <div className="rq-shell">
        <header className="rq-head">
          <h1>Rubani-QA</h1>
          <nav className="rq-tabs" role="tablist">
            {tabs.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={`rq-tab${tab === key ? " active" : ""}`} onClick={() => setTab(key)}>{label}</button>
            ))}
          </nav>
          <p>Ask questions across your PDFs, spreadsheets and databases</p>
        </header>
        <main className="rq-main">
          <div className="rq-pane rq-ask" hidden={tab !== "ask"}>
            <div className="rq-ask-row">
              <ChatPanel
                onFocus={(value) => setEntity((previous) => ({ ...previous, text: value }))}
                onConnect={(value) => setEntity({ open: true, text: value })}
              />
              <EntityPanel text={entity.text} open={entity.open} onClose={() => setEntity((previous) => ({ ...previous, open: false }))} />
            </div>
          </div>
          <div className="rq-pane" hidden={tab !== "documents"}><DocumentsPanel /></div>
          <div className="rq-pane" hidden={tab !== "settings"}><SettingsPanel /></div>
        </main>
      </div>
    </>
  );
}