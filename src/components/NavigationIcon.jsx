const PATHS = {
  queries: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M8 9h8M8 13h5" /></>,
  reports: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
  companies: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M8 12h2M14 12h2M10 21v-5h4v5" /></>,
  models: <><path d="M12 3 3 8l9 5 9-5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  databases: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-2 .9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-2-.9l-1.7.7-1.5-2.6 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.5-2.6 1.7.7a8 8 0 0 1 2-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 2 .9l1.7-.7 1.5 2.6-1.4 1.1a7 7 0 0 1-.1 2z" /></>,
  employees: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20" /></>,
};

export default function NavigationIcon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] || PATHS.queries}
    </svg>
  );
}
