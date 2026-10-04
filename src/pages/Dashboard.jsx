// src/pages/Dashboard.jsx
import React from "react";
import jsPDF from "jspdf";

/** ---------- Endpoints (align with other pages) ---------- */
const CHILDREN_API = "http://localhost:5000/api/children/summary";
const FINANCE_API  = "http://localhost:5000/api/finance/reports/summary";
const OCC_API      = "http://localhost:5000/api/occupancy";
const OFSTED_API   = "http://localhost:5000/api/ofsted";

/** ---------- Styles (kept consistent with the app) ---------- */
const S = {
  container: { maxWidth: 1100, margin: "0 auto", padding: "0 16px" },
  h1: { fontSize: 24, fontWeight: 800, margin: "16px 0" },
  grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  kpiTitle: { fontSize: 12, color: "#64748b" },
  kpiValue: { fontSize: 24, fontWeight: 900, lineHeight: 1.1, margin: "6px 0 4px" },
  kpiSub: { fontSize: 12, color: "#475569" },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "0 0 12px" },
  input: { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" },
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
  linkBtn: { textDecoration: "none", color: "inherit" },
  alerts: { display: "grid", gap: 8, marginBottom: 12 },
  alert: (tone="amber") => ({
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid",
    background: tone === "red" ? "#fef2f2" : "#fffbeb",
    borderColor: tone === "red" ? "#fecaca" : "#fde68a",
    color: tone === "red" ? "#7f1d1d" : "#78350f", fontWeight: 700
  }),
  pills: { display: "flex", gap: 8, flexWrap: "wrap" },
  pill: (bg="#f1f5f9", bd="#e5e7eb", fg="#334155") => ({
    padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: bg, border: `1px solid ${bd}`, color: fg
  }),
  small: { fontSize: 12, color: "#64748b" }
};

/** ---------- Small utilities ---------- */
const safeNum = (n, d=0) => Number.isFinite(Number(n)) ? Number(n) : d;
const fmtGBP = (n) => `£${(Number(n) || 0).toFixed(2)}`;
const todayISO = () => new Date().toISOString().slice(0,10);
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return { __error: e.message || "Network error" };
  }
}

/** ---------- Sparkline (inline SVG, no deps) ---------- */
function Spark({ data = [], width = 120, height = 36, strokeWidth = 2, title }) {
  const vals = data.filter((n) => Number.isFinite(Number(n))).map(Number);
  if (!vals.length) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = 4;
  const w = width - pad * 2, h = height - pad * 2;
  const xStep = vals.length > 1 ? w / (vals.length - 1) : 0;

  const path = vals.map((v, i) => {
    const x = pad + i * xStep;
    const y = pad + (max === min ? h / 2 : (1 - (v - min) / (max - min)) * h);
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg width={width} height={height} aria-label={title || "sparkline"}>
      <path d={path} fill="none" stroke="#2563eb" strokeWidth={strokeWidth} />
    </svg>
  );
}

/** ---------- KPI Card ---------- */
function KpiCard({ title, value, sub, to, extra, spark }) {
  const body = (
    <div style={S.card} role="region" aria-label={title}>
      <div style={S.kpiTitle}>{title}</div>
      <div style={S.kpiValue}>{value}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
      {(spark || extra) && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {spark || <span />}
          {extra}
        </div>
      )}
    </div>
  );
  return to ? <a href={to} style={{ ...S.linkBtn }}>{body}</a> : body;
}

/** ---------- Dashboard ---------- */
export default function Dashboard() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [children, setChildren] = React.useState(null);  // {total,enrolled,waiting,newThisMonth, history?}
  const [finance, setFinance]   = React.useState(null);  // {outstanding,month,lastInvoice,aging,payrollEstimate, history?}
  const [occupancy, setOcc]     = React.useState(null);  // {totalRegistered, rooms, statusCounts}
  const [ofsted, setOfsted]     = React.useState({ incidents:null, complaints:null, audits:null, lastDrill:null });

  const [loading, setLoading] = React.useState(true);
  const [errors, setErrors]   = React.useState([]);

  // Load everything in parallel; partial failures still render the rest
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const errs = [];

      const childrenP = fetchJson(CHILDREN_API);
      const financeP  = fetchJson(FINANCE_API);
      const occP      = fetchJson(`${OCC_API}?month=${month}`);
      const incP      = fetchJson(`${OFSTED_API}/incidents?status=Logged`);
      const inc2P     = fetchJson(`${OFSTED_API}/incidents?status=Investigating`);
      const compP     = fetchJson(`${OFSTED_API}/complaints?status=Logged`);
      const comp2P    = fetchJson(`${OFSTED_API}/complaints?status=Investigating`);
      const auditsP   = fetchJson(`${OFSTED_API}/audits?status=Open`);
      const drillsP   = fetchJson(`${OFSTED_API}/fire-drills?to=${todayISO()}&limit=1&sort=desc`);

      const [
        childrenR, financeR, occR,
        incR, inc2R, compR, comp2R, auditsR, drillsR
      ] = await Promise.all([childrenP, financeP, occP, incP, inc2P, compP, comp2P, auditsP, drillsP]);

      // track errors but keep data
      const pushErr = (name, r) => { if (r && r.__error) errs.push(`${name}: ${r.__error}`); };

      pushErr("Children", childrenR);
      pushErr("Finance",  financeR);
      pushErr("Occupancy",occR);
      pushErr("Incidents",incR);
      pushErr("Incidents (Investigating)",inc2R);
      pushErr("Complaints",compR);
      pushErr("Complaints (Investigating)",comp2R);
      pushErr("Audits",auditsR);
      pushErr("Fire drills",drillsR);

      if (!cancelled) {
        setChildren(childrenR.__error ? null : childrenR);
        setFinance(financeR.__error ? null : financeR);
        setOcc(occR.__error ? null : occR);
        setOfsted({
          incidents: incR.__error || inc2R.__error ? null : [...(incR||[]), ...(inc2R||[])],
          complaints: compR.__error || comp2R.__error ? null : [...(compR||[]), ...(comp2R||[])],
          audits: auditsR.__error ? null : (auditsR || []),
          lastDrill: drillsR?.[0] && !drillsR.__error ? drillsR[0] : null
        });
        setErrors(errs);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [month]);

  /** ----- Derived values & fallbacks ----- */
  const enrolled = children?.enrolled ?? 0;
  const waiting  = children?.waiting ?? 0;
  const newThisMonth = children?.newThisMonth ?? 0;

  const outstanding = finance?.outstanding ?? 0;
  const aging = finance?.aging || { "0-30":0, "31-60":0, "61-90":0, "90+":0 };
  const payrollEstimate = finance?.payrollEstimate ?? 0;

  const totalRegistered = occupancy?.totalRegistered ?? 0;
  const rooms = occupancy?.rooms || [];
  const statusCounts = occupancy?.statusCounts || { enrolled:0, offered:0, accepted:0, waiting:0 };

  const overallOcc = rooms.length
    ? Math.round(rooms.reduce((sum, r) => {
        const days = ["Mon","Tue","Wed","Thu","Fri"].map(d => Number(r[d]) || 0);
        const avg = days.reduce((a,b)=>a+b,0)/days.length;
        return sum + avg;
      }, 0) / rooms.length)
    : 0;

  const lastDrillDate = ofsted.lastDrill?.date || null;
  const lastDrillSigned = Boolean(ofsted.lastDrill?.signedBy);
  const drillOverdue = lastDrillDate ? (Date.now() - new Date(lastDrillDate).getTime() > 90*24*60*60*1000) : true;

  const openIncidents = ofsted.incidents?.length ?? 0;
  const openComplaints = ofsted.complaints?.length ?? 0;
  const riskyAudits = (ofsted.audits || []).filter(a =>
    a?.rating === "Poor" || a?.rating === "Requires Action" ||
    (a?.actionsDue && new Date(a.actionsDue) < new Date() && a?.status !== "Closed")
  ).length;

  // Demo sparklines if history missing
  const childrenHistory = children?.history || [8,9,11,10,12,14];
  const outstandingHistory = finance?.history || [4200, 6100, 5900, 6800, 6400, outstanding || 7000];

  /** ----- Alerts (red/amber) ----- */
  const alertList = [];
  if (drillOverdue || !lastDrillSigned) {
    alertList.push({
      tone: drillOverdue ? "red" : "amber",
      text: drillOverdue
        ? "Overdue fire drill — run and sign a drill."
        : "Last fire drill is missing a signature.",
      to: "/ofsted"
    });
  }
  if (openIncidents > 0) alertList.push({ tone:"amber", text:`${openIncidents} incident(s) open`, to:"/ofsted" });
  if (openComplaints > 0) alertList.push({ tone:"amber", text:`${openComplaints} complaint(s) open`, to:"/ofsted" });
  if (riskyAudits > 0) alertList.push({ tone:"amber", text:`${riskyAudits} audit(s) need action`, to:"/ofsted" });
  if ((aging["90+"] || 0) > 0) alertList.push({ tone:"red", text:`Finance aging 90+ has ${fmtGBP(aging["90+"])}`, to:"/finance" });

  /** ----- Quick actions ----- */
  const QuickActions = (
    <div style={{ ...S.card, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
      <div style={{ fontWeight: 800 }}>Quick actions</div>
      <div style={{ flex:1 }} />
      <a href="/children" style={S.linkBtn}><button style={S.btn}>Add Child</button></a>
      <a href="/finance" style={S.linkBtn}><button style={S.btn}>Run Invoices</button></a>
      <a href="/ofsted" style={S.linkBtn}><button style={S.btn}>Log Incident</button></a>
      <a href="/ofsted" style={S.linkBtn}><button style={S.btn}>New Fire Drill</button></a>
      <button onClick={exportSnapshotPDF} style={{ ...S.btn, ...S.primary }}>Export Snapshot</button>
    </div>
  );

  /** ----- Export snapshot to PDF ----- */
  function exportSnapshotPDF() {
    const doc = new jsPDF({ unit:"pt", format:"a4" });
    let y = 40;
    doc.setFontSize(16); doc.text("Nursery Dashboard Snapshot", 40, y); y += 18;
    doc.setFontSize(10); doc.text(`As of ${todayISO()}  •  Month: ${month}`, 40, y); y += 10;

    const add = (label, value) => { y += 14; doc.setFontSize(12); doc.text(`${label}: ${value}`, 40, y); };
    y += 10;

    doc.setFontSize(14); doc.text("KPIs", 40, y); y += 6;
    add("Children (enrolled)", enrolled);
    add("New this month", newThisMonth);
    add("Waiting list", waiting);
    add("Finance — Outstanding", fmtGBP(outstanding));
    add("Aging 90+", fmtGBP(aging["90+"] || 0));
    add("Payroll estimate", fmtGBP(payrollEstimate));
    add("Occupancy — Overall utilisation", `${overallOcc}%`);
    add("Registered places", totalRegistered);
    add("Status counters (E/O/A/W)", `${statusCounts.enrolled}/${statusCounts.offered}/${statusCounts.accepted}/${statusCounts.waiting}`);
    add("Open incidents / complaints / risky audits", `${openIncidents} / ${openComplaints} / ${riskyAudits}`);
    add("Last fire drill", lastDrillDate ? `${lastDrillDate}${lastDrillSigned ? "" : " (unsigned)"}` : "—");

    if (alertList.length) {
      y += 20; doc.setFontSize(14); doc.text("Alerts", 40, y); y += 6;
      doc.setFontSize(12);
      alertList.forEach(a => { y += 14; doc.text(`• ${a.text}`, 40, y); });
    }

    doc.save(`dashboard-${month}.pdf`);
  }

  /** ----- Loading / error banner ----- */
  const ErrorBanner = errors.length ? (
    <div style={{ ...S.alert("amber"), marginBottom: 12 }}>
      Some data couldn’t be loaded. {errors.slice(0,2).join(" • ")}{errors.length > 2 ? "…" : ""}
    </div>
  ) : null;

  return (
    <div style={S.container}>
      <h1 style={S.h1}>Overview</h1>

      {/* Controls */}
      <div style={S.toolbar}>
        <label>
          <div style={{ fontSize:12, color:"#475569", marginBottom:4 }}>Month</div>
          <input
            type="month"
            value={month}
            onChange={(e)=>setMonth(e.target.value)}
            style={{ ...S.input, maxWidth: 160 }}
          />
        </label>
        <div style={{ flex:1 }} />
        <a href="/children" style={S.linkBtn}><button style={S.btn}>Children</button></a>
        <a href="/finance" style={S.linkBtn}><button style={S.btn}>Finance</button></a>
        <a href="/occupancy" style={S.linkBtn}><button style={S.btn}>Occupancy</button></a>
        <a href="/ofsted" style={S.linkBtn}><button style={S.btn}>Compliance</button></a>
      </div>

      {/* Alerts */}
      {loading ? null : (
        <div style={S.alerts}>
          {alertList.map((a, i) => (
            <a key={i} href={a.to} style={S.linkBtn}>
              <div style={S.alert(a.tone)}>{a.text}</div>
            </a>
          ))}
          {ErrorBanner}
        </div>
      )}

      {/* KPI grid */}
      <div style={S.grid}>
        <KpiCard
          title="Children (Enrolled)"
          value={loading ? "…" : enrolled}
          sub={loading ? "" : `New this month: ${newThisMonth} • Waiting list: ${waiting}`}
          to="/children"
          spark={<Spark data={childrenHistory} title="children trend" />}
        />
        <KpiCard
          title="Finance — Outstanding"
          value={loading ? "…" : fmtGBP(outstanding)}
          sub={loading ? "" : `90+: ${fmtGBP(aging["90+"] || 0)} • Month: ${finance?.month || month}`}
          to="/finance"
          spark={<Spark data={outstandingHistory} title="outstanding trend" />}
        />
        <KpiCard
          title="Occupancy — Overall"
          value={loading ? "…" : `${overallOcc}%`}
          sub={loading ? "" : `Registered places: ${totalRegistered}`}
          to="/occupancy"
          extra={
            !loading && (
              <div style={S.pills}>
                <span style={S.pill("#e0ecff","#93c5fd","#1e40af")}>Rooms {rooms.length}</span>
                <span style={S.pill("#e7f9ed","#86efac","#065f46")}>Enrolled {statusCounts.enrolled}</span>
                <span style={S.pill("#fff7ed","#fed7aa","#9a3412")}>Offered {statusCounts.offered}</span>
                <span style={S.pill("#f1f5f9","#e5e7eb","#334155")}>Accepted {statusCounts.accepted}</span>
                <span style={S.pill("#fee2e2","#fecaca","#7f1d1d")}>Waiting {statusCounts.waiting}</span>
              </div>
            )
          }
        />
        <KpiCard
          title="Compliance"
          value={loading ? "…" : `${openIncidents + openComplaints + riskyAudits}`}
          sub={loading ? "" : `Incidents: ${openIncidents} • Complaints: ${openComplaints} • Audits w/ action: ${riskyAudits}`}
          to="/ofsted"
        />
        <KpiCard
          title="Payroll (Estimate)"
          value={loading ? "…" : fmtGBP(payrollEstimate)}
          sub="From Finance summary"
          to="/finance"
        />
        <KpiCard
          title="Fire Drill"
          value={loading ? "…" : (lastDrillDate || "—")}
          sub={
            loading ? "" :
            (!lastDrillDate ? "No record found" : (lastDrillSigned ? "Signed" : "Missing signature"))
          }
          to="/ofsted"
        />
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 12 }}>
        {QuickActions}
      </div>

      {/* Helpful notes */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={S.small}>
          Tip: Click any KPI card to jump to the relevant area. Export Snapshot bundles key figures into a one-page PDF.
        </div>
      </div>
    </div>
  );
}
