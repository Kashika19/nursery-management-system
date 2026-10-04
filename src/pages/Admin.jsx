// src/pages/Admin.jsx
import React from "react";
import jsPDF from "jspdf";

const API = "http://localhost:5000/api/children";

const S = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "0 16px" },
  h1: { fontSize: 24, fontWeight: 800, margin: "16px 0" },
  kpis: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 12 },
  stat: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { fontSize: 12, color: "#475569", marginBottom: 4 },
  input: { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" },
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 700,
    border: `1px solid ${active ? "#2563eb" : "#e5e7eb"}`,
    background: active ? "#2563eb" : "#f1f5f9",
    color: active ? "#fff" : "#334155",
    cursor: "pointer",
    userSelect: "none",
  }),
  btnBar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14, background: "#f8fafc", fontWeight: 800, cursor: "pointer", userSelect: "none" },
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 },
  pill: { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  link: { color: "#2563eb", textDecoration: "underline", cursor: "pointer" },
};

function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------- Dietary helpers ---------- */

function classifyDietary(val = "") {
  const v = String(val).trim().toLowerCase();
  if (!v || v === "standard") return "standard";
  if (v === "allergy" || v.includes("allerg")) return "allergy";
  if (v === "intolerance" || v.includes("intoler")) return "intolerance";
  return "special";
}

function DietaryBadge({ value }) {
  const bucket = classifyDietary(value);
  if (bucket === "allergy")
    return <span aria-label="Allergy" style={{ ...S.pill, background: "#fee2e2", border: "1px solid #fecaca", color: "#7f1d1d" }}>Allergy</span>;
  if (bucket === "intolerance")
    return <span aria-label="Intolerance" style={{ ...S.pill, background: "#fffbeb", border: "1px solid #fde68a", color: "#7a4b00" }}>Intolerance</span>;
  if (bucket === "special")
    return <span aria-label={String(value)} style={{ ...S.pill, background: "#e2e8f0", border: "1px solid #cbd5e1", color: "#334155" }}>{value}</span>;
  return <span aria-label="Standard" style={{ ...S.pill, background: "#e7f5ec", border: "1px solid #a7f3d0", color: "#065f46" }}>Standard</span>;
}

/* ---------- KPIs ---------- */

function Stat({ title, value }) {
  return (
    <div style={S.stat}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ fontWeight: 900, fontSize: 20 }}>{value}</div>
    </div>
  );
}

/* ---------- Exports ---------- */

function exportCSV(rows) {
  const header = ["Child ID", "Child", "Room", "Setting", "Dietary"];
  const lines = rows.map(r => [r.id, r.name, r.room, r.setting, r.dietary].map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "Dietary_Requirements.csv"; a.click();
  URL.revokeObjectURL(url);
}

function exportWord(rows) {
  const body = rows
    .map(
      r =>
        `<tr>
          <td>${escapeHtml(r.id)}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.room || "")}</td>
          <td>${escapeHtml(r.setting || "")}</td>
          <td>${escapeHtml(r.dietary || "")}</td>
        </tr>`
    )
    .join("");
  const html = `
  <html><head><meta charset="utf-8"><style>
    body{font-family:Segoe UI,Arial,sans-serif;font-size:12pt}
    h1{font-size:18pt;margin:0 0 10px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
    th{background:#f3f4f6}
  </style></head><body>
  <h1>Dietary Requirements</h1>
  <table>
    <thead><tr><th>Child ID</th><th>Child</th><th>Room</th><th>Setting</th><th>Dietary</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  </body></html>`;
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "Dietary_Requirements.doc"; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(rows) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(16); doc.text("Dietary Requirements", 40, 40);
  doc.setFontSize(10);
  let y = 62;
  rows.forEach(r => {
    const line = `${r.id} | ${r.name} | ${r.room || "—"} | ${r.setting || "—"} | ${r.dietary || "Standard"}`;
    if (y > 780) { doc.addPage(); y = 40; }
    doc.text(line, 40, y); y += 14;
  });
  doc.save("Dietary_Requirements.pdf");
}

/* ---------- Component ---------- */

export default function Admin() {
  const [children, setChildren] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // filters
  const [q, setQ] = React.useState("");
  const [debouncedQ, setDebouncedQ] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [room, setRoom] = React.useState("");
  const [bucket, setBucket] = React.useState("all"); // all | non-standard | allergy | intolerance | special | standard

  // sorting
  const [sort, setSort] = React.useState({ key: "name", dir: "asc" }); // asc|desc

  // debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // load children (try full payload endpoint, fall back to N+1)
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        // Prefer a single request with required fields
        const res = await fetch(`${API}?full=1`);
        if (res.ok) {
          const data = await res.json();
          setChildren(Array.isArray(data) ? data : (data.children || []));
        } else {
          // Fallback: fetch list then detail
          const listRes = await fetch(API);
          if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
          const list = await listRes.json();
          const full = await Promise.all(
            list.map(async (row) => {
              try {
                const r = await fetch(`${API}/${row.id}`);
                return r.ok ? await r.json() : row;
              } catch {
                return row;
              }
            })
          );
          setChildren(full);
        }
      } catch (e) {
        setError(e.message || "Failed to load children");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // derive registry rows
  const baseRows = React.useMemo(() => {
    return (children || []).map((c) => ({
      id: c.id,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.name || c.id,
      room: c.roomId || "",
      setting: c.setting || "",
      dietary: c.dietary || "",
      bucket: classifyDietary(c.dietary || ""),
      link: `/children/${encodeURIComponent(c.id)}`,
    }));
  }, [children]);

  const uniqueSettings = React.useMemo(
    () => Array.from(new Set(baseRows.map(r => r.setting).filter(Boolean))).sort(),
    [baseRows]
  );
  const uniqueRooms = React.useMemo(
    () => Array.from(new Set(baseRows.map(r => r.room).filter(Boolean))).sort(),
    [baseRows]
  );

  const rows = React.useMemo(() => {
    let list = baseRows;

    // bucket filter
    if (bucket !== "all") {
      if (bucket === "non-standard") list = list.filter(r => r.bucket !== "standard");
      else list = list.filter(r => r.bucket === bucket);
    }

    // setting & room
    if (setting) list = list.filter(r => (r.setting || "") === setting);
    if (room) list = list.filter(r => (r.room || "") === room);

    // text search
    if (debouncedQ) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(debouncedQ) ||
        r.id.toLowerCase().includes(debouncedQ) ||
        (r.room || "").toLowerCase().includes(debouncedQ) ||
        (r.setting || "").toLowerCase().includes(debouncedQ) ||
        (r.dietary || "").toLowerCase().includes(debouncedQ)
      );
    }

    // sorting
    const { key, dir } = sort;
    const d = dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const av = a[key]; const bv = b[key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * d;
      return String(av ?? "").localeCompare(String(bv ?? "")) * d;
    });

    return list;
  }, [baseRows, debouncedQ, bucket, setting, room, sort]);

  // KPI counts
  const kpi = React.useMemo(() => {
    const counts = { standard: 0, allergy: 0, intolerance: 0, special: 0 };
    baseRows.forEach(r => { counts[r.bucket] = (counts[r.bucket] || 0) + 1; });
    const total = baseRows.length || 1;
    const nonStd = counts.allergy + counts.intolerance + counts.special;
    return { ...counts, total, pctNonStandard: Math.round((nonStd / total) * 100) };
  }, [baseRows]);

  const th = (key, label) => {
    const active = sort.key === key;
    const arrow = !active ? "" : (sort.dir === "asc" ? " ▲" : " ▼");
    return (
      <th
        scope="col"
        style={S.th}
        onClick={() => setSort(s => s.key !== key ? { key, dir: "asc" } : { key, dir: s.dir === "asc" ? "desc" : "asc" })}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        title="Click to sort"
      >
        {label}{arrow}
      </th>
    );
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Nursery Admin</h1>

      {/* KPIs */}
      <div style={S.kpis}>
        <Stat title="Total Children" value={kpi.total} />
        <Stat title="Allergy" value={kpi.allergy} />
        <Stat title="Intolerance" value={kpi.intolerance} />
        <Stat title="Special Diets" value={kpi.special} />
        <Stat title="% Non-standard" value={`${kpi.pctNonStandard}%`} />
      </div>

      {/* Dietary Registry */}
      <div style={S.card} aria-labelledby="dietary-heading">
        <div id="dietary-heading" style={{ fontWeight: 800, marginBottom: 8 }}>Dietary requirements</div>

        {/* Actions */}
        <div style={S.btnBar}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={S.label}>Search</div>
            <input
              style={S.input}
              placeholder="Search by child, ID, room, setting, dietary…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search"
            />
          </div>

          <button onClick={() => exportCSV(rows)} style={S.btn} aria-label="Export as CSV">Export CSV</button>
          <button onClick={() => exportPDF(rows)} style={S.btn} aria-label="Export as PDF">Export PDF</button>
          <button onClick={() => exportWord(rows)} style={{ ...S.btn, ...S.primary }} aria-label="Export as Word">Export Word</button>
        </div>

        {/* Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <label>
            <div style={S.label}>Filter by dietary type</div>
            <div style={S.chipRow}>
              {[
                ["all", "All"],
                ["non-standard", "Non-standard"],
                ["allergy", "Allergy"],
                ["intolerance", "Intolerance"],
                ["special", "Special"],
                ["standard", "Standard"]
              ].map(([val, label]) => (
                <button key={val} onClick={() => setBucket(val)} style={S.chip(bucket === val)} aria-pressed={bucket === val}>
                  {label}
                </button>
              ))}
            </div>
          </label>
          <label>
            <div style={S.label}>Setting</div>
            <select value={setting} onChange={(e) => setSetting(e.target.value)} style={S.input} aria-label="Filter by setting">
              <option value="">All settings</option>
              {uniqueSettings.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <div style={S.label}>Room</div>
            <select value={room} onChange={(e) => setRoom(e.target.value)} style={S.input} aria-label="Filter by room">
              <option value="">All rooms</option>
              {uniqueRooms.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>Error: {error}</div>}
        {loading ? (
          <div>Loading…</div>
        ) : (
          <div style={S.tableWrap} role="region" aria-label="Dietary registry table">
            <table style={S.table}>
              <thead>
                <tr>
                  {th("id", "Child ID")}
                  {th("name", "Child")}
                  {th("room", "Room")}
                  {th("setting", "Setting")}
                  {th("dietary", "Dietary")}
                  <th style={{ ...S.th, cursor: "default" }} scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td style={S.td} colSpan={6}>No matching records.</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={S.td}>{r.id}</td>
                    <td style={S.td}>{r.name}</td>
                    <td style={S.td}>{r.room || "—"}</td>
                    <td style={S.td}>{r.setting || "—"}</td>
                    <td style={S.td}><DietaryBadge value={r.dietary} /></td>
                    <td style={S.td}>
                      <a href={r.link} style={S.link} aria-label={`Open ${r.name} profile`}>Open profile</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
