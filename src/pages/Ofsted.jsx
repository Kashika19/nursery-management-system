// src/pages/Ofsted.jsx
import React from "react";
import jsPDF from "jspdf";

const API = "http://localhost:5000/api/ofsted";

/* ========================= STYLES ========================= */

const S = {
  container: { maxWidth: 1100, margin: "0 auto", padding: 16 },
  h1: { fontSize: 24, fontWeight: 800, margin: "16px 0" },
  tabs: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  chip: (active) => ({
    padding: "6px 10px", borderRadius: 999, fontWeight: 700,
    border: "1px solid #e5e7eb", background: active ? "#2563eb" : "#f1f5f9",
    color: active ? "#fff" : "#334155", cursor: "pointer"
  }),
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
  danger: { background: "#ef4444", color: "#fff", borderColor: "#ef4444" },
  input: { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14, background: "#f8fafc", fontWeight: 800 },
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  pill: { padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
};

/* ========================= ROOT ========================= */

export default function Ofsted() {
  const [tab, setTab] = React.useState("Fire Drills");
  return (
    <div style={S.container}>
      <h1 style={S.h1}>Compliance</h1>

      <div style={S.tabs}>
        {["Fire Drills", "Incidents", "Complaints", "Audits", "Reports"].map((t) => (
          <button key={t} style={S.chip(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div style={S.card}>
        {tab === "Fire Drills" && <FireDrills />}
        {tab === "Incidents" && <Incidents />}
        {tab === "Complaints" && <Complaints />}
        {tab === "Audits" && <Audits />}
        {tab === "Reports" && <StaffComplianceReports />}
      </div>
    </div>
  );
}

/* ========================= SHARED UTILS ========================= */

function Empty({ text }) {
  return <div style={{ padding: 16, color: "#64748b" }}>{text}</div>;
}
const Backdrop = ({ children }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.3)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
    {children}
  </div>
);
const lbl = { fontSize: 12, color: "#475569", marginBottom: 4 };

const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function exportCSV(filename, header, rows) {
  const csv = [header, ...rows].map(r => r.map(x => `"${String(x ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
  downloadBlob(csv, filename, "text/csv");
}
function exportPDF(title, lines, filename) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(14); doc.text(title, 40, 40);
  doc.setFontSize(9);
  let y = 60;
  lines.forEach(line => {
    if (y > 780) { doc.addPage(); y = 40; }
    doc.text(line, 40, y); y += 14;
  });
  doc.save(filename);
}
function exportWord(title, tableHead, tableRows, filename) {
  const head = tableHead.map(h => `<th>${esc(h)}</th>`).join("");
  const body = tableRows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  const html = `
  <html><head><meta charset="utf-8"><style>
    body{font-family:Segoe UI,Arial,sans-serif;font-size:12pt}
    h1{font-size:18pt;margin:0 0 10px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
    th{background:#f3f4f6}
  </style></head><body>
  <h1>${esc(title)}</h1>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`;
  downloadBlob(html, filename, "application/msword");
}

/* ========================= FIRE DRILLS ========================= */

function FireDrills() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (setting) params.set("setting", setting);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${API}/fire-drills?` + params.toString());
    setRows(await res.json());
    setLoading(false);
  }
  React.useEffect(() => { fetchRows(); }, [q, setting, from, to]);

  const isAtRisk = (r) => {
    const dt = new Date(r.date);
    const ninety = 90 * 24 * 60 * 60 * 1000;
    const overdue = (Date.now() - dt.getTime()) > ninety;
    return overdue || !r.signedBy;
  };

  const exportAll = () => {
    const header = ["ID","Date","Time","Setting","Lead","Signed By","Notes"];
    const body = rows.map(r => [r.id, r.date, r.time, r.setting, r.lead, r.signedBy||"", r.notes||""]);
    exportCSV("fire-drills.csv", header, body);
  };
  const exportAllPDF = () => {
    const lines = rows.map(r => `${r.date} ${r.time} | ${r.setting} | Lead: ${r.lead} | Signed: ${r.signedBy||"—"}`);
    exportPDF("Fire Drills", lines, "fire-drills.pdf");
  };
  const exportAllWord = () => {
    const head = ["ID","Date","Time","Setting","Lead","Signed By","Notes"];
    const body = rows.map(r => [r.id, r.date, r.time, r.setting, r.lead, r.signedBy||"", r.notes||""]);
    exportWord("Fire Drills", head, body, "fire-drills.doc");
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await fetch(`${API}/fire-drills/${id}`, { method: "DELETE" });
    fetchRows();
  };

  return (
    <>
      <div style={S.toolbar}>
        <input placeholder="Search lead, notes, ID…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...S.input, minWidth:220 }} />
        <input placeholder="Setting" value={setting} onChange={(e)=>setSetting(e.target.value)} style={{ ...S.input, maxWidth:180 }} />
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <div style={{ flex:1 }} />
        <button onClick={()=>{ setEditing(null); setShowForm(true); }} style={{ ...S.btn, ...S.primary }}>+ Fire Drill</button>
        <button onClick={exportAll} style={S.btn}>CSV</button>
        <button onClick={exportAllPDF} style={S.btn}>PDF</button>
        <button onClick={exportAllWord} style={S.btn}>Word</button>
      </div>

      {loading ? <div>Loading…</div> : rows.length === 0 ? <Empty text="No fire drills found."/> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Time</th>
              <th style={S.th}>Setting</th>
              <th style={S.th}>Lead</th>
              <th style={S.th}>Signed</th>
              <th style={S.th}>Notes</th>
              <th style={{ ...S.th, textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const risk = isAtRisk(r);
              return (
                <tr key={r.id} style={risk ? { background:"#fff7ed" } : null}>
                  <td style={S.td}>{r.date}</td>
                  <td style={S.td}>{r.time}</td>
                  <td style={S.td}>{r.setting}</td>
                  <td style={S.td}>{r.lead}</td>
                  <td style={S.td}>{r.signedBy || <span style={{ ...S.pill, background:"#fee2e2", border:"1px solid #fecaca", color:"#7f1d1d" }}>Missing</span>}</td>
                  <td style={S.td}>{r.notes || ""}</td>
                  <td style={{ ...S.td, textAlign:"right" }}>
                    <button style={S.btn} onClick={()=>{ setEditing(r); setShowForm(true); }}>Edit</button>{" "}
                    <button style={{ ...S.btn, ...S.danger }} onClick={()=>remove(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <FireDrillForm
          initial={editing}
          onClose={()=>setShowForm(false)}
          onSaved={()=>{ setShowForm(false); fetchRows(); }}
        />
      )}
    </>
  );
}

function FireDrillForm({ initial, onClose, onSaved }) {
  const [form, setForm] = React.useState(() => initial || {
    date: new Date().toISOString().slice(0,10), time: "10:00", setting: "", lead: "", signedBy: "", notes: ""
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    const url = initial ? `${API}/fire-drills/${initial.id}` : `${API}/fire-drills`;
    const method = initial ? "PATCH" : "POST";
    await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSaved();
  }

  return (
    <Backdrop>
      <div style={{ ...S.card, width: 560 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{initial ? `Edit Fire Drill — ${initial.id}` : "New Fire Drill"}</div>
        <div style={S.row3}>
          <label><div style={lbl}>Date</div><input type="date" style={S.input} value={form.date} onChange={e=>set("date", e.target.value)} /></label>
          <label><div style={lbl}>Time</div><input type="time" style={S.input} value={form.time} onChange={e=>set("time", e.target.value)} /></label>
          <label><div style={lbl}>Setting</div><input style={S.input} value={form.setting} onChange={e=>set("setting", e.target.value)} placeholder="Teddington" /></label>
        </div>
        <div style={S.row2}>
          <label><div style={lbl}>Lead</div><input style={S.input} value={form.lead} onChange={e=>set("lead", e.target.value)} /></label>
          <label><div style={lbl}>Signed By</div><input style={S.input} value={form.signedBy} onChange={e=>set("signedBy", e.target.value)} /></label>
        </div>
        <label><div style={lbl}>Notes</div><input style={S.input} value={form.notes} onChange={e=>set("notes", e.target.value)} /></label>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Backdrop>
  );
}

/* ========================= INCIDENTS ========================= */

function Incidents() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (setting) params.set("setting", setting);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${API}/incidents?` + params.toString());
    setRows(await res.json());
    setLoading(false);
  }
  React.useEffect(() => { fetchRows(); }, [q, setting, status, from, to]);

  const isAtRisk = (r) => (r.status !== "Resolved");

  const exportAll = () => {
    const head = ["ID","Date","Child","Setting","Type","Injury","Action Taken","Parent Told","Status","Notes"];
    const body = rows.map(r => [r.id, r.date, r.childName, r.setting, r.type, r.injury||"", r.actionTaken||"", r.reportedToParent?"Yes":"No", r.status, r.notes||""]);
    exportCSV("incidents.csv", head, body);
  };
  const exportAllPDF = () => {
    const lines = rows.map(r => `${r.date} | ${r.setting} | ${r.childName} | ${r.type} | Status: ${r.status}`);
    exportPDF("Incidents/Accidents", lines, "incidents.pdf");
  };
  const exportAllWord = () => {
    const head = ["ID","Date","Child","Setting","Type","Injury","Action Taken","Parent Told","Status","Notes"];
    const body = rows.map(r => [r.id, r.date, r.childName, r.setting, r.type, r.injury||"", r.actionTaken||"", r.reportedToParent?"Yes":"No", r.status, r.notes||""]);
    exportWord("Incidents/Accidents", head, body, "incidents.doc");
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await fetch(`${API}/incidents/${id}`, { method: "DELETE" });
    fetchRows();
  };

  return (
    <>
      <div style={S.toolbar}>
        <input placeholder="Search child, type, ID…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...S.input, minWidth:220 }} />
        <input placeholder="Setting" value={setting} onChange={(e)=>setSetting(e.target.value)} style={{ ...S.input, maxWidth:180 }} />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={{ ...S.input, maxWidth:180 }}>
          <option value="">All status</option>
          <option>Logged</option><option>Investigating</option><option>Resolved</option>
        </select>
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <div style={{ flex:1 }} />
        <button onClick={()=>{ setEditing(null); setShowForm(true); }} style={{ ...S.btn, ...S.primary }}>+ Incident</button>
        <button onClick={exportAll} style={S.btn}>CSV</button>
        <button onClick={exportAllPDF} style={S.btn}>PDF</button>
        <button onClick={exportAllWord} style={S.btn}>Word</button>
      </div>

      {loading ? <div>Loading…</div> : rows.length === 0 ? <Empty text="No incidents found."/> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Child</th>
              <th style={S.th}>Setting</th>
              <th style={S.th}>Type</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Notes</th>
              <th style={{ ...S.th, textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const risk = isAtRisk(r);
              return (
                <tr key={r.id} style={risk ? { background:"#fef2f2" } : null}>
                  <td style={S.td}>{r.date}</td>
                  <td style={S.td}>{r.childName}</td>
                  <td style={S.td}>{r.setting}</td>
                  <td style={S.td}>{r.type}</td>
                  <td style={S.td}>
                    {r.status}
                    {risk && <span style={{ ...S.pill, marginLeft:6, background:"#fee2e2", border:"1px solid #fecaca", color:"#7f1d1d" }}>At risk</span>}
                  </td>
                  <td style={S.td}>{r.notes || ""}</td>
                  <td style={{ ...S.td, textAlign:"right" }}>
                    <button style={S.btn} onClick={()=>{ setEditing(r); setShowForm(true); }}>Edit</button>{" "}
                    <button style={{ ...S.btn, ...S.danger }} onClick={()=>remove(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <IncidentForm
          initial={editing}
          onClose={()=>setShowForm(false)}
          onSaved={()=>{ setShowForm(false); fetchRows(); }}
        />
      )}
    </>
  );
}

function IncidentForm({ initial, onClose, onSaved }) {
  const [form, setForm] = React.useState(() => initial || {
    date: new Date().toISOString().slice(0,10), childName: "", setting: "", type: "Injury",
    injury: "", actionTaken: "", reportedToParent: true, status: "Logged", notes: ""
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    const url = initial ? `${API}/incidents/${initial.id}` : `${API}/incidents`;
    const method = initial ? "PATCH" : "POST";
    await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSaved();
  }

  return (
    <Backdrop>
      <div style={{ ...S.card, width: 640 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{initial ? `Edit Incident — ${initial.id}` : "New Incident"}</div>

        <div style={S.row3}>
          <label><div style={lbl}>Date</div><input type="date" style={S.input} value={form.date} onChange={e=>set("date", e.target.value)} /></label>
          <label><div style={lbl}>Child</div><input style={S.input} value={form.childName} onChange={e=>set("childName", e.target.value)} /></label>
          <label><div style={lbl}>Setting</div><input style={S.input} value={form.setting} onChange={e=>set("setting", e.target.value)} /></label>
        </div>
        <div style={S.row3}>
          <label><div style={lbl}>Type</div>
            <select style={S.input} value={form.type} onChange={e=>set("type", e.target.value)}>
              <option>Injury</option><option>Behaviour</option><option>Allergy</option><option>Other</option>
            </select>
          </label>
          <label><div style={lbl}>Status</div>
            <select style={S.input} value={form.status} onChange={e=>set("status", e.target.value)}>
              <option>Logged</option><option>Investigating</option><option>Resolved</option>
            </select>
          </label>
          <label><div style={lbl}>Parent Told</div>
            <select style={S.input} value={form.reportedToParent ? "Yes":"No"} onChange={e=>set("reportedToParent", e.target.value==="Yes")}>
              <option>Yes</option><option>No</option>
            </select>
          </label>
        </div>
        <div style={S.row2}>
          <label><div style={lbl}>Injury</div><input style={S.input} value={form.injury} onChange={e=>set("injury", e.target.value)} /></label>
          <label><div style={lbl}>Action Taken</div><input style={S.input} value={form.actionTaken} onChange={e=>set("actionTaken", e.target.value)} /></label>
        </div>
        <label><div style={lbl}>Notes</div><input style={S.input} value={form.notes} onChange={e=>set("notes", e.target.value)} /></label>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Backdrop>
  );
}

/* ========================= COMPLAINTS ========================= */

function Complaints() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (setting) params.set("setting", setting);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${API}/complaints?` + params.toString());
    setRows(await res.json());
    setLoading(false);
  }
  React.useEffect(() => { fetchRows(); }, [q, setting, status, from, to]);

  const isAtRisk = (r) => {
    if (r.status === "Resolved") return false;
    if (!r.responseDue) return true;
    return new Date(r.responseDue) < new Date();
  };

  const exportAll = () => {
    const head = ["ID","Date","Parent","Setting","Subject","Status","Response Due","Notes"];
    const body = rows.map(r => [r.id, r.date, r.parentName, r.setting, r.subject, r.status, r.responseDue||"", r.notes||""]);
    exportCSV("complaints.csv", head, body);
  };
  const exportAllPDF = () => {
    const lines = rows.map(r => `${r.date} | ${r.setting} | ${r.parentName} | ${r.subject} | Status: ${r.status}`);
    exportPDF("Complaints", lines, "complaints.pdf");
  };
  const exportAllWord = () => {
    const head = ["ID","Date","Parent","Setting","Subject","Status","Response Due","Notes"];
    const body = rows.map(r => [r.id, r.date, r.parentName, r.setting, r.subject, r.status, r.responseDue||"", r.notes||""]);
    exportWord("Complaints", head, body, "complaints.doc");
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await fetch(`${API}/complaints/${id}`, { method: "DELETE" });
    fetchRows();
  };

  return (
    <>
      <div style={S.toolbar}>
        <input placeholder="Search parent, subject, ID…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...S.input, minWidth:220 }} />
        <input placeholder="Setting" value={setting} onChange={(e)=>setSetting(e.target.value)} style={{ ...S.input, maxWidth:180 }} />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={{ ...S.input, maxWidth:180 }}>
          <option value="">All status</option>
          <option>Logged</option><option>Investigating</option><option>Resolved</option>
        </select>
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <div style={{ flex:1 }} />
        <button onClick={()=>{ setEditing(null); setShowForm(true); }} style={{ ...S.btn, ...S.primary }}>+ Complaint</button>
        <button onClick={exportAll} style={S.btn}>CSV</button>
        <button onClick={exportAllPDF} style={S.btn}>PDF</button>
        <button onClick={exportAllWord} style={S.btn}>Word</button>
      </div>

      {loading ? <div>Loading…</div> : rows.length === 0 ? <Empty text="No complaints found."/> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Parent</th>
              <th style={S.th}>Setting</th>
              <th style={S.th}>Subject</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Response Due</th>
              <th style={{ ...S.th, textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const risk = isAtRisk(r);
              return (
                <tr key={r.id} style={risk ? { background:"#fff7ed" } : null}>
                  <td style={S.td}>{r.date}</td>
                  <td style={S.td}>{r.parentName}</td>
                  <td style={S.td}>{r.setting}</td>
                  <td style={S.td}>{r.subject}</td>
                  <td style={S.td}>{r.status}</td>
                  <td style={S.td}>{r.responseDue || "—"}</td>
                  <td style={{ ...S.td, textAlign:"right" }}>
                    <button style={S.btn} onClick={()=>{ setEditing(r); setShowForm(true); }}>Edit</button>{" "}
                    <button style={{ ...S.btn, ...S.danger }} onClick={()=>remove(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <ComplaintForm
          initial={editing}
          onClose={()=>setShowForm(false)}
          onSaved={()=>{ setShowForm(false); fetchRows(); }}
        />
      )}
    </>
  );
}

function ComplaintForm({ initial, onClose, onSaved }) {
  const [form, setForm] = React.useState(() => initial || {
    date: new Date().toISOString().slice(0,10), parentName: "", setting: "", subject: "",
    status: "Logged", responseDue: "", notes: ""
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    const url = initial ? `${API}/complaints/${initial.id}` : `${API}/complaints`;
    const method = initial ? "PATCH" : "POST";
    await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSaved();
  }

  return (
    <Backdrop>
      <div style={{ ...S.card, width: 640 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{initial ? `Edit Complaint — ${initial.id}` : "New Complaint"}</div>

        <div style={S.row3}>
          <label><div style={lbl}>Date</div><input type="date" style={S.input} value={form.date} onChange={e=>set("date", e.target.value)} /></label>
          <label><div style={lbl}>Parent</div><input style={S.input} value={form.parentName} onChange={e=>set("parentName", e.target.value)} /></label>
          <label><div style={lbl}>Setting</div><input style={S.input} value={form.setting} onChange={e=>set("setting", e.target.value)} /></label>
        </div>
        <label><div style={lbl}>Subject</div><input style={S.input} value={form.subject} onChange={e=>set("subject", e.target.value)} /></label>
        <div style={S.row2}>
          <label><div style={lbl}>Status</div>
            <select style={S.input} value={form.status} onChange={e=>set("status", e.target.value)}>
              <option>Logged</option><option>Investigating</option><option>Resolved</option>
            </select>
          </label>
          <label><div style={lbl}>Response Due</div><input type="date" style={S.input} value={form.responseDue} onChange={e=>set("responseDue", e.target.value)} /></label>
        </div>
        <label><div style={lbl}>Notes</div><input style={S.input} value={form.notes} onChange={e=>set("notes", e.target.value)} /></label>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Backdrop>
  );
}

/* ========================= AUDITS ========================= */

function Audits() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (setting) params.set("setting", setting);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${API}/audits?` + params.toString());
    setRows(await res.json());
    setLoading(false);
  }
  React.useEffect(() => { fetchRows(); }, [q, setting, from, to]);

  const isAtRisk = (r) => (
    r.rating === "Poor" ||
    r.rating === "Requires Action" ||
    (r.actionsDue && new Date(r.actionsDue) < new Date() && r.status !== "Closed")
  );

  const exportAll = () => {
    const head = ["ID","Date","Setting","Area","Rating","Actions","Actions Due","Status","Notes"];
    const body = rows.map(r => [r.id, r.date, r.setting, r.area, r.rating, r.actions||"", r.actionsDue||"", r.status||"", r.notes||""]);
    exportCSV("audits.csv", head, body);
  };
  const exportAllPDF = () => {
    const lines = rows.map(r => `${r.date} | ${r.setting} | ${r.area} | Rating: ${r.rating} | Status: ${r.status||"—"}`);
    exportPDF("Audits", lines, "audits.pdf");
  };
  const exportAllWord = () => {
    const head = ["ID","Date","Setting","Area","Rating","Actions","Actions Due","Status","Notes"];
    const body = rows.map(r => [r.id, r.date, r.setting, r.area, r.rating, r.actions||"", r.actionsDue||"", r.status||"", r.notes||""]);
    exportWord("Audits", head, body, "audits.doc");
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    await fetch(`${API}/audits/${id}`, { method: "DELETE" });
    fetchRows();
  };

  return (
    <>
      <div style={S.toolbar}>
        <input placeholder="Search area, rating, ID…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...S.input, minWidth:220 }} />
        <input placeholder="Setting" value={setting} onChange={(e)=>setSetting(e.target.value)} style={{ ...S.input, maxWidth:180 }} />
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} style={{ ...S.input, maxWidth:160 }} />
        <div style={{ flex:1 }} />
        <button onClick={()=>{ setEditing(null); setShowForm(true); }} style={{ ...S.btn, ...S.primary }}>+ Audit</button>
        <button onClick={exportAll} style={S.btn}>CSV</button>
        <button onClick={exportAllPDF} style={S.btn}>PDF</button>
        <button onClick={exportAllWord} style={S.btn}>Word</button>
      </div>

      {loading ? <div>Loading…</div> : rows.length === 0 ? <Empty text="No audits found."/> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Setting</th>
              <th style={S.th}>Area</th>
              <th style={S.th}>Rating</th>
              <th style={S.th}>Actions Due</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Notes</th>
              <th style={{ ...S.th, textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const risk = isAtRisk(r);
              return (
                <tr key={r.id} style={risk ? { background:"#fef3c7" } : null}>
                  <td style={S.td}>{r.date}</td>
                  <td style={S.td}>{r.setting}</td>
                  <td style={S.td}>{r.area}</td>
                  <td style={S.td}>{r.rating}</td>
                  <td style={S.td}>{r.actionsDue || "—"}</td>
                  <td style={S.td}>{r.status || "—"}</td>
                  <td style={S.td}>{r.notes || ""}</td>
                  <td style={{ ...S.td, textAlign:"right" }}>
                    <button style={S.btn} onClick={()=>{ setEditing(r); setShowForm(true); }}>Edit</button>{" "}
                    <button style={{ ...S.btn, ...S.danger }} onClick={()=>remove(r.id)}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showForm && (
        <AuditForm
          initial={editing}
          onClose={()=>setShowForm(false)}
          onSaved={()=>{ setShowForm(false); fetchRows(); }}
        />
      )}
    </>
  );
}

function AuditForm({ initial, onClose, onSaved }) {
  const [form, setForm] = React.useState(() => initial || {
    date: new Date().toISOString().slice(0,10), setting: "", area: "", rating: "Good",
    actions: "", actionsDue: "", status: "Open", notes: ""
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    const url = initial ? `${API}/audits/${initial.id}` : `${API}/audits`;
    const method = initial ? "PATCH" : "POST";
    await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSaved();
  }

  return (
    <Backdrop>
      <div style={{ ...S.card, width: 640 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{initial ? `Edit Audit — ${initial.id}` : "New Audit"}</div>

        <div style={S.row3}>
          <label><div style={lbl}>Date</div><input type="date" style={S.input} value={form.date} onChange={e=>set("date", e.target.value)} /></label>
          <label><div style={lbl}>Setting</div><input style={S.input} value={form.setting} onChange={e=>set("setting", e.target.value)} /></label>
          <label><div style={lbl}>Area</div><input style={S.input} value={form.area} onChange={e=>set("area", e.target.value)} placeholder="e.g. Health & Safety" /></label>
        </div>
        <div style={S.row2}>
          <label><div style={lbl}>Rating</div>
            <select style={S.input} value={form.rating} onChange={e=>set("rating", e.target.value)}>
              <option>Outstanding</option><option>Good</option><option>Requires Action</option><option>Poor</option>
            </select>
          </label>
          <label><div style={lbl}>Actions Due</div><input type="date" style={S.input} value={form.actionsDue} onChange={e=>set("actionsDue", e.target.value)} /></label>
        </div>
        <label><div style={lbl}>Actions</div><input style={S.input} value={form.actions} onChange={e=>set("actions", e.target.value)} placeholder="e.g. Replace signage, refresh training" /></label>
        <label><div style={lbl}>Status</div>
          <select style={S.input} value={form.status} onChange={e=>set("status", e.target.value)}>
            <option>Open</option><option>In Progress</option><option>Closed</option>
          </select>
        </label>
        <label><div style={lbl}>Notes</div><input style={S.input} value={form.notes} onChange={e=>set("notes", e.target.value)} /></label>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Backdrop>
  );
}

/* ========================= STAFF COMPLIANCE REPORTS =========================
   Aggregated inspection-ready reports for DBS, Safeguarding, PFA, Food Hygiene,
   Fire Safety, Manual Handling, and Right to Work. Printable via CSV/PDF/Word.
=========================================================================== */

const CATEGORIES = [
  "DBS",
  "Safeguarding",
  "PFA",
  "Food Hygiene",
  "Fire Safety",
  "Manual Handling",
  "Right to Work",
];

function StaffComplianceReports() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [role, setRole] = React.useState("");
  const [category, setCategory] = React.useState(""); // one of CATEGORIES or empty for all
  const [expiry, setExpiry] = React.useState(""); // "", "30", "60", "90", "overdue"
  const [loading, setLoading] = React.useState(true);
  const [sort, setSort] = React.useState({ key: "name", dir: "asc" });

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (setting) params.set("setting", setting);
    if (role) params.set("role", role);
    if (category) params.set("category", category);
    if (expiry) params.set("expiry", expiry); // server may choose to ignore; we also filter client-side
    const res = await fetch(`${API}/staff-compliance?` + params.toString());
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }
  React.useEffect(() => { fetchRows(); }, [q, setting, role, category, expiry]);

  // Derive filters
  const roles = Array.from(new Set(rows.map(r => r.role).filter(Boolean))).sort();
  const settings = Array.from(new Set(rows.map(r => r.setting).filter(Boolean))).sort();

  const now = new Date();
  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Math.ceil((d.getTime() - now.getTime()) / (24*60*60*1000));
    };

  const isAtRisk = (r) => {
    // risk if missing evidence, overdue, or expiring within 30 days
    if (!r.issueDate && !r.lastChecked && !r.expiryDate && r.category !== "Right to Work") return true;
    const days = daysUntil(r.expiryDate);
    return (days !== null && (days < 0 || days <= 30));
  };

  // Client-side extra filtering for expiry dropdown
  const expiryFilter = (r) => {
    if (!expiry) return true;
    const days = daysUntil(r.expiryDate);
    if (expiry === "overdue") return days !== null && days < 0;
    const n = Number(expiry);
    return days !== null && days <= n && days >= 0;
  };

  const filtered = rows.filter(r =>
    (!setting || r.setting === setting) &&
    (!role || r.role === role) &&
    (!category || r.category === category) &&
    expiryFilter(r)
  );

  const sorted = [...filtered].sort((a,b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const av = a[sort.key], bv = b[sort.key];
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });

  const th = (key, label, alignRight=false) => {
    const active = sort.key === key;
    const arrow = !active ? "" : (sort.dir === "asc" ? " ▲" : " ▼");
    return (
      <th
        style={{ ...S.th, ...(alignRight ? { textAlign:"right" } : {}), cursor:"pointer", userSelect:"none" }}
        onClick={() => setSort(s => s.key !== key ? { key, dir:"asc" } : { key, dir: s.dir === "asc" ? "desc" : "asc" })}
      >
        {label}{arrow}
      </th>
    );
  };

  const exportAll = () => {
    const head = ["Staff","Role","Setting","Category","Number","Issue Date","Expiry Date","Last Checked","Status"];
    const body = sorted.map(r => [
      `${r.name} (${r.staffId})`, r.role||"", r.setting||"", r.category||"",
      r.number||"", r.issueDate||"", r.expiryDate||"", r.lastChecked||"", r.status||""
    ]);
    exportCSV("staff-compliance.csv", head, body);
  };
  const exportAllPDF = () => {
    const lines = sorted.map(r =>
      `${r.name} | ${r.role||"—"} | ${r.setting||"—"} | ${r.category} | Issue: ${r.issueDate||"—"} | Exp: ${r.expiryDate||"—"}`
    );
    exportPDF("Staff Compliance", lines, `staff-compliance${category?`-${category.toLowerCase().replace(/\s+/g,'-')}`:""}.pdf`);
  };
  const exportAllWord = () => {
    const head = ["Staff","Role","Setting","Category","Number","Issue Date","Expiry Date","Last Checked","Status"];
    const body = sorted.map(r => [
      `${r.name} (${r.staffId})`, r.role||"", r.setting||"", r.category||"",
      r.number||"", r.issueDate||"", r.expiryDate||"", r.lastChecked||"", r.status||""
    ]);
    exportWord(`Staff Compliance${category?` — ${category}`:""}`, head, body, "staff-compliance.doc");
  };

  return (
    <>
      <div style={S.toolbar}>
        <input placeholder="Search staff name/ID…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...S.input, minWidth:220 }} />
        <select value={setting} onChange={(e)=>setSetting(e.target.value)} style={{ ...S.input, maxWidth:220 }}>
          <option value="">All settings</option>
          {settings.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={role} onChange={(e)=>setRole(e.target.value)} style={{ ...S.input, maxWidth:220 }}>
          <option value="">All roles</option>
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={category} onChange={(e)=>setCategory(e.target.value)} style={{ ...S.input, maxWidth:220 }}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={expiry} onChange={(e)=>setExpiry(e.target.value)} style={{ ...S.input, maxWidth:180 }}>
          <option value="">Any expiry</option>
          <option value="30">Expiring ≤30d</option>
          <option value="60">Expiring ≤60d</option>
          <option value="90">Expiring ≤90d</option>
          <option value="overdue">Overdue</option>
        </select>
        <div style={{ flex:1 }} />
        <button onClick={exportAll} style={S.btn}>CSV</button>
        <button onClick={exportAllPDF} style={S.btn}>PDF</button>
        <button onClick={exportAllWord} style={S.btn}>Word</button>
      </div>

      {loading ? <div>Loading…</div> : sorted.length === 0 ? <Empty text="No staff compliance rows match your filters." /> : (
        <table style={S.table}>
          <thead>
            <tr>
              {th("name","Staff")}
              {th("role","Role")}
              {th("setting","Setting")}
              {th("category","Category")}
              {th("number","Number")}
              {th("issueDate","Issue")}
              {th("expiryDate","Expiry")}
              {th("lastChecked","Last Checked")}
              {th("status","Status")}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const risk = isAtRisk(r);
              return (
                <tr key={`${r.staffId}-${r.category}`} style={risk ? { background:"#fff7ed" } : null}>
                  <td style={S.td}>{r.name} <span style={{ color:"#64748b" }}>({r.staffId})</span></td>
                  <td style={S.td}>{r.role || "—"}</td>
                  <td style={S.td}>{r.setting || "—"}</td>
                  <td style={S.td}>{r.category}</td>
                  <td style={S.td}>{r.number || (r.category==="Right to Work"?"—":"")}</td>
                  <td style={S.td}>{r.issueDate || "—"}</td>
                  <td style={S.td}>{r.expiryDate || "—"}</td>
                  <td style={S.td}>{r.lastChecked || "—"}</td>
                  <td style={S.td}>
                    {r.status || (risk
                      ? <span style={{ ...S.pill, background:"#fee2e2", border:"1px solid #fecaca", color:"#7f1d1d" }}>At risk</span>
                      : <span style={{ ...S.pill, background:"#e7f9ed", border:"1px solid #86efac", color:"#065f46" }}>OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Info block to match inspection ask */}
      <div style={{ marginTop: 12, color:"#64748b", fontSize:12 }}>
        Tip: Filter to <b>DBS</b> or <b>PFA</b> then use PDF/Word to print inspection-ready reports.
      </div>
    </>
  );
}
