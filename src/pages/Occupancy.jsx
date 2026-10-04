// src/pages/Occupancy.jsx
import React from "react";
import jsPDF from "jspdf";

const API = "http://localhost:5000/api/occupancy";
const CHILDREN_API = "http://localhost:5000/api/children";

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
  th: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14, background: "#f8fafc", fontWeight: 800 },
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  stat: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 },
  hint: { fontSize: 12, color: "#64748b" }
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri"];

/* ---------- tiny utils ---------- */
const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
function monthAdd(yyyymm, delta) {
  const [y, m] = yyyymm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}`;
}
function monthsAhead(start, count=24) {
  return Array.from({ length: count }, (_, i) => monthAdd(start, i));
}
function pctColor(p) {
  // soft background cues
  if (p >= 90) return { background: "#f0fdf4", borderColor: "#bbf7d0" };      // greenish
  if (p >= 60) return { background: "#eff6ff", borderColor: "#bfdbfe" };      // bluish
  return { background: "#fff7ed", borderColor: "#fed7aa" };                    // amber
}
function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------- component ---------- */

export default function Occupancy() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [rooms, setRooms] = React.useState([]); // [{id,name,capacity,ages,Mon..Fri 0-100}]
  const [totRegistered, setTotRegistered] = React.useState(100);
  const [statusCounts, setStatusCounts] = React.useState({ enrolled: 0, offered: 0, accepted: 0, waiting: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}?month=${month}`);
        if (res.ok) {
          const data = await res.json();
          setRooms((data.rooms || []).map(normalizeRoom));
          setTotRegistered(data.totalRegistered ?? 100);
          setStatusCounts(data.statusCounts || { enrolled:0, offered:0, accepted:0, waiting:0 });
        } else {
          setRooms(demoRooms().map(normalizeRoom));
        }
      } catch {
        setRooms(demoRooms().map(normalizeRoom));
      } finally {
        setLoading(false);
      }

      // Try to auto-derive status counters from Children API (best-effort)
      try {
        const r = await fetch(`${CHILDREN_API}/status-counts`);
        if (r.ok) {
          const c = await r.json();
          if (["enrolled","offered","accepted","waiting"].every(k => k in c)) {
            setStatusCounts(c);
          }
        }
      } catch {/* ignore, keep current */}
    })();
  }, [month]);

  const addRoom = () => {
    const id = Math.random().toString(36).slice(2,8);
    setRooms(r => [...r, { id, name: "New Room", capacity: 10, ages: "", Mon:50, Tue:50, Wed:50, Thu:50, Fri:50 }]);
  };
  const setRoom = (id, key, val) => setRooms(rs => rs.map(r => r.id === id ? { ...r, [key]: val } : r));
  const removeRoom = (id) => {
    if (!window.confirm("Delete this room?")) return;
    setRooms(rs => rs.filter(r => r.id !== id));
  };

  async function save() {
    const payload = { month, totalRegistered: Number(totRegistered)||0, statusCounts, rooms };
    await fetch(API, { method: "PUT", headers: { "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    alert("Saved ✓");
  }

  function copyPreviousMonth() {
    const prev = monthAdd(month, -1);
    (async () => {
      try {
        const res = await fetch(`${API}?month=${prev}`);
        if (res.ok) {
          const data = await res.json();
          const from = (data.rooms || []).map(normalizeRoom);
          if (!from.length) { alert(`No data found for ${prev}.`); return; }
          // copy structure; keep same values initially
          setRooms(from.map(r => ({ ...r, id: Math.random().toString(36).slice(2,8) })));
          setTotRegistered(data.totalRegistered ?? totRegistered);
          setStatusCounts(data.statusCounts || statusCounts);
          alert(`Copied rooms from ${prev}.`);
        } else {
          alert(`Could not load ${prev}.`);
        }
      } catch {
        alert(`Could not load ${prev}.`);
      }
    })();
  }

  // Exports
  const exportCSV = () => {
    const header = ["Room","Capacity","Ages",...DAYS,"Overall %"];
    const body = rooms.map(r => [r.name, r.capacity, r.ages, r.Mon, r.Tue, r.Wed, r.Thu, r.Fri, roomOverall(r)]);
    const totals = perDayTotals(rooms);
    const footer = ["Totals","","", totals.Mon, totals.Tue, totals.Wed, totals.Thu, totals.Fri, totals.Overall];
    const csv = [header, ...body, footer].map(row => row.map(x => `"${String(x??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    download(csv, `occupancy-${month}.csv`, "text/csv");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    doc.setFontSize(14); doc.text(`Occupancy — ${month}`, 40, 40);
    doc.setFontSize(9);
    let y = 62;
    rooms.forEach(r => {
      if (y > 780) { doc.addPage(); y = 40; }
      const line = `${r.name} (${r.capacity}) | ${DAYS.map(d => `${d}:${(r[d]??0)}%`).join("  ")} | Overall ${roomOverall(r)}%`;
      doc.text(line, 40, y); y += 14;
    });
    const o = calcWeightedOverall(rooms);
    const t = perDayTotals(rooms);
    y += 10;
    doc.text(`Totals:  Mon ${t.Mon}%  Tue ${t.Tue}%  Wed ${t.Wed}%  Thu ${t.Thu}%  Fri ${t.Fri}%  | Overall ${t.Overall}%`, 40, y);
    y += 14;
    doc.text(`Total Registered Places: ${totRegistered}`, 40, y);
    doc.text(`Weighted Utilisation: ${o.pct}%`, 320, y);
    doc.save(`occupancy-${month}.pdf`);
  };

  const exportWord = () => {
    const head = ["Room","Capacity","Ages",...DAYS,"Overall %"];
    const rows = rooms.map(r => [r.name, r.capacity, r.ages, r.Mon, r.Tue, r.Wed, r.Thu, r.Fri, roomOverall(r)]);
    const totals = perDayTotals(rooms);
    rows.push(["Totals","","", totals.Mon, totals.Tue, totals.Wed, totals.Thu, totals.Fri, totals.Overall]);

    const thead = head.map(h => `<th>${esc(h)}</th>`).join("");
    const tbody = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
    const html = `
      <html><head><meta charset="utf-8"><style>
        body{font-family:Segoe UI,Arial,sans-serif;font-size:12pt}
        h1{font-size:18pt;margin:0 0 10px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
        th{background:#f3f4f6}
      </style></head><body>
      <h1>Occupancy — ${esc(month)}</h1>
      <div>Total Registered Places: ${esc(totRegistered)}</div>
      <div>Weighted Utilisation: ${esc(calcWeightedOverall(rooms).pct)}%</div>
      <br/>
      <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
      </body></html>`;
    download(html, `occupancy-${month}.doc`, "application/msword");
  };

  // Derived
  const overall = calcWeightedOverall(rooms);
  const totals = perDayTotals(rooms);

  return (
    <div style={S.container}>
      <h1 style={S.h1}>Occupancy</h1>

      {/* KPIs */}
      <div style={S.kpis}>
        <Stat title="Total Registered Places" value={totRegistered} />
        <Stat title="Weighted Utilisation" value={`${overall.pct}%`} />
        <Stat title="Rooms" value={rooms.length} />
        <Stat
          title="Enrolled / Offered / Accepted / Waiting"
          value={`${statusCounts.enrolled} / ${statusCounts.offered} / ${statusCounts.accepted} / ${statusCounts.waiting}`}
        />
      </div>

      <div style={S.card}>
        {/* Controls */}
        <div style={S.toolbar}>
          <button onClick={() => setMonth(m => monthAdd(m, -1))} style={S.btn}>◀ Prev</button>
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{ ...S.input, maxWidth: 160 }} />
          <button onClick={() => setMonth(m => monthAdd(m, +1))} style={S.btn}>Next ▶</button>

          <select
            value={month}
            onChange={(e)=>setMonth(e.target.value)}
            style={{ ...S.input, maxWidth: 180 }}
            title="Jump to month"
          >
            {monthsAhead(new Date().toISOString().slice(0,7), 24).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <button onClick={copyPreviousMonth} style={S.btn} title="Copy previous month’s layout">Copy previous</button>

          <label style={{ display:"flex", alignItems:"center", gap:8, marginLeft: 8 }}>
            <span style={{ fontSize:12, color:"#475569" }}>Registered Places</span>
            <input
              type="number"
              value={totRegistered}
              onChange={(e)=>setTotRegistered(Math.max(0, Number(e.target.value)||0))}
              style={{ ...S.input, maxWidth:120 }}
            />
          </label>
          <div style={{ flex:1 }} />
          <button onClick={addRoom} style={{ ...S.btn, ...S.primary }}>+ Room</button>
          <button onClick={exportCSV} style={S.btn}>CSV</button>
          <button onClick={exportPDF} style={S.btn}>PDF</button>
          <button onClick={exportWord} style={S.btn}>Word</button>
          <button onClick={save} style={{ ...S.btn, ...S.primary }}>Save</button>
        </div>

        {/* Table */}
        {loading ? <div>Loading…</div> : rooms.length === 0 ? (
          <div style={{ color:"#64748b" }}>No rooms yet.</div>
        ) : (
          <>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Room</th>
                  <th style={S.th}>Capacity</th>
                  <th style={S.th}>Ages</th>
                  {DAYS.map(d => <th key={d} style={S.th}>{d}</th>)}
                  <th style={S.th}>Overall</th>
                  <th style={{ ...S.th, textAlign:"right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td style={S.td}>
                      <input value={r.name} onChange={e=>setRoom(r.id,"name", e.target.value)} style={S.input} />
                    </td>
                    <td style={S.td}>
                      <input type="number" value={r.capacity} onChange={e=>setRoom(r.id,"capacity", Math.max(0, Number(e.target.value)||0))} style={S.input} />
                    </td>
                    <td style={S.td}>
                      <input value={r.ages || ""} onChange={e=>setRoom(r.id,"ages", e.target.value)} placeholder="e.g. 3–15m" style={S.input} />
                    </td>
                    {DAYS.map(d => {
                      const v = r[d] ?? 0;
                      return (
                        <td key={d} style={S.td}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <input
                              type="number" min="0" max="100"
                              value={v}
                              onChange={e=>setRoom(r.id, d, clampPct(e.target.value))}
                              style={{ ...S.input, ...pctColor(v) }}
                              aria-label={`${d} occupancy (%)`}
                            />
                            <span style={S.hint}>%</span>
                          </div>
                        </td>
                      );
                    })}
                    <td style={S.td}>{roomOverall(r)}%</td>
                    <td style={{ ...S.td, textAlign:"right" }}>
                      <button style={{ ...S.btn, ...S.danger }} onClick={()=>removeRoom(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}

                {/* Totals row (capacity-weighted) */}
                <tr>
                  <td style={{ ...S.td, fontWeight:800 }}>Totals</td>
                  <td style={S.td}>
                    {rooms.reduce((s, r) => s + (Number(r.capacity) || 0), 0)}
                  </td>
                  <td style={S.td}></td>
                  {DAYS.map(d => (
                    <td key={`tot-${d}`} style={{ ...S.td, fontWeight:800 }}>
                      {totals[d]}%
                    </td>
                  ))}
                  <td style={{ ...S.td, fontWeight:800 }}>{totals.Overall}%</td>
                  <td style={S.td}></td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 8, ...S.hint }}>
              Colour cues: <span style={{...badge("#fff7ed","#fed7aa")}}>Under 60%</span> <span style={{...badge("#eff6ff","#bfdbfe")}}>60–89%</span> <span style={{...badge("#f0fdf4","#bbf7d0")}}>90%+</span>
            </div>
          </>
        )}

        {/* Status counters (whiteboard: Enrolled / Offered / Accepted / Waiting list) */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Status Counters</div>
          <div style={S.row2}>
            <LabeledNumber label="Enrolled" value={statusCounts.enrolled} onChange={v=>setStatusCounts(s=>({ ...s, enrolled: v }))} />
            <LabeledNumber label="Offered" value={statusCounts.offered} onChange={v=>setStatusCounts(s=>({ ...s, offered: v }))} />
            <LabeledNumber label="Accepted" value={statusCounts.accepted} onChange={v=>setStatusCounts(s=>({ ...s, accepted: v }))} />
            <LabeledNumber label="Waiting list" value={statusCounts.waiting} onChange={v=>setStatusCounts(s=>({ ...s, waiting: v }))} />
          </div>
          <div style={{ marginTop: 6, ...S.hint }}>
            These values auto-populate when available from the Children API; you can override them here.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------ helpers & small components ------------ */

function Stat({ title, value }) {
  return (
    <div style={S.stat}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{title}</div>
      <div style={{ fontWeight: 900, fontSize: 20 }}>{value}</div>
    </div>
  );
}

function LabeledNumber({ label, value, onChange }) {
  return (
    <label>
      <div style={{ fontSize:12, color:"#475569", marginBottom:4 }}>{label}</div>
      <input type="number" value={value} onChange={(e)=>onChange(Math.max(0, Number(e.target.value)||0))} style={S.input} />
    </label>
  );
}

function roomOverall(r) {
  const vals = DAYS.map(d => Number(r[d]) || 0);
  const sum = vals.reduce((a,b)=>a+b,0);
  return Math.round(sum / vals.length);
}

function calcWeightedOverall(rooms) {
  if (!rooms.length) return { pct: 0 };
  let capSum = 0, acc = 0;
  rooms.forEach(r => {
    const cap = Number(r.capacity) || 0;
    capSum += cap;
    acc += cap * roomOverall(r);
  });
  const pct = capSum ? Math.round(acc / capSum) : 0;
  return { pct };
}

function perDayTotals(rooms) {
  // capacity-weighted per-day averages + overall
  let capSum = 0;
  const acc = { Mon:0, Tue:0, Wed:0, Thu:0, Fri:0 };
  rooms.forEach(r => {
    const cap = Number(r.capacity) || 0;
    capSum += cap;
    DAYS.forEach(d => acc[d] += cap * (Number(r[d]) || 0));
  });
  const totals = Object.fromEntries(DAYS.map(d => [d, capSum ? Math.round(acc[d] / capSum) : 0]));
  totals.Overall = calcWeightedOverall(rooms).pct;
  return totals;
}

function badge(bg, border) {
  return { display:"inline-block", padding:"2px 8px", marginRight:6, borderRadius:999, border:`1px solid ${border}`, background:bg, fontSize:12 };
}

function normalizeRoom(r) {
  const base = { Mon:0, Tue:0, Wed:0, Thu:0, Fri:0 };
  return { ...base, ...r };
}

function demoRooms() {
  return [
    { id:"r1", name:"Baby", capacity:20, ages:"3–15m", Mon:50, Tue:100, Wed:100, Thu:100, Fri:50 },
    { id:"r2", name:"Toddlers", capacity:20, ages:"15m–21m", Mon:50, Tue:100, Wed:100, Thu:100, Fri:100 },
    { id:"r3", name:"2–3s", capacity:30, ages:"2–3y", Mon:80, Tue:85, Wed:90, Thu:88, Fri:84 },
    { id:"r4", name:"Preschool", capacity:30, ages:"3–5y", Mon:95, Tue:94, Wed:96, Thu:97, Fri:95 },
  ];
}
