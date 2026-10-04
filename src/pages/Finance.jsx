// src/pages/Finance.jsx
import React from "react";
import jsPDF from "jspdf";

const API = "http://localhost:5000/api/finance";
const CHILDREN_API = "http://localhost:5000/api/children";

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
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
  danger: { background: "#ef4444", color: "#fff", borderColor: "#ef4444" },
  input: { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14, background: "#f8fafc", fontWeight: 800 },
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  stat: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  pill: (ok) => ({
    padding: "2px 8px", borderRadius: 999, fontWeight: 700, fontSize: 12,
    background: ok ? "#e7f9ed" : "#fee2e2",
    border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`,
    color: ok ? "#065f46" : "#7f1d1d"
  })
};

export default function Finance() {
  const [tab, setTab] = React.useState("Outstanding");
  return (
    <div style={S.container}>
      <h1 style={S.h1}>Finance</h1>

      <div style={S.tabs}>
        {["Outstanding", "Account", "Payroll", "Reports"].map((t) => (
          <button key={t} style={S.chip(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div style={S.card}>
        {tab === "Outstanding" && <Outstanding />}
        {tab === "Account" && <Account />}
        {tab === "Payroll" && <Payroll />}
        {tab === "Reports" && <FinanceReports />}
      </div>
    </div>
  );
}

/* ---------------- Outstanding ---------------- */

function Outstanding() {
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [setting, setSetting] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const [payChild, setPayChild] = React.useState(null);    // {childId,name}
  const [creditChild, setCreditChild] = React.useState(null);
  const [writeOffChild, setWriteOffChild] = React.useState(null);
  const [planChild, setPlanChild] = React.useState(null);

  const [showReminders, setShowReminders] = React.useState(false);
  const [reminders, setReminders] = React.useState(null);
  const [genBusy, setGenBusy] = React.useState(false);

  // selection for bulk actions
  const [selected, setSelected] = React.useState({}); // {childId:true}

  async function fetchRows() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (setting) params.set("setting", setting);
    const res = await fetch(`${API}/outstanding?` + params.toString());
    const data = await res.json();
    setRows(data);
    // clean selected if filtered out
    const ids = new Set(data.map(r => r.childId));
    setSelected(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => ids.has(id))));
    setLoading(false);
  }
  React.useEffect(() => { fetchRows(); }, [q, status, setting]); // eslint-disable-line

  const total = rows.reduce((s, r) => s + (r.balance || 0), 0);
  const selectedIds = Object.keys(selected).filter(k => selected[k]);

  const toggleAll = (checked) => {
    if (!checked) { setSelected({}); return; }
    const next = {};
    rows.forEach(r => { next[r.childId] = true; });
    setSelected(next);
  };

  const exportCSV = () => {
    const header = ["Child ID", "Name", "Setting", "Status", "Balance"];
    const body = rows.map(r => [r.childId, r.name, r.setting, r.status, r.balance]);
    const csv = [header, ...body].map(a => a.map(x => `"${String(x ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadBlob(csv, "outstanding.csv", "text/csv");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const drawHeader = (y) => {
      doc.setFontSize(14); doc.text("Outstanding Accounts", 14, y);
      doc.setFontSize(10);
      y += 8;
      doc.text("Child", 14, y);
      doc.text("Setting", 70, y);
      doc.text("Status", 110, y);
      doc.text("Balance", 196, y, { align: "right" });
      return y + 4;
    };

    let y = drawHeader(14);
    rows.forEach(r => {
      if (y > 280) { doc.addPage(); y = drawHeader(14); }
      doc.text(`${r.name} (${r.childId})`, 14, y);
      doc.text(String(r.setting || ""), 70, y);
      doc.text(String(r.status || ""), 110, y);
      doc.text(`£${(r.balance||0).toFixed(2)}`, 196, y, { align: "right" });
      y += 6;
    });
    doc.text(`Total: £${total.toFixed(2)}`, 196, y + 2, { align: "right" });
    doc.save("outstanding.pdf");
  };

  async function openReminders() {
    setShowReminders(true);
    const res = await fetch(`${API}/reminders`);
    setReminders(await res.json());
  }

  async function generateInvoices() {
    const month = prompt("Generate invoices for which month? (YYYY-MM)", new Date().toISOString().slice(0,7));
    if (!month) return;
    const rate = Number(prompt("Rate per hour (£)?", "8"));
    setGenBusy(true);
    const res = await fetch(`${API}/invoices/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, ratePerHour: Number.isFinite(rate) ? rate : 8 })
    });
    const data = await res.json();
    setGenBusy(false);
    alert(`Generated ${data.count} invoices for ${data.month}.`);
    fetchRows(); // refresh totals
  }

  async function bulkWriteOff() {
    if (selectedIds.length === 0) return alert("Select one or more rows.");
    const reason = prompt(`Write-off reason for ${selectedIds.length} account(s)?`, "Goodwill write-off");
    if (!reason) return;
    const ok = window.confirm("Apply write-off to all selected? This cannot be undone.");
    if (!ok) return;
    await fetch(`${API}/account/bulk-writeoff`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ childIds: selectedIds, reason })
    }).catch(()=>{});
    fetchRows();
  }

  return (
    <>
      <div style={S.toolbar}>
        <input placeholder="Search child, setting, status…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...S.input, minWidth: 250 }}/>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={{ ...S.input, maxWidth: 180 }}>
          <option value="">All status</option>
          <option>Enrolled</option>
          <option>Waiting list</option>
          <option>Left</option>
        </select>
        <input placeholder="Setting (e.g. Teddington)" value={setting} onChange={(e)=>setSetting(e.target.value)} style={{ ...S.input, maxWidth: 200 }} />
        <div style={{ flex: 1 }} />
        <button onClick={exportCSV} style={S.btn}>Export CSV</button>
        <button onClick={exportPDF} style={S.btn}>Download PDF</button>
        <button onClick={openReminders} style={S.btn}>Send Fee Reminders</button>
        <button onClick={bulkWriteOff} style={{ ...S.btn, ...S.danger }}>Bulk Write-off</button>
        <button onClick={generateInvoices} disabled={genBusy} style={{ ...S.btn, ...S.primary }}>
          {genBusy ? "Generating…" : "Generate Month Invoices"}
        </button>
      </div>

      {loading ? <div>Loading…</div> : rows.length === 0 ? <Empty text="No rows found."/> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 34 }}>
                <input type="checkbox"
                  checked={rows.length>0 && selectedIds.length===rows.length}
                  onChange={(e)=>toggleAll(e.target.checked)} />
              </th>
              <th style={S.th}>Child</th>
              <th style={S.th}>Setting</th>
              <th style={S.th}>Status</th>
              <th style={{ ...S.th, textAlign: "right" }}>Balance</th>
              <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSel = !!selected[r.childId];
              return (
                <tr key={r.childId} style={isSel ? { background:"#f8fafc" } : undefined}>
                  <td style={S.td}>
                    <input type="checkbox"
                      checked={isSel}
                      onChange={(e)=>setSelected(prev => ({ ...prev, [r.childId]: e.target.checked }))} />
                  </td>
                  <td style={S.td}>{r.name} <span style={{ color:"#64748b" }}>({r.childId})</span></td>
                  <td style={S.td}>{r.setting}</td>
                  <td style={S.td}>{r.status}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>£{(r.balance||0).toFixed(2)}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    <div style={{ display:"flex", gap:6, justifyContent:"flex-end", flexWrap:"wrap" }}>
                      <button style={S.btn} onClick={()=>setPlanChild({ childId:r.childId, name:r.name })}>Plan</button>
                      <button style={S.btn} onClick={()=>setCreditChild({ childId:r.childId, name:r.name })}>Credit</button>
                      <button style={{ ...S.btn, ...S.danger }} onClick={()=>setWriteOffChild({ childId:r.childId, name:r.name })}>Write-off</button>
                      <button style={{ ...S.btn, ...S.primary }} onClick={()=>setPayChild({ childId:r.childId, name:r.name })}>Payment</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td style={S.td}></td>
              <td style={{ ...S.td, fontWeight: 800 }}>Total</td>
              <td style={S.td}></td>
              <td style={S.td}></td>
              <td style={{ ...S.td, textAlign: "right", fontWeight: 800 }}>£{total.toFixed(2)}</td>
              <td style={S.td}></td>
            </tr>
          </tbody>
        </table>
      )}

      <AgingWidget />

      {/* Modals */}
      {payChild && (
        <PayModal
          child={payChild}
          onClose={() => setPayChild(null)}
          onDone={() => { setPayChild(null); fetchRows(); }}
        />
      )}
      {creditChild && (
        <CreditModal
          child={creditChild}
          onClose={() => setCreditChild(null)}
          onDone={() => { setCreditChild(null); fetchRows(); }}
        />
      )}
      {writeOffChild && (
        <WriteOffModal
          child={writeOffChild}
          onClose={() => setWriteOffChild(null)}
          onDone={() => { setWriteOffChild(null); fetchRows(); }}
        />
      )}
      {planChild && (
        <PlanModal
          child={planChild}
          onClose={() => setPlanChild(null)}
          onDone={() => { setPlanChild(null); fetchRows(); }}
        />
      )}

      {showReminders && (
        <RemindersModal data={reminders} onClose={() => setShowReminders(false)} />
      )}
    </>
  );
}

function Empty({ text }) {
  return <div style={{ padding: 16, color: "#64748b" }}>{text}</div>;
}

/* ----- Single-item modals (payment/credit/writeoff/plan) ----- */

function PayModal({ child, onClose, onDone }) {
  const today = new Date().toISOString().slice(0,10);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [mode, setMode] = React.useState("Cash");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return alert("Enter a valid amount.");
    if (!date) return alert("Pick a date.");
    if (!mode) return alert("Select a mode of payment.");

    setSaving(true);
    const res = await fetch(`${API}/account/${child.childId}/payment`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        amount: value,
        modeOfPayment: mode,
        description: `Payment (${mode})`,
        date
      })
    });
    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Payment failed.");
      return;
    }
    onDone();
  }

  return (
    <div style={modalBackdrop} onKeyDown={(e)=>{ if (e.key === "Enter") submit(); }}>
      <div style={{ ...S.card, width: 460 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Record Payment — {child.name} ({child.childId})
        </div>
        <label style={{ display:"block", marginBottom:8 }}>
          <div style={{ fontSize:12, color:"#475569" }}>Amount</div>
          <input
            value={amount}
            onChange={(e)=>setAmount(e.target.value)}
            style={S.input}
            placeholder="e.g. 120.50"
            inputMode="decimal"
          />
        </label>
        <div style={S.row2}>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Date</div>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={S.input} />
          </label>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Mode of payment</div>
            <select value={mode} onChange={(e)=>setMode(e.target.value)} style={S.input}>
              <option>Cash</option>
              <option>Cheque</option>
              <option>Bank transfer</option>
              <option>Card</option>
              <option>Direct debit</option>
            </select>
          </label>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreditModal({ child, onClose, onDone }) {
  const today = new Date().toISOString().slice(0,10);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [desc, setDesc] = React.useState("Credit note");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return alert("Enter a valid amount.");
    setSaving(true);
    const res = await fetch(`${API}/account/${child.childId}/credit`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ amount:value, date, description:desc })
    }).catch(()=>({ ok:false }));
    setSaving(false);
    if (!res.ok) return alert("Failed to create credit note.");
    onDone();
  }

  return (
    <div style={modalBackdrop}>
      <div style={{ ...S.card, width: 460 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Credit Note — {child.name} ({child.childId})
        </div>
        <div style={S.row2}>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Amount</div>
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} style={S.input} inputMode="decimal"/>
          </label>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Date</div>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={S.input}/>
          </label>
        </div>
        <label>
          <div style={{ fontSize:12, color:"#475569" }}>Description</div>
          <input value={desc} onChange={(e)=>setDesc(e.target.value)} style={S.input} />
        </label>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WriteOffModal({ child, onClose, onDone }) {
  const today = new Date().toISOString().slice(0,10);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [reason, setReason] = React.useState("Goodwill write-off");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return alert("Enter a valid amount.");
    setSaving(true);
    const res = await fetch(`${API}/account/${child.childId}/writeoff`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ amount:value, date, reason })
    }).catch(()=>({ ok:false }));
    setSaving(false);
    if (!res.ok) return alert("Failed to write-off.");
    onDone();
  }

  return (
    <div style={modalBackdrop}>
      <div style={{ ...S.card, width: 460 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Write-off — {child.name} ({child.childId})
        </div>
        <div style={S.row2}>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Amount</div>
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} style={S.input} inputMode="decimal"/>
          </label>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Date</div>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={S.input}/>
          </label>
        </div>
        <label>
          <div style={{ fontSize:12, color:"#475569" }}>Reason</div>
          <input value={reason} onChange={(e)=>setReason(e.target.value)} style={S.input} />
        </label>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.danger }}>
            {saving ? "Saving…" : "Write-off"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanModal({ child, onClose, onDone }) {
  const [amount, setAmount] = React.useState("");
  const [nextDue, setNextDue] = React.useState(new Date().toISOString().slice(0,10));
  const [note, setNote] = React.useState("Payment plan agreed");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return alert("Enter a valid monthly plan amount.");
    setSaving(true);
    const res = await fetch(`${API}/account/${child.childId}/plan`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ planAmount:value, nextDue, note })
    }).catch(()=>({ ok:false }));
    setSaving(false);
    if (!res.ok) return alert("Failed to save plan.");
    onDone();
  }

  return (
    <div style={modalBackdrop}>
      <div style={{ ...S.card, width: 460 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Payment Plan — {child.name} ({child.childId})
        </div>
        <div style={S.row2}>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Plan amount (monthly)</div>
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} style={S.input} inputMode="decimal"/>
          </label>
          <label>
            <div style={{ fontSize:12, color:"#475569" }}>Next due date</div>
            <input type="date" value={nextDue} onChange={(e)=>setNextDue(e.target.value)} style={S.input}/>
          </label>
        </div>
        <label>
          <div style={{ fontSize:12, color:"#475569" }}>Notes</div>
          <input value={note} onChange={(e)=>setNote(e.target.value)} style={S.input} />
        </label>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
          <button onClick={onClose} style={S.btn}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.primary }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RemindersModal({ data, onClose }) {
  return (
    <div style={modalBackdrop}>
      <div style={{ ...S.card, width: 520 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Fee Reminders (demo)</div>
        {!data ? <div>Loading…</div> : data.count === 0 ? <Empty text="No reminders needed." /> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Child</th>
                <th style={S.th}>Email</th>
                <th style={{ ...S.th, textAlign: "right" }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.recipients.map(r => (
                <tr key={r.childId}>
                  <td style={S.td}>{r.name} <span style={{ color:"#64748b" }}>({r.childId})</span></td>
                  <td style={S.td}>{r.email}</td>
                  <td style={{ ...S.td, textAlign:"right" }}>£{r.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
          <button onClick={onClose} style={S.btn}>Close</button>
          <button disabled style={{ ...S.btn, ...S.primary }} title="Email sending is stubbed">Send Emails</button>
        </div>
      </div>
    </div>
  );
}

const modalBackdrop = {
  position:"fixed", inset:0, background:"rgba(0,0,0,.3)",
  display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
};

function AgingWidget() {
  const [summary, setSummary] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/reports/summary`);
      setSummary(await res.json());
    })();
  }, []);
  if (!summary) return null;
  const a = summary.aging || { "0-30":0, "31-60":0, "61-90":0, "90+":0 };
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Aging (demo)</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <Stat title="0–30" value={`£${a["0-30"].toFixed(2)}`} />
        <Stat title="31–60" value={`£${a["31-60"].toFixed(2)}`} />
        <Stat title="61–90" value={`£${a["61-90"].toFixed(2)}`} />
        <Stat title="90+" value={`£${a["90+"].toFixed(2)}`} />
      </div>
    </div>
  );
}

/* ---------------- Account ---------------- */

function Account() {
  const [childId, setChildId] = React.useState("");
  const [childMeta, setChildMeta] = React.useState(null);
  const [statement, setStatement] = React.useState(null);
  const [lookup, setLookup] = React.useState([]);

  // Account fields
  const [fees, setFees] = React.useState({ regFee: "", deposit: "", funding: "", monthlyFee: "", siblingDiscountPct:"", directDebit:false, financeNotes:"" });
  const [metaLoading, setMetaLoading] = React.useState(false);
  const [saveBusy, setSaveBusy] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2000);
  };

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/outstanding`);
      const base = await res.json();
      setLookup(base.map(b => ({ childId: b.childId, name: b.name })));
      if (!childId && base.length) setChildId(base[0].childId);
    })();
  }, []); // eslint-disable-line

  React.useEffect(() => {
    if (!childId) return;
    (async () => {
      // statement
      const res = await fetch(`${API}/account/${childId}`);
      setStatement(await res.json());

      // load account fields from children API
      setMetaLoading(true);
      try {
        const r2 = await fetch(`${CHILDREN_API}/${childId}`);
        if (r2.ok) {
          const c = await r2.json();
          setChildMeta(c);
          const f = c.fees || {};
          setFees({
            regFee: String(f.regFee ?? ""),
            deposit: String(f.deposit ?? ""),
            funding: String(f.funding ?? ""),
            monthlyFee: String(f.monthlyFee ?? ""),
            siblingDiscountPct: String(f.siblingDiscountPct ?? ""),
            directDebit: !!f.directDebit,
            financeNotes: String(f.financeNotes ?? "")
          });
        } else {
          setChildMeta(null);
          setFees({ regFee: "", deposit: "", funding: "", monthlyFee: "", siblingDiscountPct:"", directDebit:false, financeNotes:"" });
        }
      } finally {
        setMetaLoading(false);
      }
    })();
  }, [childId]);

  async function saveFees() {
    setSaveBusy(true);
    try {
      const r = await fetch(`${CHILDREN_API}/${childId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fees: {
          regFee: safeNum(fees.regFee),
          deposit: safeNum(fees.deposit),
          funding: fees.funding || "",
          monthlyFee: safeNum(fees.monthlyFee),
          siblingDiscountPct: safeNum(fees.siblingDiscountPct),
          directDebit: !!fees.directDebit,
          financeNotes: fees.financeNotes || ""
        }})
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      showToast("Saved ✓", true);
    } catch (e) {
      showToast("Save failed", false);
    } finally {
      setSaveBusy(false);
    }
  }

  // Quick transaction creators
  async function quickTxn(type) {
    if (!childId) return;
    const today = new Date().toISOString().slice(0,10);
    let amount = prompt(`${type === "invoice" ? "Invoice" : type === "credit" ? "Credit" : "Write-off"} amount:`);
    if (amount == null) return;
    amount = Number(amount);
    if (!amount || amount <= 0) return alert("Invalid amount.");
    const description = prompt("Description:", type === "invoice" ? "Invoice" : type === "credit" ? "Credit note" : "Write-off") || "";
    const endpoint = type === "invoice" ? "invoice" : type;
    const res = await fetch(`${API}/account/${childId}/${endpoint}`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ amount, date: today, description })
    }).catch(()=>({ ok:false }));
    if (!res.ok) return alert("Failed.");
    // refresh statement
    const s = await fetch(`${API}/account/${childId}`); setStatement(await s.json());
  }

  const downloadWord = () => {
    if (!statement) return;
    const { child, transactions } = statement;
    const esc = (x)=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const rows = transactions.map(t=>`<tr><td>${esc(t.date)}</td><td>${esc(t.description)}</td><td style="text-align:right">${t.debit?("£"+t.debit.toFixed(2)):""}</td><td style="text-align:right">${t.credit?("£"+t.credit.toFixed(2)):""}</td><td style="text-align:right">£${t.balance.toFixed(2)}</td></tr>`).join("");
    const html = `
    <html><head><meta charset="utf-8"><style>
      body{font-family:Segoe UI,Arial,sans-serif;font-size:12pt}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
      th{background:#f3f4f6}
    </style></head><body>
    <h1>Account Statement — ${esc(child.name)} (${esc(child.id)})</h1>
    <table><thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
    downloadBlob(html, `Statement-${child.id}.doc`, "application/msword");
  };

  const downloadPDF = () => {
    if (!statement) return;
    const { child, transactions } = statement;
    const doc = new jsPDF();
    const header = () => {
      doc.setFontSize(14);
      doc.text(`Statement — ${child.name} (${child.id})`, 14, 14);
      doc.setFontSize(10);
      let y = 22;
      doc.text("Date", 14, y);
      doc.text("Description", 40, y);
      doc.text("Debit", 120, y, { align:"right" });
      doc.text("Credit", 160, y, { align:"right" });
      doc.text("Balance", 196, y, { align:"right" });
      return y + 4;
    };
    let y = header();
    transactions.forEach(t=>{
      if (y > 280){ doc.addPage(); y = header(); }
      doc.text(t.date, 14, y);
      doc.text(String(t.description||""), 40, y);
      doc.text(t.debit ? `£${t.debit.toFixed(2)}` : "", 120, y, { align:"right" });
      doc.text(t.credit ? `£${t.credit.toFixed(2)}` : "", 160, y, { align:"right" });
      doc.text(`£${t.balance.toFixed(2)}`, 196, y, { align:"right" });
      y += 6;
    });
    doc.save(`Statement-${child.id}.pdf`);
  };

  const exportCSV = () => {
    if (!statement) return;
    const header = ["Date","Description","Debit","Credit","Balance"];
    const lines = [header, ...statement.transactions.map(t => [
      t.date, t.description, t.debit ?? "", t.credit ?? "", t.balance
    ])];
    const csv = lines.map(r => r.map(x => `"${String(x ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadBlob(csv, `Statement-${statement.child.id}.csv`, "text/csv");
  };

  return (
    <div>
      {/* selection + exports */}
      <div style={S.toolbar}>
        <select value={childId} onChange={(e)=>setChildId(e.target.value)} style={{ ...S.input, maxWidth: 340 }}>
          {lookup.length === 0
            ? <option value="">No children found</option>
            : lookup.map(x => <option key={x.childId} value={x.childId}>{x.childId} — {x.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={exportCSV} style={S.btn}>Export CSV</button>
        <button onClick={downloadPDF} style={S.btn}>Download PDF</button>
        <button onClick={downloadWord} style={{ ...S.btn, ...S.primary }}>Download Word</button>
      </div>

      {/* Quick transaction buttons */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ fontWeight:800 }}>Transactions (quick)</div>
          <div style={{ flex:1 }} />
          <button style={S.btn} onClick={()=>quickTxn("invoice")}>+ Invoice</button>
          <button style={S.btn} onClick={()=>quickTxn("credit")}>+ Credit</button>
          <button style={{ ...S.btn, ...S.danger }} onClick={()=>quickTxn("writeoff")}>+ Write-off</button>
        </div>
      </div>

      {/* ACCOUNT FIELDS */}
      <div style={{ ...S.card, margin: "12px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <div style={{ fontWeight: 800 }}>Account fields</div>
          {toast && <span style={S.pill(toast.ok)}>{toast.msg}</span>}
          <div style={{ flex:1 }} />
          <button onClick={saveFees} disabled={saveBusy} style={{ ...S.btn, ...S.primary }}>
            {saveBusy ? "Saving…" : "Save"}
          </button>
        </div>

        {metaLoading ? <div>Loading account fields…</div> : (
          <div style={{ display:"grid", gap:12 }}>
            <div style={S.row2}>
              <Field label="Registration fee" value={fees.regFee} onChange={(v)=>setFees(f=>({ ...f, regFee:v }))} />
              <Field label="Deposit paid-amount" value={fees.deposit} onChange={(v)=>setFees(f=>({ ...f, deposit:v }))} />
            </div>
            <div style={S.row2}>
              <Field label="Funding (text)" value={fees.funding} onChange={(v)=>setFees(f=>({ ...f, funding:v }))} />
              <Field label="Monthly fee" value={fees.monthlyFee} onChange={(v)=>setFees(f=>({ ...f, monthlyFee:v }))} />
            </div>
            <div style={S.row2}>
              <Field label="Sibling discount (%)" value={fees.siblingDiscountPct} onChange={(v)=>setFees(f=>({ ...f, siblingDiscountPct:v }))} />
              <label>
                <div style={{ fontSize:12, color:"#475569", marginBottom:4 }}>Direct debit</div>
                <select value={fees.directDebit ? "Yes" : "No"} onChange={(e)=>setFees(f=>({ ...f, directDebit: e.target.value==="Yes" }))} style={S.input}>
                  <option>No</option><option>Yes</option>
                </select>
              </label>
            </div>
            <label>
              <div style={{ fontSize:12, color:"#475569", marginBottom:4 }}>Finance notes</div>
              <input value={fees.financeNotes} onChange={(e)=>setFees(f=>({ ...f, financeNotes:e.target.value }))} style={S.input}/>
            </label>
          </div>
        )}
      </div>

      {/* Funding & Discounts helper */}
      <FundingPlanner child={childMeta} onApply={(patch)=>setFees(f=>({ ...f, ...patch }))} />

      {/* STATEMENT */}
      {!statement ? <Empty text="Select a child…" /> : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Description</th>
              <th style={{ ...S.th, textAlign: "right" }}>Debit</th>
              <th style={{ ...S.th, textAlign: "right" }}>Credit</th>
              <th style={{ ...S.th, textAlign: "right" }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {statement.transactions.map((t, i) => (
              <tr key={i}>
                <td style={S.td}>{t.date}</td>
                <td style={S.td}>{t.description}</td>
                <td style={{ ...S.td, textAlign: "right" }}>{t.debit ? `£${t.debit.toFixed(2)}` : ""}</td>
                <td style={{ ...S.td, textAlign: "right" }}>{t.credit ? `£${t.credit.toFixed(2)}` : ""}</td>
                <td style={{ ...S.td, textAlign: "right" }}>£{t.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type="text" }) {
  return (
    <label>
      <div style={{ fontSize:12, color:"#475569", marginBottom:4 }}>{label}</div>
      <input type={type} value={value ?? ""} onChange={(e)=>onChange(e.target.value)} style={S.input} />
    </label>
  );
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : v; // keep string if not numeric
}

/* ---- Funding & Discounts helper ---- */

function FundingPlanner({ child, onApply }) {
  const [weeklyHours, setWeeklyHours] = React.useState(30);
  const [fundedHours, setFundedHours] = React.useState(15);
  const [weeks, setWeeks] = React.useState(38);
  const [rate, setRate] = React.useState(8); // £/hour baseline
  const [siblingPct, setSiblingPct] = React.useState(0);

  React.useEffect(() => {
    // attempt to prefill from child/bookings if available
    if (!child) return;
    const defsRate = 8;
    setRate(defsRate);
    // sibling suggestion from child's fees if present
    const pct = Number(child?.fees?.siblingDiscountPct || 0);
    setSiblingPct(Number.isFinite(pct) ? pct : 0);
  }, [child]);

  const monthlyFunded = Math.round((fundedHours * weeks * rate) / 12);
  const monthlyBase = Math.round((weeklyHours * 52 * rate) / 12);
  const discount = Math.round((monthlyBase - monthlyFunded) * (siblingPct / 100));
  const estMonthly = Math.max(0, monthlyBase - monthlyFunded - discount);

  return (
    <div style={{ ...S.card, margin: "12px 0" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <div style={{ fontWeight:800 }}>Funding & Discounts (helper)</div>
        <div style={{ fontSize:12, color:"#64748b" }}>Estimate funded deduction + sibling discount, then apply to account fields.</div>
        <div style={{ flex:1 }} />
        <button
          style={{ ...S.btn, ...S.primary }}
          onClick={() => onApply({ monthlyFee: String(estMonthly), siblingDiscountPct: String(siblingPct), funding: `${fundedHours}hr/${weeks}w @ £${rate}/hr` })}
        >
          Apply to Account
        </button>
      </div>

      <div style={S.row3}>
        <NumField label="Weekly hours" value={weeklyHours} setValue={setWeeklyHours} />
        <NumField label="Funded hours/week" value={fundedHours} setValue={setFundedHours} />
        <NumField label="Funded weeks/year" value={weeks} setValue={setWeeks} />
      </div>
      <div style={S.row3}>
        <NumField label="Rate (£/hr)" value={rate} setValue={setRate} step="0.01" />
        <NumField label="Sibling discount (%)" value={siblingPct} setValue={setSiblingPct} step="1" />
        <div className="__sp" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginTop:8 }}>
        <Stat title="Monthly baseline" value={`£${monthlyBase.toFixed(0)}`} />
        <Stat title="Monthly funded" value={`£${monthlyFunded.toFixed(0)}`} />
        <Stat title="Sibling discount" value={`£${discount.toFixed(0)}`} />
        <Stat title="Est. monthly payable" value={`£${estMonthly.toFixed(0)}`} />
      </div>
    </div>
  );
}

function NumField({ label, value, setValue, step="1" }) {
  return (
    <label>
      <div style={{ fontSize:12, color:"#475569", marginBottom:4 }}>{label}</div>
      <input type="number" step={step} value={value}
        onChange={(e)=>setValue(Math.max(0, Number(e.target.value)||0))}
        style={S.input}/>
    </label>
  );
}

/* ---------------- Payroll (improved UX) ---------------- */

function Payroll() {
  const [rows, setRows] = React.useState([]);
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0,7));

  // new controls
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("");
  const [sort, setSort] = React.useState({ key: "name", dir: "asc" }); // asc|desc

  React.useEffect(() => {
    (async () => {
      const url = month ? `${API}/payroll?month=${month}` : `${API}/payroll`;
      const res = await fetch(url);
      setRows(await res.json());
    })();
  }, [month]);

  const fmt = (n) => `£${(Number(n) || 0).toFixed(2)}`;

  const filtered = rows
    .filter(r => (role ? r.role === role : true))
    .filter(r => {
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        r.name.toLowerCase().includes(s) ||
        r.staffId.toLowerCase().includes(s) ||
        (r.role || "").toLowerCase().includes(s)
      );
    });

  const sorted = [...filtered].sort((a, b) => {
    const k = sort.key;
    const dir = sort.dir === "asc" ? 1 : -1;
    const av = a[k], bv = b[k];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });

  const totalGross = sorted.reduce((s, r) => s + (r.gross || 0), 0);
  const avgHours = sorted.length ? (sorted.reduce((s, r) => s + (r.hours || 0), 0) / sorted.length) : 0;
  const avgRate = sorted.length ? (sorted.reduce((s, r) => s + (r.rate || 0), 0) / sorted.length) : 0;

  const roles = Array.from(new Set(rows.map(r => r.role).filter(Boolean))).sort();

  const exportCSV = () => {
    const header = ["Staff ID","Name","Role","Month","Hours","Rate","Gross"];
    const csv = [header, ...sorted.map(r=>[
      r.staffId,r.name,r.role,r.month,r.hours,r.rate,r.gross
    ])].map(a => a.map(x => `"${String(x ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    downloadBlob(csv, `payroll-${month||"current"}.csv`, "text/csv");
  };

  const th = (key, label, alignRight=false) => {
    const active = sort.key === key;
    const arrow = !active ? "" : (sort.dir === "asc" ? " ▲" : " ▼");
    return (
      <th
        style={{ ...S.th, ...(alignRight ? { textAlign:"right" } : {}) , cursor:"pointer", userSelect:"none" }}
        onClick={() => setSort(s => s.key !== key ? { key, dir:"asc" } : { key, dir: s.dir === "asc" ? "desc" : "asc" })}
      >
        {label}{arrow}
      </th>
    );
  };

  return (
    <>
      {/* Toolbar */}
      <div style={S.toolbar}>
        <input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} style={{ ...S.input, maxWidth:200 }} />
        <input placeholder="Search name, ID, role…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...S.input, minWidth: 220 }} />
        <select value={role} onChange={(e)=>setRole(e.target.value)} style={{ ...S.input, maxWidth: 220 }}>
          <option value="">All roles</option>
          {roles.map(r => <option key={r}>{r}</option>)}
        </select>
        <div style={{ flex:1 }} />
        <button onClick={exportCSV} style={S.btn}>Export CSV</button>
      </div>

      {/* Top summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:12 }}>
        <Stat title="Total Gross" value={fmt(totalGross)} />
        <Stat title="Avg Hours" value={avgHours.toFixed(0)} />
        <Stat title="Avg Rate" value={fmt(avgRate)} />
      </div>

      {/* Table */}
      {sorted.length === 0 ? <Empty text="No payroll rows match your filters."/> : (
        <table style={S.table}>
          <thead>
            <tr>
              {th("name","Staff")}
              {th("role","Role")}
              {th("month","Month")}
              {th("hours","Hours", true)}
              {th("rate","Rate", true)}
              {th("gross","Gross", true)}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={`${r.staffId}-${r.month}`}>
                <td style={S.td}>{r.name} <span style={{ color:"#64748b" }}>({r.staffId})</span></td>
                <td style={S.td}>{r.role}</td>
                <td style={S.td}>{r.month}</td>
                <td style={{ ...S.td, textAlign:"right" }}>{r.hours}</td>
                <td style={{ ...S.td, textAlign:"right" }}>{fmt(r.rate)}</td>
                <td style={{ ...S.td, textAlign:"right" }}>{fmt(r.gross)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...S.td, fontWeight:800 }}>Total</td>
              <td style={S.td}></td><td style={S.td}></td>
              <td style={{ ...S.td, textAlign:"right" }}>{sorted.reduce((s,r)=>s+(r.hours||0),0)}</td>
              <td style={{ ...S.td, textAlign:"right" }}></td>
              <td style={{ ...S.td, textAlign:"right", fontWeight:800 }}>{fmt(totalGross)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}


/* ---------------- Reports ---------------- */

function FinanceReports() {
  const [summary, setSummary] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/reports/summary`);
      setSummary(await res.json());
    })();
  }, []);

  if (!summary) return <div>Loading…</div>;
  const a = summary.aging || { "0-30":0, "31-60":0, "61-90":0, "90+":0 };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={S.row3}>
        <Stat title="Outstanding" value={`£${summary.outstanding.toFixed(2)}`} />
        <Stat title="Children (Enrolled)" value={summary.enrolled} />
        <Stat title="Last Invoice Cycle" value={summary.lastInvoice || "—"} />
      </div>
      <div style={S.row3}>
        <Stat title="Estimated Payroll" value={`£${summary.payrollEstimate.toFixed(2)}`} />
        <Stat title="Month" value={summary.month} />
        <Stat title="Aging Total" value={`£${(a["0-30"]+a["31-60"]+a["61-90"]+a["90+"]).toFixed(2)}`} />
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Aging</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <Stat title="0–30" value={`£${a["0-30"].toFixed(2)}`} />
          <Stat title="31–60" value={`£${a["31-60"].toFixed(2)}`} />
          <Stat title="61–90" value={`£${a["61-90"].toFixed(2)}`} />
          <Stat title="90+" value={`£${a["90+"].toFixed(2)}`} />
        </div>
      </div>
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

/* ---------------- Utilities ---------------- */

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
