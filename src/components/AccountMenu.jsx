import { useEffect, useRef, useState } from "react";
import { ROLE_LABELS } from "../assets/constants";

const line = "1px solid rgba(128,128,128,.28)";
const S = {
  root: { position: "relative", display: "inline-block" },
  trigger: { display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", border: line, borderRadius: 8, color: "inherit", font: "inherit", fontSize: 13, lineHeight: 1.2, cursor: "pointer", boxShadow: "none" },
  id: { fontWeight: 600 },
  role: { paddingLeft: 10, borderLeft: line, opacity: 0.65 },
  caret: { width: 6, height: 6, borderRight: "1.5px solid currentColor", borderBottom: "1.5px solid currentColor", opacity: 0.55 },
  menu: { position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: 150, padding: 4, border: line, borderRadius: 8, background: "var(--surface, #fff)", boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 50 },
  item: { display: "block", width: "100%", padding: "8px 10px", border: 0, borderRadius: 6, color: "inherit", font: "inherit", fontSize: 13, textAlign: "left", cursor: "pointer" },
};

export default function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [itemHover, setItemHover] = useState(false);
  const ref = useRef(null);
  const tint = "rgba(128,128,128,.12)";

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => (document.removeEventListener("mousedown", onDown), document.removeEventListener("keydown", onKey));
  }, [open]);

  return (
    <div style={S.root} ref={ref}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ ...S.trigger, background: hover || open ? tint : "transparent" }}>
        <span style={S.id}>{user.employee_id}</span>
        <span style={S.role}>{ROLE_LABELS[user.role] || user.role}</span>
        <span style={{ ...S.caret, transform: open ? "rotate(-135deg)" : "rotate(45deg)" }} aria-hidden="true" />
      </button>
      {open && (
        <div style={S.menu} role="menu">
          <button type="button" role="menuitem" onClick={onLogout} onMouseEnter={() => setItemHover(true)} onMouseLeave={() => setItemHover(false)} style={{ ...S.item, background: itemHover ? tint : "transparent" }}>Sign out</button>
        </div>
      )}
    </div>
  );
}
