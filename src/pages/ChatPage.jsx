import { useEffect, useRef, useState } from "react";
import { getCompanies, submitFinancialQuery } from "../api";
import { useCached } from "../assets/cache";
import { DataTable } from "../components/ui";
import "../assets/App.css";
import { cellText, companyOptions, downloadText, getErrorMessage, parseResponse } from "../assets/utils";

const assistantError = (error) => ({ role: "assistant", error, rows: [] });
const fit = { flex: "0 0 auto", width: "auto", height: 28, fontSize: 12.5 };

function AssistantMessage({ message, onResearch }) {
  const { answer, summary } = parseResponse(message.summary);
  const rows = message.rows || [];
  const download = () => downloadText([message.summary || "", rows.length ? JSON.stringify(rows, null, 2) : "", message.sql ? `SQL:\n${message.sql}` : ""].filter(Boolean).join("\n\n"), "qa-result.txt");
  return (
    <article className="cx-bot">
      {answer && <div className="cx-answer">{answer}</div>}
      {summary && <div className="cx-summary">{summary}</div>}
      {message.error && <div className="cx-note" role="status">{message.error}</div>}
      {rows.length > 0 && (
        <details>
          <summary>View data ({rows.length} {rows.length === 1 ? "row" : "rows"})</summary>
          <div>
            <DataTable columns={Object.keys(rows[0]).map((column) => ({ key: column, label: column, render: (row) => cellText(row[column]) }))} rows={rows} />
          </div>
        </details>
      )}
      {message.sql && <details><summary>View SQL</summary><div><pre><code>{message.sql}</code></pre></div></details>}
      {message.summary && (
        <div className="cx-actions">
          <button type="button" onClick={onResearch}>Deep research</button>
          <button type="button" onClick={download}>Download details</button>
        </div>
      )}
    </article>
  );
}

export default function ChatPage({ token, messages, setMessages, isSysadmin, companyId, setCompanyId }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const needsCompany = isSysadmin && !companyId;
  const companies = useCached("companies", getCompanies, { enabled: isSysadmin, onError: setCompaniesError, fallback: "Could not load companies." });
  const addMessage = (message) => setMessages((current) => [...current, message]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  const resize = (el) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 120)}px`; };

  async function send() {
    const question = input.trim();
    if (!question || loading || needsCompany) return;
    addMessage({ role: "user", text: question });
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);
    try {
      const r = await submitFinancialQuery(question, token, isSysadmin ? Number(companyId) : undefined);
      addMessage({ role: "assistant", summary: r.summary ? String(r.summary) : "", rows: Array.isArray(r.rows) ? r.rows : [], sql: r.sql ? String(r.sql) : "", error: r.error ? String(r.error) : "" });
    } catch (error) {
      addMessage(assistantError(getErrorMessage(error, "The financial query failed.")));
    } finally {
      setLoading(false);
    }
  }

  const research = (index) => setMessages((current) => current.map((m, i) => (i === index ? { ...m, researchRequested: true, error: "Deep research is not connected to a backend endpoint yet." } : m)));

  return (
    <div className="cx">
      {isSysadmin && (
        <div className="cx-bar" style={{ justifyContent: "flex-start" }}>
          <select id="chatCompany" aria-label="Company" value={companyId} style={{ ...fit, minWidth: 140, maxWidth: 200 }} onChange={(e) => (setCompanyId(e.target.value), setMessages([]))}>
            {companyOptions(companies.data?.companies || [], { value: "", label: "Select company" }).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {companiesError && <span className="cx-err">{companiesError}</span>}
          <button type="button" disabled={!companyId} style={{ ...fit, padding: "0 10px", whiteSpace: "nowrap", marginLeft: "auto" }} onClick={() => addMessage(assistantError("Report-template upload is not implemented yet."))}>Upload report template</button>
        </div>
      )}
      <div className="cx-scroll">
        {messages.length === 0 && !loading ? (
          <div className="cx-empty">{needsCompany ? "Select a company to start." : "Ask a question about your financial data."}</div>
        ) : (
          <div className="cx-inner">
            {messages.map((m, i) => m.role === "user" ? <div key={i} className="cx-user">{m.text}</div> : <AssistantMessage key={i} message={m} onResearch={() => research(i)} />)}
            {loading && <div className="cx-bot cx-thinking">Thinking<span className="cx-wave" aria-hidden="true"><i /><i /><i /><i /></span></div>}
            <div ref={endRef} />
          </div>
        )}
      </div>
      <div className="cx-composer">
        <div className="cx-box">
          <textarea ref={inputRef} rows={1} value={input} placeholder="Ask a question about your financial data..." aria-label="Question" disabled={needsCompany}
            onChange={(e) => (setInput(e.target.value), resize(e.target))}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} />
          <button type="button" className="cx-send" onClick={send} disabled={loading || needsCompany || !input.trim()} aria-label="Send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
        </div>
        <div className="cx-hint">Enter to send · Shift + Enter for a new line</div>
      </div>
    </div>
  );
}
