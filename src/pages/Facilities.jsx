// src/pages/Facilities.jsx
import React from "react";
import jsPDF from "jspdf";

/**
 * REST expectations (adjust to your backend):
 *  GET    /api/facilities/incidents        -> [{...}]
 *  POST   /api/facilities/incidents        -> create (body = record)
 *  PATCH  /api/facilities/incidents/:id    -> update
 *  DELETE /api/facilities/incidents/:id    -> delete
 *
 *  GET    /api/facilities/accidents        -> [{...}]
 *  POST   /api/facilities/accidents        -> create
 *  PATCH  /api/facilities/accidents/:id    -> update
 *  DELETE /api/facilities/accidents/:id    -> delete
 *
 *  GET    /api/facilities/risks            -> [{ id, title, rows:[{...}] }]
 *  POST   /api/facilities/risks            -> create blank/seed
 *  PUT    /api/facilities/risks/:id        -> replace (title, rows)
 *  DELETE /api/facilities/risks/:id        -> delete assessment
 *
 *  (Cleaning tab is local-only)
 */

const API = "http://localhost:5000/api/facilities";

const S = {
  container: { maxWidth: 1100, margin: "0 auto", padding: 16 },
  h1: { fontSize: 24, fontWeight: 800, margin: "16px 0" },
  tabs: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  chip: (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 700,
    border: "1px solid #e5e7eb",
    background: active ? "#2563eb" : "#f1f5f9",
    color: active ? "#fff" : "#334155",
    cursor: "pointer",
  }),

  // Cards & buttons
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  cardSoft: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  btn: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
  danger: { background: "#ef4444", color: "#fff", borderColor: "#ef4444" },

  // Inputs
  input: { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" },

  // Toolbars (sticky)
  toolbar: {
    position: "sticky",
    top: 72,
    zIndex: 10,
    display: "flex",
    gap: 8,
    alignItems: "center",
    background: "#fff",
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    marginBottom: 12,
  },

  // Tables
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    borderTop: "1px solid #e5e7eb",
    padding: 8,
    textAlign: "left",
    fontSize: 14,
    background: "#f8fafc",
    fontWeight: 800,
  },
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 },

  // Layout helpers
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 },

  // Cleaning section
  sectionTitle: { fontWeight: 900, color: "#0f172a", marginBottom: 10 },
  itemRow: {
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    alignItems: "start",
    gap: 10,
    padding: "8px 0",
    borderTop: "1px solid #f1f5f9",
  },
  itemFirst: { borderTop: "none", paddingTop: 0 },
  muted: { fontSize: 12, color: "#64748b" },

  // Toast
  toast: (ok) => ({
    position: "fixed",
    right: 16,
    top: 76,
    zIndex: 1100,
    background: ok ? "#16a34a" : "#dc2626",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 800,
  }),
};

export default function Facilities() {
  return (
    <div style={S.container}>
      {/* compact table enhancements */}
      <style>{`
        table tr:nth-child(even) td { background: #fafafa; }
        table tr:hover td { background: #f6f7fb; }
      `}</style>

      <h1 style={S.h1}>Facilities</h1>
      <Tabs />
    </div>
  );
}

function Tabs() {
  const [tab, setTab] = React.useState("Incidents");
  return (
    <>
      <div style={S.tabs}>
        {["Incidents", "Accidents", "Risk Assessments", "Cleaning"].map((t) => (
          <button key={t} style={S.chip(tab === t)} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div style={S.card}>
        {tab === "Incidents" && <IncidentsTab />}
        {tab === "Accidents" && <AccidentsTab />}
        {tab === "Risk Assessments" && <RiskTab />}
        {tab === "Cleaning" && <CleaningTab />}
      </div>
    </>
  );
}

/* ===================== Incidents ===================== */

function IncidentsTab() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [editing, setEditing] = React.useState(null); // record or null
  const [show, setShow] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 1800);
  };

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${API}/incidents?` + params.toString());
    setRows(await res.json());
    setLoading(false);
  }
  React.useEffect(() => {
    fetchRows();
  }, [q, from, to]);

  const exportCSV = () => {
    const header = [
      "ID",
      "Child",
      "DOB",
      "Date",
      "Time",
      "Location",
      "Witnesses",
      "Description",
      "Handled",
      "Condition",
      "Parent informed",
      "Notified time",
    ];
    const body = rows.map((r) => [
      r.id,
      r.childName,
      r.dob,
      r.date,
      r.time,
      r.location,
      r.witnesses,
      r.description,
      r.handled,
      r.condition,
      r.parentInformed ? "Yes" : "No",
      r.notifiedTime || "",
    ]);
    const csv = [header, ...body]
      .map((a) => a.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(csv, "incidents.csv", "text/csv");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("Incident Records", 40, 40);
    doc.setFontSize(9);
    let y = 60;
    rows.forEach((r) => {
      if (y > 770) {
        doc.addPage();
        y = 40;
      }
      const line1 = `${r.date} ${r.time || ""} — ${r.childName} (${r.location || "n/a"})`;
      const line2 = `Desc: ${r.description || ""}`;
      doc.text(line1, 40, y);
      y += 13;
      doc.text(line2.slice(0, 110), 40, y);
      y += 16;
    });
    doc.save("incidents.pdf");
  };

  async function remove(r) {
    if (!window.confirm(`Delete incident ${r.id}?`)) return;
    await fetch(`${API}/incidents/${r.id}`, { method: "DELETE" });
    fetchRows();
    showToast("Deleted");
  }

  return (
    <>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}

      {/* sticky toolbar */}
      <div style={S.toolbar}>
        <input
          placeholder="Search child, location, notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...S.input, minWidth: 260 }}
        />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...S.input, maxWidth: 160 }} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...S.input, maxWidth: 160 }} />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setEditing(null); setShow(true); }} style={{ ...S.btn, ...S.primary }}>
          + New Incident
        </button>
        <button onClick={exportCSV} style={S.btn}>Export CSV</button>
        <button onClick={exportPDF} style={S.btn}>Download PDF</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <Empty text="No incidents found." />
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date / Time</th>
              <th style={S.th}>Child</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Description</th>
              <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}>
                  {r.date} {r.time && <span style={{ color: "#64748b" }}>· {r.time}</span>}
                </td>
                <td style={S.td}>
                  {r.childName} <span style={{ color: "#64748b" }}>({r.dob || "DOB n/a"})</span>
                </td>
                <td style={S.td}>{r.location}</td>
                <td style={S.td}>{r.description}</td>
                <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={S.btn} onClick={() => { setEditing(r); setShow(true); }}>
                    Edit
                  </button>{" "}
                  <button style={{ ...S.btn, ...S.danger }} onClick={() => remove(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {show && (
        <IncidentForm
          initial={editing}
          onClose={() => setShow(false)}
          onSaved={() => {
            setShow(false);
            fetchRows();
            showToast("Saved ✓", true);
          }}
        />
      )}
    </>
  );
}

function IncidentForm({ initial, onClose, onSaved }) {
  const [form, setForm] = React.useState(() =>
    initial || {
      childName: "",
      dob: "",
      date: new Date().toISOString().slice(0, 10),
      time: "10:00",
      witnesses: "",
      location: "",
      description: "",
      handled: "",
      condition: "",
      parentInformed: false,
      notifiedTime: "",
    }
  );
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!String(form.childName || "").trim()) return "Child name is required.";
    if (!String(form.date || "").trim()) return "Date is required.";
    return "";
  };

  async function submit() {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setSaving(true);
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `${API}/incidents/${initial.id}` : `${API}/incidents`;
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal title={initial ? `Edit Incident — ${initial.id}` : "New Incident"} onClose={onClose}>
      {err && <div style={{ color: "#b91c1c", marginBottom: 8 }}>⚠ {err}</div>}
      <div style={S.row2}>
        <Field label="Child’s name" value={form.childName} onChange={(v) => set("childName", v)} />
        <Field label="Date of birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} />
      </div>
      <div style={S.row3}>
        <Field label="Date" type="date" value={form.date} onChange={(v) => set("date", v)} />
        <Field label="Time" type="time" value={form.time} onChange={(v) => set("time", v)} />
        <Field label="Place incident occurred" value={form.location} onChange={(v) => set("location", v)} />
      </div>
      <Field label="Name of witnesses/adults present" value={form.witnesses} onChange={(v) => set("witnesses", v)} />
      <div style={S.row2}>
        <Field label="Description of incident" value={form.description} onChange={(v) => set("description", v)} />
        <Field label="How staff handled the incident" value={form.handled} onChange={(v) => set("handled", v)} />
      </div>
      <Field
        label="Condition of child following the incident"
        value={form.condition}
        onChange={(v) => set("condition", v)}
      />
      <div style={S.row3}>
        <label>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Parent informed?</div>
          <select
            value={form.parentInformed ? "Yes" : "No"}
            onChange={(e) => set("parentInformed", e.target.value === "Yes")}
            style={S.input}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </label>
        <Field label="Time notified" type="time" value={form.notifiedTime} onChange={(v) => set("notifiedTime", v)} />
        <div />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={S.btn}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

/* ===================== Accidents ===================== */

function AccidentsTab() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(null);
  const [show, setShow] = React.useState(false);

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`${API}/accidents?` + params.toString());
    setRows(await res.json());
    setLoading(false);
  }
  React.useEffect(() => {
    fetchRows();
  }, [q]);

  const exportCSV = () => {
    const header = [
      "ID",
      "Child",
      "Date",
      "Time",
      "Location",
      "Nature of accident",
      "Nature of injury",
      "First aid",
      "Attending person",
      "Other staff",
      "Parents notified by",
      "Comments",
      "Signed by",
      "Countersigned by",
    ];
    const body = rows.map((r) => [
      r.id,
      r.childName,
      r.date,
      r.time,
      r.location,
      r.natureAccident,
      r.natureInjury,
      r.firstAid,
      r.attendingPerson,
      r.otherStaff,
      r.parentsNotifiedBy,
      r.comments,
      r.signedBy,
      r.countersignedBy,
    ]);
    const csv = [header, ...body]
      .map((a) => a.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(csv, "accidents.csv", "text/csv");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("Child Accident Reports", 40, 40);
    doc.setFontSize(9);
    let y = 60;
    rows.forEach((r) => {
      if (y > 770) {
        doc.addPage();
        y = 40;
      }
      doc.text(`${r.date} ${r.time || ""} — ${r.childName} — ${r.natureAccident || ""}`, 40, y);
      y += 14;
      doc.text(`Injury: ${r.natureInjury || ""} | First Aid: ${r.firstAid || ""}`, 40, y);
      y += 16;
    });
    doc.save("accidents.pdf");
  };

  async function remove(r) {
    if (!window.confirm(`Delete accident ${r.id}?`)) return;
    await fetch(`${API}/accidents/${r.id}`, { method: "DELETE" });
    fetchRows();
  }

  return (
    <>
      {/* sticky toolbar */}
      <div style={S.toolbar}>
        <input
          placeholder="Search child, location, notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ ...S.input, minWidth: 260 }}
        />
        <div style={{ flex: 1 }} />
        <button onClick={() => { setEditing(null); setShow(true); }} style={{ ...S.btn, ...S.primary }}>
          + New Accident
        </button>
        <button onClick={exportCSV} style={S.btn}>Export CSV</button>
        <button onClick={exportPDF} style={S.btn}>Download PDF</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <Empty text="No accident reports found." />
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date / Time</th>
              <th style={S.th}>Child</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Nature of accident</th>
              <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={S.td}>
                  {r.date} {r.time && <span style={{ color: "#64748b" }}>· {r.time}</span>}
                </td>
                <td style={S.td}>{r.childName}</td>
                <td style={S.td}>{r.location}</td>
                <td style={S.td}>{r.natureAccident}</td>
                <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={S.btn} onClick={() => { setEditing(r); setShow(true); }}>
                    Edit
                  </button>{" "}
                  <button style={{ ...S.btn, ...S.danger }} onClick={() => remove(r)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {show && (
        <AccidentForm
          initial={editing}
          onClose={() => setShow(false)}
          onSaved={() => {
            setShow(false);
            fetchRows();
          }}
        />
      )}
    </>
  );
}

function AccidentForm({ initial, onClose, onSaved }) {
  const [form, setForm] = React.useState(() =>
    initial || {
      childName: "",
      date: new Date().toISOString().slice(0, 10),
      time: "10:00",
      location: "",
      natureAccident: "",
      natureInjury: "",
      firstAid: "",
      attendingPerson: "",
      otherStaff: "",
      parentsNotifiedBy: "Telephone",
      comments: "",
      signedBy: "",
      countersignedBy: "",
    }
  );
  const [saving, setSaving] = React.useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `${API}/accidents/${initial.id}` : `${API}/accidents`;
    setSaving(true);
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal title={initial ? `Edit Accident — ${initial.id}` : "New Accident"} onClose={onClose}>
      <div style={S.row2}>
        <Field label="Child’s full name" value={form.childName} onChange={(v) => set("childName", v)} />
        <Field label="Location" value={form.location} onChange={(v) => set("location", v)} />
      </div>
      <div style={S.row3}>
        <Field label="Date" type="date" value={form.date} onChange={(v) => set("date", v)} />
        <Field label="Time" type="time" value={form.time} onChange={(v) => set("time", v)} />
        <label>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Parents notified by</div>
          <select value={form.parentsNotifiedBy} onChange={(e) => set("parentsNotifiedBy", e.target.value)} style={S.input}>
            <option>Telephone</option>
            <option>Report</option>
            <option>Email</option>
            <option>In person</option>
          </select>
        </label>
      </div>
      <Field label="Nature of accident" value={form.natureAccident} onChange={(v) => set("natureAccident", v)} />
      <Field label="Nature of injury" value={form.natureInjury} onChange={(v) => set("natureInjury", v)} />
      <div style={S.row3}>
        <Field label="First aid administered" value={form.firstAid} onChange={(v) => set("firstAid", v)} />
        <Field label="Person attending to accident" value={form.attendingPerson} onChange={(v) => set("attendingPerson", v)} />
        <Field label="Other staff present" value={form.otherStaff} onChange={(v) => set("otherStaff", v)} />
      </div>
      <Field label="Comments" value={form.comments} onChange={(v) => set("comments", v)} />
      <div style={S.row3}>
        <Field label="Signed by" value={form.signedBy} onChange={(v) => set("signedBy", v)} />
        <Field label="Countersigned by" value={form.countersignedBy} onChange={(v) => set("countersignedBy", v)} />
        <div />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onClose} style={S.btn}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

/* ===================== Risk Assessments ===================== */

function RiskTab() {
  const [assessments, setAssessments] = React.useState([]);
  const [activeId, setActiveId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  async function loadAll() {
    setLoading(true);
    const res = await fetch(`${API}/risks`);
    const data = await res.json();
    setAssessments(data);
    if (!activeId && data.length) {
      setActiveId(data[0].id);
      setTitle(data[0].title || "Risk Assessment");
      setRows(data[0].rows || []);
    }
    setLoading(false);
  }
  React.useEffect(() => {
    loadAll();
  }, []);

  React.useEffect(() => {
    const a = assessments.find((x) => x.id === activeId);
    if (a) {
      setTitle(a.title || "Risk Assessment");
      setRows(a.rows || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function addRow() {
    setRows((r) => [
      ...r,
      { item: "", potentialRisk: "", actions: "", responsible: "", actionBy: "", when: "", completed: "", reviewed: "" },
    ]);
  }
  function setRow(i, patch) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (!activeId) {
      const res = await fetch(`${API}/risks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, rows }),
      });
      const created = await res.json();
      await loadAll();
      setActiveId(created.id);
    } else {
      await fetch(`${API}/risks/${activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, rows }),
      });
      await loadAll();
    }
  }

  async function createNew() {
    const res = await fetch(`${API}/risks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Risk Assessment", rows: [] }),
    });
    const created = await res.json();
    await loadAll();
    setActiveId(created.id);
  }

  async function remove() {
    if (!activeId) return;
    if (!window.confirm("Delete this assessment?")) return;
    await fetch(`${API}/risks/${activeId}`, { method: "DELETE" });
    await loadAll();
    setActiveId(assessments[0]?.id || "");
  }

  const exportCSV = () => {
    const header = [
      "Item/place/activity",
      "Potential risk",
      "Actions to minimise risk",
      "Responsible",
      "Action by whom?",
      "Action by when?",
      "Date completed",
      "Date reviewed",
    ];
    const body = rows.map((r) => [r.item, r.potentialRisk, r.actions, r.responsible, r.actionBy, r.when, r.completed, r.reviewed]);
    const csv = [header, ...body]
      .map((a) => a.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(csv, `${title || "risk-assessment"}.csv`, "text/csv");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Risk Assessment — ${title || ""}`, 40, 40);
    doc.setFontSize(9);
    let y = 60;
    rows.forEach((r) => {
      if (y > 770) {
        doc.addPage();
        y = 40;
      }
      doc.text(`Item: ${r.item}`, 40, y);
      y += 12;
      doc.text(`Risk: ${r.potentialRisk}`, 40, y);
      y += 12;
      doc.text(`Actions: ${r.actions}`, 40, y);
      y += 12;
      doc.text(
        `Resp: ${r.responsible} | By: ${r.actionBy} | When: ${r.when} | Completed: ${r.completed} | Reviewed: ${r.reviewed}`,
        40,
        y
      );
      y += 16;
    });
    doc.save(`${(title || "risk-assessment").replace(/\s+/g, "_")}.pdf`);
  };

  const downloadWord = () => {
    const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rowsHtml = rows
      .map(
        (r) => `
      <tr><td>${esc(r.item)}</td><td>${esc(r.potentialRisk)}</td><td>${esc(r.actions)}</td>
      <td>${esc(r.responsible)}</td><td>${esc(r.actionBy)}</td><td>${esc(r.when)}</td>
      <td>${esc(r.completed)}</td><td>${esc(r.reviewed)}</td></tr>
    `
      )
      .join("");
    const html = `
    <html><head><meta charset="utf-8"><style>
      body{font-family:Segoe UI,Arial,sans-serif;font-size:12pt}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
      th{background:#f3f4f6}
    </style></head><body>
      <h1>Risk Assessment — ${esc(title)}</h1>
      <table>
        <thead><tr>
          <th>Item/place/activity</th><th>Potential risk</th><th>Actions to minimise risk</th>
          <th>Responsible</th><th>By whom?</th><th>By when?</th><th>Date completed</th><th>Date reviewed</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`;
    downloadBlob(html, `${title || "risk-assessment"}.doc`, "application/msword");
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* sticky toolbar */}
      <div style={S.toolbar}>
        <select value={activeId} onChange={(e) => setActiveId(e.target.value)} style={{ ...S.input, maxWidth: 360 }}>
          {assessments.length === 0 ? (
            <option value="">No assessments</option>
          ) : (
            assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title || a.id}
              </option>
            ))
          )}
        </select>
        <button onClick={createNew} style={S.btn}>
          + New
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={exportCSV} style={S.btn}>
          Export CSV
        </button>
        <button onClick={exportPDF} style={S.btn}>
          Download PDF
        </button>
        <button onClick={downloadWord} style={{ ...S.btn, ...S.primary }}>
          Download Word
        </button>
        <button onClick={remove} style={{ ...S.btn, ...S.danger }}>
          Delete
        </button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <label>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>Title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={S.input} />
          </label>

          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Item/place/activity</th>
                <th style={S.th}>Potential risk</th>
                <th style={S.th}>Actions to minimise risk</th>
                <th style={S.th}>Responsible</th>
                <th style={S.th}>By whom?</th>
                <th style={S.th}>By when?</th>
                <th style={S.th}>Completed</th>
                <th style={S.th}>Reviewed</th>
                <th style={{ ...S.th, textAlign: "right" }}> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={S.td}>
                    (No rows)
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i}>
                    <td style={S.td}>
                      <input value={r.item} onChange={(e) => setRow(i, { item: e.target.value })} style={S.input} />
                    </td>
                    <td style={S.td}>
                      <input
                        value={r.potentialRisk}
                        onChange={(e) => setRow(i, { potentialRisk: e.target.value })}
                        style={S.input}
                      />
                    </td>
                    <td style={S.td}>
                      <input value={r.actions} onChange={(e) => setRow(i, { actions: e.target.value })} style={S.input} />
                    </td>
                    <td style={S.td}>
                      <input
                        value={r.responsible}
                        onChange={(e) => setRow(i, { responsible: e.target.value })}
                        style={S.input}
                      />
                    </td>
                    <td style={S.td}>
                      <input value={r.actionBy} onChange={(e) => setRow(i, { actionBy: e.target.value })} style={S.input} />
                    </td>
                    <td style={S.td}>
                      <input
                        value={r.when}
                        onChange={(e) => setRow(i, { when: e.target.value })}
                        style={S.input}
                        placeholder="YYYY-MM-DD"
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        value={r.completed}
                        onChange={(e) => setRow(i, { completed: e.target.value })}
                        style={S.input}
                        placeholder="YYYY-MM-DD"
                      />
                    </td>
                    <td style={S.td}>
                      <input
                        value={r.reviewed}
                        onChange={(e) => setRow(i, { reviewed: e.target.value })}
                        style={S.input}
                        placeholder="YYYY-MM-DD"
                      />
                    </td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <button style={{ ...S.btn, ...S.danger }} onClick={() => removeRow(i)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <button onClick={addRow} style={S.btn}>
              + Add row
            </button>
            <button onClick={save} style={{ ...S.btn, ...S.primary }}>
              Save assessment
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ===================== Cleaning ===================== */

function CleaningTab() {
  // Data
  const DEFAULTS = React.useMemo(
    () => ({
      ongoing: [
        "Wipe down high chairs, seating, tables, play areas",
        "Wash dishes; clean and disinfect food prep station",
        "Pick up toys and organise in bins",
        "Inspect entrances & doorways for hazards",
        "Disinfect diaper-changing tables after each use",
        "Empty trash and diaper pails > half full",
      ],
      daily: [
        "Clean & sanitise food prep surfaces, sinks, equipment",
        "Disinfect touch points: light switches, doorknobs",
        "Sweep, mop and vacuum",
        "Scrub toilets and sanitise bathroom surfaces",
        "Clean toys at end of day; check mats and cots",
      ],
      weekly: [
        "Clean storage cubbies; disinfect with wipes",
        "Launder nap mats/sheets; repair any rips",
        "Clean out refrigerators; check freshness",
        "Dust furnishings, fixtures, ceiling fans; wipe walls",
        "Clean behind toilets and under sinks",
      ],
      monthly: [
        "Reorganise storage areas; polish doors and windows",
        "Dust window sills, frames, baseboards",
        "Inspect floors for wear; check drains and plumbing",
      ],
      supplies: [
        "Dish soap / Dishwasher detergent",
        "Cleaning sponges",
        "Disinfecting sprays/solutions",
        "Vacuum",
        "Carpet cleaner",
        "Mop",
        "Sanitising bins for toys",
        "Laundry basket",
        "Spray bottles",
        "Laundry detergent",
        "Disposal diaper bags",
        "Wastebaskets",
        "Trash cans",
        "Paper towels",
        "Disposable gloves",
        "Towels/rugs",
        "Broom & dustpan",
      ],
    }),
    []
  );

  const [lists, setLists] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cleaningLists") || "null") || DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [checked, setChecked] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cleaningChecked") || "{}");
    } catch {
      return {};
    }
  });

  React.useEffect(() => localStorage.setItem("cleaningLists", JSON.stringify(lists)), [lists]);
  React.useEffect(() => localStorage.setItem("cleaningChecked", JSON.stringify(checked)), [checked]);

  const toggle = (key, idx) =>
    setChecked((c) => ({ ...c, [key]: { ...(c[key] || {}), [idx]: !c[key]?.[idx] } }));
  const resetTicks = () => setChecked({});

  function downloadPDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const sections = [
      ["Ongoing Tasks", lists.ongoing],
      ["Daily Cleaning Tasks", lists.daily],
      ["Weekly Cleaning Tasks", lists.weekly],
      ["Monthly Tasks", lists.monthly],
      ["Cleaning Supplies Checklist", lists.supplies],
    ];
    let y = 40;
    doc.setFontSize(16);
    doc.text("Cleaning & Supplies Checklist", 40, y);
    y += 18;
    doc.setFontSize(11);
    sections.forEach(([title, items]) => {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      doc.setFont(undefined, "bold");
      doc.text(title, 40, y);
      y += 12;
      doc.setFont(undefined, "normal");
      items.forEach((t, i) => {
        if (y > 780) {
          doc.addPage();
          y = 40;
        }
        const mark = checked[title]?.[i] ? "[x]" : "[ ]";
        doc.text(`${mark} ${t}`, 46, y);
        y += 12;
      });
      y += 6;
    });
    doc.save("cleaning-checklists.pdf");
  }

  const Section = ({ title, items }) => (
    <div style={S.cardSoft}>
      <div style={S.sectionTitle}>{title}</div>
      <div>
        {items.map((txt, i) => (
          <label key={`${title}:${i}`} style={{ ...S.itemRow, ...(i === 0 ? S.itemFirst : {}) }}>
            <input type="checkbox" checked={!!checked[title]?.[i]} onChange={() => toggle(title, i)} />
            <div>{txt}</div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* sticky toolbar */}
      <div style={S.toolbar}>
        <button onClick={downloadPDF} style={{ ...S.btn, ...S.primary }}>
          Download PDF
        </button>
        <button onClick={resetTicks} style={{ ...S.btn, ...S.danger }}>
          Reset ticks
        </button>
        <div style={{ flex: 1 }} />
        <span style={S.muted}>Ticks auto-save locally</span>
      </div>

      {/* responsive 2-col grid */}
      <div className="cardsGrid" style={S.cardsGrid}>
        <Section title="Ongoing Tasks" items={lists.ongoing} />
        <Section title="Daily Cleaning Tasks" items={lists.daily} />
        <Section title="Weekly Cleaning Tasks" items={lists.weekly} />
        <Section title="Monthly Tasks" items={lists.monthly} />
        <Section title="Cleaning Supplies Checklist" items={lists.supplies} />
      </div>

      {/* mobile: stack to one column */}
      <style>{`
        @media (max-width: 900px) {
          .cardsGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}

/* ===================== Shared utils ===================== */

function Empty({ text }) {
  return <div style={{ padding: 16, color: "#64748b" }}>{text}</div>;
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>{label}</div>
      <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={S.input} />
    </label>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div style={{ ...S.card, width: 720, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
        {children}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={S.btn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
