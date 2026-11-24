import { useEffect, useState } from "react";
import { getSystemAnalytics } from "../api";
import { useCached } from "../assets/cache";
import { useFeedback } from "../assets/hooks";
import { DataTable, Feedback, LoadingIndicator, Panel, SelectField } from "../components/ui";
import { companyOptions, displayValue, formatNumber } from "../assets/utils";

const SEGMENTS = [["Discovered", "#2563eb", "discovered_table_count"], ["Indexed", "#f59e0b", "indexed_table_count"], ["Embedded", "#16a34a", "embedded_table_count"]];
const PALETTE = ["#2563eb", "#f59e0b", "#16a34a", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];
const CHART = { width: 520, height: 240, left: 40, right: 24, top: 16, bottom: 30 };
const count = (value) => Number(value) || 0;
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const tone = (status = "") => (/fail|error/i.test(status) ? "bad" : /success|complete|ok|done/i.test(status) ? "ok" : "");
const column = (key, label) => ({ key, label, render: (row) => formatNumber(row[key]) });
const plural = (gap) => (gap === 1 ? "table is" : "tables are");

const Metric = ({ label, value, note }) => (
  <div className="analytics-metric">
    <span className="analytics-metric-label">{label}</span>
    <strong className="analytics-metric-value">{value}</strong>
    {note && <span className="analytics-metric-note">{note}</span>}
  </div>
);

const Legend = ({ color }) => <span className="analytics-legend-dot" style={{ background: color }} />;

function Distribution({ overview }) {
  const segments = SEGMENTS.map(([label, color, key]) => ({ label, color, value: overview[key] }));
  const valid = segments.every(({ value }) => Number.isFinite(value) && value >= 0);
  const total = valid ? segments.reduce((sum, { value }) => sum + value, 0) : 0;
  let offset = 0;
  const stops = segments.map(({ color, value }) => { const from = offset; offset += (value / total) * 100; return `${color} ${from}% ${offset}%`; }).join(", ");
  const summary = segments.map(({ label, value }) => `${formatNumber(value)} ${label.toLowerCase()}`).join(", ");
  return (
    <section className="analytics-chart-card">
      <h3 className="analytics-chart-title">Distribution</h3>
      <p className="analytics-chart-description">Discovered, indexed, and embedded tables</p>
      {valid ? (
        <>
          <div className="analytics-account-chart">
            <div className="analytics-pie-chart" role="img" aria-label={`Schema composition: ${summary} tables`} style={{ background: total === 0 ? "var(--chart-empty, #e5e7eb)" : `conic-gradient(${stops})` }}>
              <div className="analytics-pie-center"><strong>{formatNumber(total)}</strong></div>
            </div>
          </div>
          <div className="analytics-account-legend">
            {segments.map(({ label, color, value }) => (
              <div className="analytics-account-legend-item" key={label}>
                <span className="analytics-account-label"><Legend color={color} />{label}</span>
                <strong>{formatNumber(value)}</strong>
              </div>
            ))}
          </div>
        </>
      ) : <p className="analytics-muted">Schema composition data is unavailable.</p>}
    </section>
  );
}

function Trend({ rows }) {
  const { width, height, left, right, top, bottom } = CHART;
  const ceiling = Math.ceil(Math.max(1, ...rows.flatMap((row) => SEGMENTS.map(([, , key]) => count(row[key])))) / 4) * 4;
  const plot = { width: width - left - right, height: height - top - bottom };
  const horizontal = (index) => left + (plot.width / (SEGMENTS.length - 1)) * index;
  const vertical = (value) => top + plot.height - (value / ceiling) * plot.height;
  return (
    <section className="analytics-chart-card">
      <h3 className="analytics-chart-title">Table progress</h3>
      <p className="analytics-chart-description">Tables remaining at each stage</p>
      <div className="analytics-graph">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line graph of tables at each stage: discovered, indexed, embedded">
          {[0, 1, 2, 3, 4].map((step) => {
            const value = (ceiling / 4) * step;
            return (
              <g key={step}>
                <line x1={left} x2={width - right} y1={vertical(value)} y2={vertical(value)} stroke="#e5e7eb" />
                <text x={left - 6} y={vertical(value) + 3} textAnchor="end">{formatNumber(Math.round(value))}</text>
              </g>
            );
          })}
          {SEGMENTS.map(([label], index) => <text key={label} x={horizontal(index)} y={height - 10} textAnchor="middle">{label}</text>)}
          {rows.map((row, index) => {
            const color = PALETTE[index % PALETTE.length];
            const points = SEGMENTS.map(([, , key], stage) => [horizontal(stage), vertical(count(row[key])), count(row[key])]);
            return (
              <g key={`${row.name}-${index}`}>
                <polyline points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                {points.map(([x, y, value], stage) => <circle key={stage} cx={x} cy={y} r="4" fill="#fff" stroke={color} strokeWidth="2"><title>{`${displayValue(row.name)} · ${SEGMENTS[stage][0]}: ${formatNumber(value)}`}</title></circle>)}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="analytics-graph-legend">{rows.map((row, index) => <span key={`${row.name}-${index}`}><Legend color={PALETTE[index % PALETTE.length]} />{displayValue(row.name)}</span>)}</div>
    </section>
  );
}

const COLUMNS = [
  { key: "name", label: "Company", render: (row) => displayValue(row.name) },
  column("discovered_table_count", "Discovered tables"),
  column("indexed_table_count", "Indexed tables"),
  column("embedded_table_count", "Embedded tables"),
  { key: "last_sync_status", label: "Last sync", render: ({ last_sync_status: status }) => <span className={`status-pill${{ ok: " status-enabled", bad: " status-bad" }[tone(status)] || ""}`}>{displayValue(status)}</span> },
];

export default function ReportsDashboard({ token, isSysadmin, companyId }) {
  const feedback = useFeedback();
  const [selected, setSelected] = useState(isSysadmin ? "all" : String(companyId ?? ""));
  const [companies, setCompanies] = useState([]);
  const { data: analytics, loading } = useCached(
    `analytics:${token}:${selected}`,
    () => getSystemAnalytics(token, isSysadmin && selected !== "all" ? Number(selected) : undefined),
    { onError: feedback.setError, fallback: "Could not load system analytics." }
  );

  useEffect(() => { if (isSysadmin && analytics?.companies) setCompanies(analytics.companies); }, [analytics, isSysadmin]);

  const overview = analytics?.overview ?? {};
  const comparison = analytics?.company_comparison ?? [];
  const overall = isSysadmin && selected === "all";
  const discovered = count(overview.discovered_table_count);
  const indexed = count(overview.indexed_table_count);
  const embedded = count(overview.embedded_table_count);
  const rows = overall && comparison.length ? comparison : [{ name: "Total", ...overview }];
  const failed = overall ? comparison.filter((row) => tone(row.last_sync_status) === "bad") : [];
  const attention = [
    ...(failed.length ? [`Last sync failed for: ${failed.map((row) => displayValue(row.name)).join(", ")}.`] : []),
    ...(discovered > indexed ? [`${formatNumber(discovered - indexed)} discovered ${plural(discovered - indexed)} not indexed yet.`] : []),
    ...(indexed > embedded ? [`${formatNumber(indexed - embedded)} indexed ${plural(indexed - embedded)} not embedded yet.`] : []),
  ];

  return (
    <div className="page-stack reports-dashboard">
      <Feedback feedback={feedback} />
      <Panel title="">
        <div className="analytics-panel-header">
          <h2 className="analytics-panel-title">Details</h2>
          {isSysadmin && <div className="reports-company-filter"><SelectField name="analyticsCompany" value={selected} onChange={(event) => setSelected(event.target.value)} options={companyOptions(companies, { value: "all", label: "All companies" })} /></div>}
        </div>
        {loading && <LoadingIndicator text="Loading..." />}
      </Panel>
      {analytics && (
        <>
          <Panel title="System overview">
            <div className="analytics-card-grid">
              <Metric label="Companies" value={formatNumber(overview.company_count)} />
              <Metric label="Registered accounts" value={formatNumber(overview.user_count)} />
              <Metric label="Discovered tables" value={formatNumber(discovered)} note={discovered > 0 ? `${percent(indexed, discovered)}% indexed` : undefined} />
              <Metric label="Indexed columns" value={formatNumber(overview.indexed_column_count)} />
            </div>
            <div className="analytics-two-column"><Distribution overview={overview} /><Trend rows={rows} /></div>
          </Panel>
          {attention.length > 0 && (
            <Panel title="Needs attention">
              <ul className="attention-list">{attention.map((text) => <li key={text}>{text}</li>)}</ul>
            </Panel>
          )}
          {overall && (
            <Panel title="Company comparison">
              {comparison.length ? <DataTable columns={COLUMNS} rows={comparison} /> : <p>No company comparison data is available.</p>}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}