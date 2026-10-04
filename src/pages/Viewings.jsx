// src/pages/Viewings.jsx
import React from "react";
import jsPDF from "jspdf";
import { isEmail, isIsoDate, todayISO, isPhone } from "../utils/validators";

const API = "http://localhost:5000/api/viewings";

const S = {
  container: { maxWidth: 1100, margin: "0 auto", padding: 16 },
  h1: { fontSize: 24, fontWeight: 800, margin: "16px 0" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
  danger: { background: "#ef4444", color: "#fff", borderColor: "#ef4444" },
  input: { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14, background: "#f8fafc", fontWeight: 800, userSelect: "none", cursor: "pointer" },
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  stat: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 },
  toast: (ok) => ({
    position: "fixed", right: 16, top: 76, zIndex: 1100,
    background: ok ? "#16a34a" : "#dc2626", color: "#fff",
    padding: "10px 14px", borderRadius: 12, fontWeight: 800
  }),
};

const STATUS_COLORS = {
  Booked:    { bg: "#e0ecff", fg: "#1e40af", bd: "#93c5fd" },
  Completed: { bg: "#e7f9ed", fg: "#065f46", bd: "#86efac" },
  "No-show": { bg: "#fee2e2", fg: "#7f1d1d", bd: "#fecaca" },
  Converted: { bg: "#fff7ed", fg: "#9a3412", bd: "#fed7aa" },
};

export default function Viewings() {
  return (
    <div style={S.container}>
      <h1 style={S.h1}>Viewings</h1>
      <KPIs />
      <div style={S.card}>
        <ViewingsTable />
      </div>
    </div>
  );
}

/* ---------------- KPIs ---------------- */

function KPIs() {
  const [m, setM] = React.useState(null);

  // listen for "viewings:refresh" (fired by table after changes)
  React.useEffect(() => {
    const onRefresh = () => setTimeout(fetchMetrics, 0);
    window.addEventListener("viewings:refresh", onRefresh);
    fetchMetrics();
    return () => window.removeEventListener("viewings:refresh", onRefresh);

    async function fetchMetrics() {
      try {
        const res = await fetch(`${API}/metrics`);
        setM(await res.json());
      } catch {
        // ignore for summary
      }
    }
  }, []);

  if (!m) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
      <Stat title="Upcoming" value={m.upcoming} />
      <Stat title="Completed" value={m.completed} />
      <Stat title="Converted" value={`${m.converted} (${m.conversionRate}% )`} />
      <Stat title="No-show" value={`${m.noshow} (${m.noShowRate}% )`} />
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div style={S.stat}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ fontWeight: 900, fontSize: 20 }}>{value}</div>
    </div>
  );
}

/* ---------------- Table + Filters ---------------- */

function ViewingsTable() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const [toast, setToast] = React.useState(null);

  const [sort, setSort] = React.useState({ key: "dateTime", dir: "asc" }); // keys: dateTime, setting, staff, status

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 1800);
  };

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (setting) params.set("setting", setting);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${API}?${params.toString()}`);
    const data = await res.json();
    setRows(data);
    setLoading(false);
  }

  React.useEffect(() => { fetchRows(); }, [q, status, setting, from, to]);

  const exportCSV = () => {
    const header = ["ID", "Date", "Time", "Setting", "Child", "Parent", "Phone", "Email", "Staff", "Source", "Status", "Follow-up", "Notes"];
    const body = rows.map(r => [r.id, r.date, r.time, r.setting, r.childName, r.parentName, r.phone, r.email, r.staff, r.source, r.status, r.followUp, r.notes]);
    const csv = [header, ...body].map(a => a.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    download(csv, "viewings.csv", "text/csv");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("Viewings", 40, 40);
    doc.setFontSize(9);
    let y = 60;
    rows.forEach(r => {
      if (y > 780) { doc.addPage(); y = 40; }
      const line = `${r.date} ${r.time || ""} | ${r.setting} | ${r.childName} (${r.parentName}) | ${r.phone} | ${r.status}`;
      doc.text(line, 40, y);
      y += 14;
    });
    doc.save("viewings.pdf");
  };

  const mark = async (row, status) => {
    await fetch(`${API}/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await fetchRows();
    window.dispatchEvent(new Event("viewings:refresh"));
    showToast(`Marked ${row.id} as ${status}`);
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.id}?`)) return;
    await fetch(`${API}/${row.id}`, { method: "DELETE" });
    await fetchRows();
    window.dispatchEvent(new Event("viewings:refresh"));
    showToast("Deleted", true);
  };

  const sortRows = (list) => {
    const { key, dir } = sort;
    const sign = dir === "asc" ? 1 : -1;
    const cmp = (a, b) => {
      if (key === "dateTime") {
        const av = (a.date || "") + "T" + (a.time || "00:00");
        const bv = (b.date || "") + "T" + (b.time || "00:00");
        return av.localeCompare(bv) * sign;
      }
      return String(a[key] || "").localeCompare(String(b[key] || "")) * sign;
    };
    return [...list].sort(cmp);
  };

  return (
    <>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}

      <div style={S.toolbar}>
        <input placeholder="Search name, parent, phone, email, ID…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...S.input, minWidth: 260 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...S.input, maxWidth: 180 }}>
          <option value="">All status</option>
          <option>Booked</option>
          <option>Completed</option>
          <option>No-show</option>
          <option>Converted</option>
        </select>
        <input placeholder="Setting (e.g. Teddington)" value={setting} onChange={(e) => setSetting(e.target.value)} style={{ ...S.input, maxWidth: 200 }} />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...S.input, maxWidth: 160 }} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...S.input, maxWidth: 160 }} />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...S.btn, ...S.primary }}>+ New Viewing</button>
        <button onClick={exportCSV} style={S.btn}>Export CSV</button>
        <button onClick={exportPDF} style={S.btn}>Download PDF</button>
      </div>

      {loading ? <div>Loading…</div> : sortRows(rows).length === 0 ? <div style={{ color: "#64748b" }}>No viewings found.</div> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th
                style={S.th}
                onClick={() => setSort(s => s.key === "dateTime" ? ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }) : ({ key: "dateTime", dir: "asc" }))}
              >
                Date / Time {sort.key === "dateTime" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                style={S.th}
                onClick={() => setSort(s => s.key === "setting" ? ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }) : ({ key: "setting", dir: "asc" }))}
              >
                Setting {sort.key === "setting" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={S.th}>Child / Parent</th>
              <th style={S.th}>Contact</th>
              <th
                style={S.th}
                onClick={() => setSort(s => s.key === "staff" ? ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }) : ({ key: "staff", dir: "asc" }))}
              >
                Staff {sort.key === "staff" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={S.th}>Source</th>
              <th
                style={S.th}
                onClick={() => setSort(s => s.key === "status" ? ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }) : ({ key: "status", dir: "asc" }))}
              >
                Status {sort.key === "status" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th style={{ ...S.th, textAlign: "right", cursor: "default" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortRows(rows).map(r => (
              <tr key={r.id}>
                <td style={S.td}>{r.date} {r.time && <span style={{ color: "#64748b" }}>· {r.time}</span>}</td>
                <td style={S.td}>{r.setting}</td>
                <td style={S.td}>
                  <div style={{ fontWeight: 700 }}>{r.childName}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{r.parentName}</div>
                </td>
                <td style={S.td}>
                  <div>{r.phone}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{r.email}</div>
                </td>
                <td style={S.td}>{r.staff}</td>
                <td style={S.td}>{r.source}</td>
                <td style={S.td}><StatusPill value={r.status} /></td>
                <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={S.btn} onClick={() => { setEditing(r); setShowForm(true); }}>Edit</button>{" "}
                  <button style={S.btn} onClick={() => mark(r, "Completed")}>Completed</button>{" "}
                  <button style={S.btn} onClick={() => mark(r, "No-show")}>No-show</button>{" "}
                  <button style={S.btn} onClick={() => mark(r, "Converted")}>Converted</button>{" "}
                  <button style={S.btn} onClick={() => downloadICS(r)}>ICS</button>{" "}
                  <button style={{ ...S.btn, ...S.danger }} onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <ViewingForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await fetchRows();
            window.dispatchEvent(new Event("viewings:refresh"));
            showToast("Saved ✓", true);
          }}
        />
      )}
    </>
  );
}

function StatusPill({ value }) {
  const c = STATUS_COLORS[value] || { bg: "#f1f5f9", fg: "#334155", bd: "#e5e7eb" };
  return <span style={{ padding: "2px 8px", borderRadius: 999, fontWeight: 700, fontSize: 12, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>{value || "—"}</span>;
}

/* ---------------- Modal Form ---------------- */

function ViewingForm({ initial, onClose, onSaved }) {
  const [form, setForm] = React.useState(() => initial || {
    childName: "", parentName: "", phone: "", email: "",
    setting: "", date: new Date().toISOString().slice(0, 10), time: "10:00",
    staff: "", source: "Website", status: "Booked", followUp: "", notes: ""
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!String(form.childName || "").trim()) return "Child name is required";
    if (!String(form.parentName || "").trim()) return "Parent name is required";
    if (form.email && !isEmail(form.email)) return "Email format is invalid";
    if (form.phone && !isPhone(form.phone)) return "Phone must have 10–13 digits";
    if (!isIsoDate(form.date)) return "Date must be YYYY-MM-DD";
    if (!/^\d{2}:\d{2}$/.test(String(form.time || ""))) return "Time must be HH:MM";
    return "";
  };

  async function submit() {
    const v = validate();
    if (v) { setErr(v); return; }
    setSaving(true);
    if (initial) {
      await fetch(`${API}/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else {
      await fetch(`${API}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div style={backdrop}>
      <div style={{ ...S.card, width: 640, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{initial ? `Edit Viewing — ${initial.id}` : "New Viewing"}</div>

        {err && <div style={{ marginBottom: 8, color: "#b91c1c" }}>⚠ {err}</div>}

        <div style={S.row2}>
          <label><div style={lbl}>Child Name</div><input style={S.input} value={form.childName} onChange={e => set("childName", e.target.value)} /></label>
          <label><div style={lbl}>Parent Name</div><input style={S.input} value={form.parentName} onChange={e => set("parentName", e.target.value)} /></label>
        </div>

        <div style={S.row2}>
          <label><div style={lbl}>Phone</div><input style={S.input} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+44…" /></label>
          <label><div style={lbl}>Email</div><input style={S.input} value={form.email} onChange={e => set("email", e.target.value)} placeholder="name@example.com" /></label>
        </div>

        <div style={S.row3}>
          <label><div style={lbl}>Setting</div><input style={S.input} value={form.setting} onChange={e => set("setting", e.target.value)} placeholder="Teddington" /></label>
          <label><div style={lbl}>Date</div><input type="date" style={S.input} value={form.date} onChange={e => set("date", e.target.value)} /></label>
          <label><div style={lbl}>Time</div><input type="time" style={S.input} value={form.time} onChange={e => set("time", e.target.value)} /></label>
        </div>

        <div style={S.row3}>
          <label><div style={lbl}>Staff</div><input style={S.input} value={form.staff} onChange={e => set("staff", e.target.value)} /></label>
          <label><div style={lbl}>Source</div>
            <select style={S.input} value={form.source} onChange={e => set("source", e.target.value)}>
              <option>Website</option><option>Phone</option><option>Email</option><option>Walk-in</option><option>Other</option>
            </select>
          </label>
          <label><div style={lbl}>Status</div>
            <select style={S.input} value={form.status} onChange={e => set("status", e.target.value)}>
              <option>Booked</option><option>Completed</option><option>No-show</option><option>Converted</option>
            </select>
          </label>
        </div>

        <div style={S.row2}>
          <label><div style={lbl}>Follow-up</div><input type="date" style={S.input} value={form.followUp} onChange={e => set("followUp", e.target.value)} /></label>
          <label><div style={lbl}>Notes</div><input style={S.input} value={form.notes} onChange={e => set("notes", e.target.value)} /></label>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

const lbl = { fontSize: 12, color: "#475569", marginBottom: 4 };
const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ------- ICS utility ------- */
function downloadICS(row) {
  // Basic 45-minute slot default
  const start = `${row.date}T${(row.time || "10:00").replace(":", "")}00`;
  const endDt = addMinutes(row.date, row.time || "10:00", 45);
  const end = `${endDt.date}T${endDt.time.replace(":", "")}00`;

  const uid = `${row.id}@nursery`;
  const summary = `Nursery Viewing: ${row.childName}`;
  const desc = `Parent: ${row.parentName}\nPhone: ${row.phone}\nEmail: ${row.email}\nStatus: ${row.status}\nNotes: ${row.notes || ""}`;
  const location = row.setting || "Nursery";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nursery App//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(desc)}`,
    `LOCATION:${escapeICS(location)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  download(ics, `Viewing-${row.id}.ics`, "text/calendar");
}

function toUtcStamp(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function addMinutes(dateStr, timeStr, mins) {
  const [h, m] = (timeStr || "10:00").split(":").map(Number);
  const d = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
  d.setMinutes(d.getMinutes() + mins);
  const pad = (n) => String(n).padStart(2, "0");
  return { date: d.toISOString().slice(0, 10), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}
function escapeICS(s = "") {
  return String(s).replace(/\\n/g, "\\n").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
