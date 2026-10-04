// src/pages/Staff.jsx
import React from "react";
import { isEmail, isIsoDate, isPhone, isDBS } from "../utils/validators";
import { useAuth } from "../AuthContext";

const API = "http://localhost:5000/api/staff";

/* ---------- UI helpers ---------- */
const S = {
  container: { maxWidth: 1100, margin: "0 auto", padding: 16 },
  h1: { fontSize: 24, fontWeight: 800, margin: "16px 0" },
  grid: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 },
  listCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, height: "calc(100vh - 180px)", overflow: "auto" },
  detailCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
  danger: { background: "#dc2626", color: "#fff", borderColor: "#dc2626" },
  pill: { padding: "4px 8px", borderRadius: 999, background: "#fef08a", border: "1px solid #fde047", color: "#713f12", fontWeight: 700, fontSize: 12 },
  chip: (active) => ({
    padding: "6px 10px", borderRadius: 999, fontWeight: 700,
    border: "1px solid #e5e7eb", background: active ? "#2563eb" : "#f1f5f9",
    color: active ? "#fff" : "#334155", cursor: "pointer"
  }),
  field: { display: "block", marginBottom: 10 },
  label: { fontSize: 12, color: "#475569", marginBottom: 4 },
  input: { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14, background: "#f8fafc", fontWeight: 800 },
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 },
};

const ROLE_OPTIONS = [
  "Manager","Deputy Mgr","Practitioner","DSL","SENCO","Student Volunteer",
  "Nursery teacher assistant","Cook","Cleaner","Bank staff",
];

/* ---------- helpers ---------- */
const toMonthKey = (iso) => (iso || "").slice(0, 7);
const minutesBetweenHHMM = (a,b)=>{const m=t=>{const r=/^(\d{2}):(\d{2})$/.exec(String(t||""));if(!r)return null;const h=+r[1],mm=+r[2];if(h>23||mm>59)return null;return h*60+mm};const A=m(a),B=m(b);return (A==null||B==null)?0:Math.max(0,B-A)};
const hours2 = (mins) => Number((mins/60).toFixed(2));
const daysUntil = (iso) => { if(!iso) return null; const d=new Date(iso+"T00:00:00"); if(isNaN(d))return null; const t=new Date(); t.setHours(12,0,0,0); d.setHours(12,0,0,0); return Math.round((d-t)/86400000); };

function Field({ label, value, onChange, type = "text", placeholder = "", disabled }) {
  return (
    <label style={S.field}>
      <div style={S.label}>{label}</div>
      <input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} style={S.input} disabled={disabled}/>
    </label>
  );
}

function ExpiryChip({ label, date }) {
  const n = daysUntil(date);
  if (n == null) return null;
  const base = { padding: "4px 8px", borderRadius: 999, fontWeight: 800, fontSize: 12, border: "1px solid" };
  const style = n < 0
    ? { ...base, background: "#fee2e2", borderColor: "#ef4444", color: "#7f1d1d" }
    : n <= 30
    ? { ...base, background: "#ffedd5", borderColor: "#f59e0b", color: "#78350f" }
    : { ...base, background: "#ecfccb", borderColor: "#84cc16", color: "#365314" };
  return <span style={style}>{n < 0 ? `${label}: overdue` : `${label}: ${n}d left`}</span>;
}

/* ---------- Page ---------- */
export default function Staff() {
  const [list, setList] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(null);
  const [tab, setTab] = React.useState("About Me");
  const [staff, setStaff] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [dirty, setDirty] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  // --- Role-Based Access Support ---
  const { user } = useAuth();
  const role = user?.role;
  const staffId = user?.staffId || null;



  const toastIt = (type,msg)=>{setToast({type,msg});setTimeout(()=>setToast(null),2200)};

    React.useEffect(() => {
    (async () => {
      try {
        const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
        const res = await fetch(url);
        const data = await res.json();

        let filtered = data;

        // Practitioners: only see their own record
        if (role === "practitioner" && staffId) {
          filtered = data.filter((s) => s.id === staffId);
        }

        setList(filtered);

        if (!selectedId && filtered.length) {
          setSelectedId(filtered[0].id);
        }

        if (role === "practitioner" && staffId && filtered.length === 0) {
          setError("No staff record found for your Staff ID.");
        }
      } catch (e) {
        setError(e.message || "Failed to load staff list");
      }
    })();
  }, [q, role, staffId]); // eslint-disable-line


  React.useEffect(()=>{ if(!selectedId) return; (async()=>{
    try{
      const res = await fetch(`${API}/${selectedId}`); if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const full = await res.json();
      setStaff({
        ...full,
        reports: full.reports || {},
        holidays: full.holidays || {},
        ofsted: full.ofsted || {},
        payroll: full.payroll || { baselineHours:160, attendancePercent:95, rosterNote:"", shiftAllocation:"", shifts:[] },
        addlNeeds: full.addlNeeds || {},
        qualifications: full.qualifications || [],      // [{id,name,level,issued,expires,fileName,fileUrl,status}]
        appraisals: full.appraisals || [],              // [{id,date,type,note,fileName,fileUrl}]
        contacts: full.contacts || { nok1:{}, nok2:{} },// next of kin
        assets: full.assets || [],                      // [{id,item,serial,issued,returned,note}]
        availability: full.availability || { preferred:"", daysOff:[] }, // daysOff: ["Mon",...]
        sickness: full.sickness || [],                  // [{id,start,end,days,note,fitNoteName,fitNoteUrl}]
      });
      setDirty(false);
    }catch(e){ setError(e.message||"Failed to load staff profile"); }
  })() },[selectedId]);

  function validateStaff(s){
    if(!String(s.fullName||"").trim()) return "Full name is required.";
    if(!String(s.role||"").trim()) return "Role is required.";
    if(s.phone && !isPhone(s.phone)) return "Phone number looks invalid.";
    if(s.email && !isEmail(s.email)) return "Email address looks invalid.";
    const dates = [
      ["Start Date", s.startDate],
      ["Induction Start Date", s.inductionStartDate],
      ["Induction End Date", s.inductionEndDate],
      ["DBS Issue Date", s.ofsted?.dbsDate],
      ["DBS Expiry Date", s.ofsted?.dbsExpiry],
      ["PFA Expiry", s.ofsted?.pfaExpiry],
      ["Safeguarding Date", s.ofsted?.safeguardingDate],
      ["Food Hygiene Date", s.ofsted?.foodHygieneDate],
      ["Visa Expiry", s.ofsted?.visaExpiry],
      ["RTW Expiry", s.ofsted?.rtwExpiry],
    ];
    for(const [lab,val] of dates) if(val && !isIsoDate(val)) return `${lab} must be YYYY-MM-DD.`;
    if(s.dbsNumber && !isDBS(s.dbsNumber)) return "DBS number format looks off.";
    return null;
  }

  async function save(){
    if(!staff) return;
    const err = validateStaff(staff); if(err){ toastIt("error",err); return; }
    setBusy(true);
    try{
      const res = await fetch(`${API}/${staff.id}`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(staff) });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setStaff(updated);
      setList(prev=>prev.map(s=>s.id===updated.id?({id:updated.id,name:updated.fullName,role:updated.role,team:updated.team}):s));
      setDirty(false); toastIt("success","Saved ✓");
    }catch(e){ setError(e.message||"Failed to save"); toastIt("error","Save failed"); }
    finally{ setBusy(false); }
  }

  async function addStaff(){
    setBusy(true);
    try{
      const res = await fetch(API,{ method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ fullName:"New Member", role:"Practitioner", team:"" })});
      const created = await res.json(); const res2 = await fetch(API); setList(await res2.json());
      setSelectedId(created.id); setTab("About Me"); setDirty(false); toastIt("success","Staff added");
    }catch(e){ setError(e.message||"Failed to add"); toastIt("error","Add failed"); }
    finally{ setBusy(false); }
  }

  async function removeStaff(id){
    if(!window.confirm("Delete this staff member?")) return;
    setBusy(true);
    try{
      await fetch(`${API}/${id}`,{ method:"DELETE" });
      const res2 = await fetch(API); const data = await res2.json();
      setList(data); if(data.length) setSelectedId(data[0].id); else { setSelectedId(null); setStaff(null); }
      setDirty(false); toastIt("success","Deleted");
    }catch(e){ setError(e.message||"Failed to delete"); toastIt("error","Delete failed"); }
    finally{ setBusy(false); }
  }

  return (
    <div style={S.container}>
      {toast && <div style={{ position:"fixed", right:16, top:76, zIndex:1100, background: toast.type==="success"?"#16a34a":"#dc2626", color:"#fff", padding:"10px 14px", borderRadius:12, fontWeight:800 }}>{toast.msg}</div>}
      <h1 style={S.h1}>Staff</h1>
      {error && <div style={{ color:"#b91c1c", marginBottom:8 }}>Error: {error}</div>}

      <div style={S.grid}>
        {/* LEFT */}
        <div style={S.listCard}>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input placeholder="Search staff, room, role…" value={q} onChange={(e)=>setQ(e.target.value)} style={{ ...S.input, flex:1 }}/>
            <button onClick={addStaff} disabled={busy} style={{ ...S.btn, ...S.primary }}>+ Staff</button>
          </div>
          {list.map(s=>{
            const active = s.id === selectedId;
            return (
              <button key={s.id} onClick={()=>setSelectedId(s.id)}
                style={{ width:"100%", textAlign:"left", padding:10, marginBottom:8, borderRadius:12, border:`2px solid ${active?"#2563eb":"#e5e7eb"}`, background: active?"#eef2ff":"#fff", cursor:"pointer" }}>
                <div style={{ fontWeight:800 }}>{s.name}</div>
                <div style={{ fontSize:12, color:"#475569" }}>{s.role||"—"} {s.team?`· ${s.team}`:""}</div>
              </button>
            );
          })}
        </div>

        {/* RIGHT */}
        <div>
          <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
                  {(
        role === "roomLeader"
          ? [
              "About Me",
              "Recruitment",
              "Holidays",
              "Compliance",
              "Additional Needs",
              "Qualifications",
              "Contacts",
              "Assets",
              "Availability",
              "Sickness",
            ]
          : [
              // Manager + Practitioner: full set including Payroll & Appraisals
              "About Me",
              "Recruitment",
              "Payroll",
              "Holidays",
              "Compliance",
              "Additional Needs",
              "Qualifications",
              "Appraisals",
              "Contacts",
              "Assets",
              "Availability",
              "Sickness",
            ]
      ).map((t) => (
        <button
          key={t}
          style={S.chip(tab === t)}
          onClick={() => setTab(t)}
        >
          {t}
        </button>
      ))}

            <div style={{ flex:1 }} />
            {staff?.ofsted && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <ExpiryChip label="DBS" date={staff.ofsted.dbsExpiry}/>
                <ExpiryChip label="PFA" date={staff.ofsted.pfaExpiry}/>
                <ExpiryChip label="Safeguarding" date={staff.ofsted.safeguardingDate}/>
                <ExpiryChip label="Food Hygiene" date={staff.ofsted.foodHygieneDate}/>
                <ExpiryChip label="Visa" date={staff.ofsted.visaExpiry}/>
                <ExpiryChip label="RTW" date={staff.ofsted.rtwExpiry}/>
              </div>
            )}
            {dirty && <span style={S.pill}>Unsaved changes</span>}
            {staff && (<>
              <button onClick={()=>removeStaff(staff.id)} disabled={busy} style={{ ...S.btn, ...S.danger }}>Delete</button>
              <button onClick={save} disabled={busy||!dirty} style={{ ...S.btn, ...S.primary }}>{busy?"Saving…":"Save"}</button>
            </>)}
          </div>

          <div style={S.detailCard}>
            {!staff ? <div>Select a staff member from the list.</div> :
              tab==="About Me" ? <AboutMe staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Recruitment" ? <RecruitmentTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Payroll" ? <PayrollTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Holidays" ? <Holidays staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Compliance" ? <Compliance staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Additional Needs" ? <AdditionalNeedsTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Qualifications" ? <QualificationsTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Appraisals" ? <AppraisalsTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Contacts" ? <ContactsTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Assets" ? <AssetsTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              tab==="Availability" ? <AvailabilityTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/> :
              <SicknessTab staff={staff} setStaff={(s)=>{setStaff(s);setDirty(true);}}/>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

/* About Me */
function AboutMe({ staff, setStaff }){
  const onUploadRTW = (file)=>{
    if(!file) return;
    const r=new FileReader(); r.onload=()=>setStaff({ ...staff, rtwDocDataUrl:r.result, rtwDocName:file.name }); r.readAsDataURL(file);
  };
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={S.row}>
        <Field label="Staff ID" value={staff.id} onChange={(v)=>setStaff({ ...staff, id:v })}/>
        <label style={S.field}><div style={S.label}>Role</div>
          <select value={staff.role||""} onChange={(e)=>setStaff({ ...staff, role:e.target.value })} style={S.input}>
            <option value="">—</option>{ROLE_OPTIONS.map(r=><option key={r}>{r}</option>)}
          </select>
        </label>
      </div>
      <div style={S.row}>
        <Field label="Full Name" value={staff.fullName||""} onChange={(v)=>setStaff({ ...staff, fullName:v })}/>
        <Field label="Room" value={staff.team||""} onChange={(v)=>setStaff({ ...staff, team:v })}/>
      </div>
      <Field label="Home Address" value={staff.homeAddress||""} onChange={(v)=>setStaff({ ...staff, homeAddress:v })}/>
      <div style={S.row}>
        <Field label="Phone" value={staff.phone||""} onChange={(v)=>setStaff({ ...staff, phone:v })}/>
        <Field label="Email" value={staff.email||""} onChange={(v)=>setStaff({ ...staff, email:v })}/>
      </div>
      <div style={S.row}>
        <Field label="Start Date" type="date" value={staff.startDate||""} onChange={(v)=>setStaff({ ...staff, startDate:v })}/>
        <label style={S.field}><div style={S.label}>Right to Work Document</div>
          <input type="file" onChange={(e)=>onUploadRTW(e.target.files?.[0])}/>
          {staff.rtwDocName && <div style={{ fontSize:12, color:"#475569" }}>Uploaded: {staff.rtwDocName}</div>}
        </label>
      </div>
      <div style={S.row}>
        <Field label="Induction Start Date" type="date" value={staff.inductionStartDate||""} onChange={(v)=>setStaff({ ...staff, inductionStartDate:v })}/>
        <Field label="Induction End Date" type="date" value={staff.inductionEndDate||""} onChange={(v)=>setStaff({ ...staff, inductionEndDate:v })}/>
      </div>
      <div style={S.row}>
        <Field label="NI Number" value={staff.niNumber||""} onChange={(v)=>setStaff({ ...staff, niNumber:v })}/>
        <label style={S.field}><div style={S.label}>Contract Type</div>
          <select value={staff.contractType||""} onChange={(e)=>setStaff({ ...staff, contractType:e.target.value })} style={S.input}>
            <option value="">—</option><option>Full-time</option><option>Part-time</option><option>Bank</option><option>Zero-hours</option><option>Agency</option>
          </select>
        </label>
      </div>
      <Field label="Hourly Rate (£)" value={String(staff.hourlyRate??"")} onChange={(v)=>setStaff({ ...staff, hourlyRate:Number(v)||0 })}/>
    </div>
  );
}

/* Recruitment */
function RecruitmentTab({ staff, setStaff }){
  const o = staff.ofsted || {};
  const setO = (p)=>setStaff({ ...staff, ofsted:{ ...o, ...p } });

  const onUploadDBS = (file)=>{ if(!file) return; const r=new FileReader(); r.onload=()=>setO({ dbsFileName:file.name, dbsFileDataUrl:r.result }); r.readAsDataURL(file); };

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={S.row}>
        <Field label="DBS Number" value={staff.dbsNumber||""} onChange={(v)=>setStaff({ ...staff, dbsNumber:v })}/>
        <Field label="DBS Issue Date" type="date" value={o.dbsDate||""} onChange={(v)=>setO({ dbsDate:v })}/>
      </div>
      <div style={S.row}>
        <Field label="DBS Expiry Date" type="date" value={o.dbsExpiry||""} onChange={(v)=>setO({ dbsExpiry:v })}/>
        <Field label="Update Service Check" value={o.dbsUpdateService||""} onChange={(v)=>setO({ dbsUpdateService:v })} placeholder="Yes/No"/>
      </div>
      <label style={S.field}>
        <div style={S.label}>DBS Certificate (PDF/Image)</div>
        <input type="file" accept="application/pdf,image/*" onChange={(e)=>onUploadDBS(e.target.files?.[0])}/>
        {o.dbsFileName && <div style={{ marginTop:6 }}><a href={o.dbsFileDataUrl} target="_blank" rel="noreferrer">{o.dbsFileName}</a></div>}
      </label>

      <div style={S.row}>
        <Field label="Visa Expiry" type="date" value={o.visaExpiry||""} onChange={(v)=>setO({ visaExpiry:v })}/>
        <Field label="Right to Work Expiry" type="date" value={o.rtwExpiry||""} onChange={(v)=>setO({ rtwExpiry:v })}/>
      </div>
    </div>
  );
}

/* Payroll */
function PayrollTab({ staff, setStaff }){
  const p = staff.payroll || {}; const setP = (patch)=>setStaff({ ...staff, payroll:{ ...p, ...patch }});
  const [month,setMonth]=React.useState(toMonthKey(new Date().toISOString()));
  const [locFilter,setLocFilter]=React.useState("All");
  const [baselineHours,setBaselineHours]=React.useState(p.baselineHours??160);
  const [attendance,setAttendance]=React.useState(typeof p.attendancePercent==="number"?p.attendancePercent:95);
  const [rate,setRate]=React.useState(typeof staff.hourlyRate==="number"?staff.hourlyRate:12);
  const shifts = Array.isArray(p.shifts)?p.shifts:[];
  const monthShifts = shifts.filter(s=>toMonthKey(s.date)===month && (locFilter==="All"||(s.location||"")===locFilter));
  const servedMins = monthShifts.reduce((sum,s)=>sum+minutesBetweenHHMM(s.start,s.end),0);
  const servedHours = hours2(servedMins);
  const estHours = Math.round((attendance/100)*baselineHours);
  const grossByServed = Number((servedHours*rate).toFixed(2));
  const grossByEst = Number((estHours*rate).toFixed(2));
  React.useEffect(()=>{ setP({ attendancePercent:attendance, baselineHours }); },[attendance,baselineHours]); // eslint-disable-line
  const clamp=(v)=>Math.max(0,Math.min(100,Number(v)||0));
  const addShift=()=>{ const r={id:"S"+Math.random().toString(36).slice(2,8).toUpperCase(), date:`${month}-01`, start:"08:00", end:"17:00", location:staff.team||"", note:""}; setP({ shifts:[...shifts,r]}); };
  const setShift=(id,k,v)=>setP({ shifts:shifts.map(s=>s.id===id?{...s,[k]:v}:s) });
  const removeShift=(id)=>{ if(window.confirm("Delete this shift?")) setP({ shifts:shifts.filter(s=>s.id!==id) }); };
  const locationOptions=["All",...Array.from(new Set(shifts.map(s=>s.location||"").filter(Boolean)))];

  return (
    <div style={{ display:"grid", gap:14 }}>
      <div style={S.row}>
        <label style={S.field}><div style={S.label}>Payroll Month</div><input type="month" value={month} onChange={(e)=>setMonth(e.target.value)} style={S.input}/></label>
        <label style={S.field}><div style={S.label}>Location Filter</div>
          <select value={locFilter} onChange={(e)=>setLocFilter(e.target.value)} style={S.input}>{locationOptions.map(o=><option key={o}>{o}</option>)}</select>
        </label>
      </div>
      <label style={S.field}><div style={S.label}>Roster Note</div><input value={p.rosterNote||""} onChange={(e)=>setP({ rosterNote:e.target.value })} style={S.input}/></label>
      <label style={S.field}><div style={S.label}>Shift Allocation</div><input value={p.shiftAllocation||""} onChange={(e)=>setP({ shiftAllocation:e.target.value })} placeholder="e.g. Mon–Fri 08:00–17:00" style={S.input}/></label>

      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ fontWeight:800 }}>Shifts</div><div style={{flex:1}}/>
        <button style={{ ...S.btn, ...S.primary }} onClick={addShift}>+ Create Shift</button>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Date</th><th style={S.th}>Start</th><th style={S.th}>End</th><th style={S.th}>Location</th><th style={S.th}>Note</th><th style={{...S.th,textAlign:"right"}}>Hours</th><th style={S.th}>Actions</th></tr></thead>
          <tbody>
            {monthShifts.length===0?(<tr><td style={S.td} colSpan={7}>(No shifts for this month/filter)</td></tr>):
              monthShifts.map(s=>{const mins=minutesBetweenHHMM(s.start,s.end);return(
                <tr key={s.id}>
                  <td style={S.td}><input type="date" value={s.date||""} onChange={(e)=>setShift(s.id,"date",e.target.value)} style={S.input}/></td>
                  <td style={S.td}><input value={s.start||""} onChange={(e)=>setShift(s.id,"start",e.target.value)} style={S.input} placeholder="HH:MM"/></td>
                  <td style={S.td}><input value={s.end||""} onChange={(e)=>setShift(s.id,"end",e.target.value)} style={S.input} placeholder="HH:MM"/></td>
                  <td style={S.td}><input value={s.location||""} onChange={(e)=>setShift(s.id,"location",e.target.value)} style={S.input} placeholder="Nursery / Room / Site"/></td>
                  <td style={S.td}><input value={s.note||""} onChange={(e)=>setShift(s.id,"note",e.target.value)} style={S.input} placeholder="(optional)"/></td>
                  <td style={{...S.td,textAlign:"right"}}>{hours2(mins)}</td>
                  <td style={S.td}><button style={S.btn} onClick={()=>removeShift(s.id)}>Remove</button></td>
                </tr>
              )})
            }
          </tbody>
        </table>
      </div>

      <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, background:"#f8fafc" }}>
        <div style={{ fontWeight:800, marginBottom:8 }}>Estimated Pay (attendance × baseline)</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <Preview title="Baseline Hours / Month" value={baselineHours}/>
          <Preview title="Attendance %" value={attendance}/>
          <Preview title="Rate" value={`£${Number(rate).toFixed(2)}`}/>
          <Preview title="Gross (Est.)" value={`£${grossByEst.toFixed(2)}`}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
          <label style={S.field}><div style={S.label}>Baseline Hours / Month</div>
            <input type="number" min="0" step="1" value={baselineHours} onChange={(e)=>setBaselineHours(Math.max(0,Math.floor(Number(e.target.value)||0)))} style={S.input}/></label>
          <label style={S.field}><div style={S.label}>Attendance (%)</div>
            <input type="number" min="0" max="100" value={attendance} onChange={(e)=>setAttendance(clamp(e.target.value))} style={S.input}/></label>
        </div>
      </div>

      <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, background:"#f8fafc" }}>
        <div style={{ fontWeight:800, marginBottom:8 }}>Served Hours (from shifts)</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <Preview title="Month" value={month}/><Preview title="Location" value={locFilter}/>
          <Preview title="Served Hours" value={servedHours}/>
          <Preview title="Gross (Served)" value={`£${grossByServed.toFixed(2)}`}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
          <label style={S.field}><div style={S.label}>Hourly Rate (£)</div>
            <input type="number" min="0" step="0.01" value={rate} onChange={(e)=>{const v=Math.max(0,Number(e.target.value)||0); setStaff({ ...staff, hourlyRate:v, payroll:{...p} }); setP({});}} style={S.input}/></label>
          <div style={{ alignSelf:"end", fontSize:12, color:"#64748b" }}>Served hours = End − Start (same day).</div>
        </div>
      </div>
    </div>
  );
}
function Preview({title,value}){return(<div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, padding:10 }}><div style={{ fontSize:12, color:"#64748b" }}>{title}</div><div style={{ fontSize:18, fontWeight:900 }}>{value}</div></div>)}

/* Holidays — unchanged from your last version (shortened slightly) */
function Holidays({ staff, setStaff }) {
  const h=staff.holidays||{}; const setH=p=>setStaff({ ...staff, holidays:{...h,...p}});
  const allowance=typeof h.allowanceDays==="number"?h.allowanceDays:28;
  const taken=typeof h.takenDays==="number"?h.takenDays:(h.remainingDays!=null?Math.max(0,allowance-Number(h.remainingDays)):0);
  const requests=Array.isArray(h.requests)?h.requests:[];
  const [rqStart, setRqStart] = React.useState("");
  const [rqEnd, setRqEnd] = React.useState("");
  const [rqNote, setRqNote] = React.useState("");

 
  const days=(A,B)=>{if(!A||!B)return 0; const a=new Date(A),b=new Date(B); if(isNaN(a)||isNaN(b))return 0; return Math.max(0,Math.ceil(((b-a)/86400000)+1));};
  const rqDays=days(rqStart,rqEnd); const pend=requests.filter(r=>r.status==="Pending").reduce((s,r)=>s+(r.days||0),0); const remain=Math.max(0,allowance-taken-pend);
  const addReq=()=>{ if(!rqStart||!rqEnd||rqDays<=0) return alert("Select valid start/end"); const id="R"+Math.random().toString(36).slice(2,7).toUpperCase(); setH({ allowanceDays:allowance, takenDays:taken, requests:[...(requests||[]), {id,start:rqStart,end:rqEnd,days:rqDays,note:rqNote,status:"Pending"}]}); setRqStart("");setRqEnd("");setRqNote("");};
  const setStatus=(id,status)=>{ const next=requests.map(r=>r.id===id?{...r,status}:r); const newly=next.filter(r=>r.status==="Approved"&&!requests.find(o=>o.id===r.id&&o.status==="Approved")); const addDays=newly.reduce((s,r)=>s+(r.days||0),0); setH({ allowanceDays:allowance, takenDays:taken+addDays, requests:next});};
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, background:"#f8fafc" }}>
        <div style={{ fontWeight:800, marginBottom:8 }}>Holiday Summary</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          <Preview title="Annual Allowance" value={`${allowance}d`}/><Preview title="Taken" value={`${taken}d`}/><Preview title="Pending" value={`${pend}d`}/><Preview title="Remaining" value={`${remain}d`}/>
        </div>
      </div>
      <label style={S.field}><div style={S.label}>Team Holiday Note</div><input value={h.teamHolidayNote||""} onChange={(e)=>setH({ teamHolidayNote:e.target.value })} style={S.input}/></label>
      <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12 }}>
        <div style={{ fontWeight:800, marginBottom:8 }}>New Holiday Request</div>
        <div style={S.row}>
          <label style={S.field}><div style={S.label}>Start</div><input type="date" value={rqStart} onChange={(e)=>setRqStart(e.target.value)} style={S.input}/></label>
          <label style={S.field}><div style={S.label}>End</div><input type="date" value={rqEnd} onChange={(e)=>setRqEnd(e.target.value)} style={S.input}/></label>
        </div>
        <div style={S.row}>
          <label style={S.field}><div style={S.label}>Days (auto)</div><input value={rqDays||""} readOnly style={{...S.input,background:"#f1f5f9"}}/></label>
          <label style={S.field}><div style={S.label}>Note</div><input value={rqNote} onChange={(e)=>setRqNote(e.target.value)} style={S.input}/></label>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end" }}><button style={{ ...S.btn, ...S.primary }} onClick={addReq}>Add Request</button></div>
      </div>

      <table style={S.table}>
        <thead><tr><th style={S.th}>ID</th><th style={S.th}>Start</th><th style={S.th}>End</th><th style={{...S.th,textAlign:"right"}}>Days</th><th style={S.th}>Status</th><th style={S.th}>Note</th><th style={S.th}>Actions</th></tr></thead>
        <tbody>
          {(requests||[]).length===0?(<tr><td style={S.td} colSpan={7}>(No requests)</td></tr>):
            requests.map(r=>(
              <tr key={r.id}>
                <td style={S.td}>{r.id}</td><td style={S.td}>{r.start}</td><td style={S.td}>{r.end}</td>
                <td style={{...S.td,textAlign:"right"}}>{r.days}</td><td style={S.td}>{r.status}</td><td style={S.td}>{r.note||""}</td>
                <td style={S.td}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <button style={S.btn} onClick={()=>setStatus(r.id,"Pending")}>Pending</button>
                    <button style={{...S.btn,...S.primary}} onClick={()=>setStatus(r.id,"Approved")}>Approve</button>
                    <button style={S.btn} onClick={()=>setStatus(r.id,"Rejected")}>Reject</button>
                  </div>
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

/* Compliance */
function Compliance({ staff, setStaff }){
  const o=staff.ofsted||{}; const setO=p=>setStaff({ ...staff, ofsted:{...o,...p}});
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={S.row}>
        <Field label="PFA (First Aid) Expiry" type="date" value={o.pfaExpiry||""} onChange={(v)=>setO({pfaExpiry:v})}/>
        <Field label="Safeguarding Training Date" type="date" value={o.safeguardingDate||""} onChange={(v)=>setO({safeguardingDate:v})}/>
      </div>
      <div style={S.row}>
        <Field label="Food Hygiene Date" type="date" value={o.foodHygieneDate||""} onChange={(v)=>setO({foodHygieneDate:v})}/>
        <Field label="2-Year Checks Trained" value={o.twoYearChecks||""} onChange={(v)=>setO({twoYearChecks:v})}/>
      </div>
      <div style={S.row}>
        <Field label="LADO Awareness" value={o.lado||""} onChange={(v)=>setO({lado:v})}/>
        <Field label="Child Protection Training" value={o.childProtection||""} onChange={(v)=>setO({childProtection:v})}/>
      </div>
      <div style={S.row}>
        <Field label="Compliance Notifications (notes)" value={o.notifications||""} onChange={(v)=>setO({notifications:v})}/>
        <Field label="SEN Qualified" value={o.sen||""} onChange={(v)=>setO({sen:v})}/>
      </div>
      <div style={S.row}>
        <Field label="Visa Expiry" type="date" value={o.visaExpiry||""} onChange={(v)=>setO({visaExpiry:v})}/>
        <Field label="Right to Work Expiry" type="date" value={o.rtwExpiry||""} onChange={(v)=>setO({rtwExpiry:v})}/>
      </div>
    </div>
  );
}

/* Additional Needs (staff) */
function AdditionalNeedsTab({ staff, setStaff }){
  const a=staff.addlNeeds||{}; const setA=p=>setStaff({ ...staff, addlNeeds:{...a,...p}});
  const onUploadRisk=(file)=>{ if(!file) return; const r=new FileReader(); r.onload=()=>setA({riskDocName:file.name, riskDocUrl:r.result}); r.readAsDataURL(file); };
  return (
    <div style={{ display:"grid", gap:12 }}>
      <Field label="Medical conditions" value={a.medical||""} onChange={(v)=>setA({medical:v})}/>
      <Field label="Allergies" value={a.allergies||""} onChange={(v)=>setA({allergies:v})}/>
      <Field label="Medication at work" value={a.medication||""} onChange={(v)=>setA({medication:v})}/>
      <Field label="Dietary requirements" value={a.dietary||""} onChange={(v)=>setA({dietary:v})}/>
      <Field label="Reasonable adjustments" value={a.adjustments||""} onChange={(v)=>setA({adjustments:v})}/>
      <label style={S.field}><div style={S.label}>Pregnancy/Risk Assessment</div>
        <select value={a.pregnancyYN||""} onChange={(e)=>setA({pregnancyYN:e.target.value})} style={S.input}><option value="">—</option><option>Yes</option><option>No</option></select>
      </label>
      <label style={S.field}><div style={S.label}>Risk Assessment Document</div><input type="file" accept="application/pdf,image/*" onChange={(e)=>onUploadRisk(e.target.files?.[0])}/>
        {a.riskDocName && <div style={{ marginTop:6 }}><a href={a.riskDocUrl} target="_blank" rel="noreferrer">{a.riskDocName}</a></div>}
      </label>
      <div style={S.row}>
        <Field label="Emergency contact (name)" value={a.emgName||""} onChange={(v)=>setA({emgName:v})}/>
        <Field label="Emergency contact (phone)" value={a.emgPhone||""} onChange={(v)=>setA({emgPhone:v})}/>
      </div>
      <Field label="Notes" value={a.notes||""} onChange={(v)=>setA({notes:v})}/>
    </div>
  );
}

/* Qualifications */
function QualificationsTab({ staff, setStaff }){
  const rows=Array.isArray(staff.qualifications)?staff.qualifications:[];
  const setRows=(r)=>setStaff({ ...staff, qualifications:r });
  const add=()=>setRows([...(rows||[]), { id:"Q"+Math.random().toString(36).slice(2,8).toUpperCase(), name:"", level:"", issued:"", expires:"", status:"Valid" }]);
  const set=(id,k,v)=>setRows(rows.map(r=>r.id===id?{...r,[k]:v}:r));
  const del=(id)=>setRows(rows.filter(r=>r.id!==id));
  const upload=(id,file)=>{ if(!file) return; const r=new FileReader(); r.onload=()=>set(id,"fileUrl",r.result)||set(id,"fileName",file.name); r.readAsDataURL(file); };

  const exportCSV=()=>{ const header=["id","name","level","issued","expires","status"]; const csv=[header,...rows.map(r=>header.map(h=>String(r[h]??"")))].map(a=>a.map(x=>`"${x.replace(/"/g,'""')}"`).join(",")).join("\n"); const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`qualifications-${staff.id}.csv`; a.click(); URL.revokeObjectURL(url); };

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ fontWeight:800 }}>Qualifications & Training</div><div style={{flex:1}}/>
        <button style={S.btn} onClick={exportCSV}>Export CSV</button>
        <button style={{ ...S.btn, ...S.primary }} onClick={add}>+ Add</button>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Name</th><th style={S.th}>Level</th><th style={S.th}>Issued</th><th style={S.th}>Expires</th>
            <th style={S.th}>Status</th><th style={S.th}>Certificate</th><th style={S.th}>Actions</th>
          </tr></thead>
          <tbody>
            {(rows||[]).length===0?(<tr><td style={S.td} colSpan={7}>(No qualifications)</td></tr>):
              rows.map(r=>(
                <tr key={r.id}>
                  <td style={S.td}><input value={r.name||""} onChange={(e)=>set(r.id,"name",e.target.value)} style={S.input}/></td>
                  <td style={S.td}><input value={r.level||""} onChange={(e)=>set(r.id,"level",e.target.value)} style={S.input}/></td>
                  <td style={S.td}><input type="date" value={r.issued||""} onChange={(e)=>set(r.id,"issued",e.target.value)} style={S.input}/></td>
                  <td style={S.td}><input type="date" value={r.expires||""} onChange={(e)=>set(r.id,"expires",e.target.value)} style={S.input}/></td>
                  <td style={S.td}>
                    <select value={r.status||"Valid"} onChange={(e)=>set(r.id,"status",e.target.value)} style={S.input}>
                      <option>Valid</option><option>Expired</option><option>Booked</option><option>In Progress</option>
                    </select>
                  </td>
                  <td style={S.td}>
                    <input type="file" accept="application/pdf,image/*" onChange={(e)=>upload(r.id,e.target.files?.[0])}/>
                    {r.fileName && <div><a href={r.fileUrl} target="_blank" rel="noreferrer">{r.fileName}</a></div>}
                  </td>
                  <td style={S.td}><button style={S.btn} onClick={()=>del(r.id)}>Remove</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* Appraisals / Supervisions */
function AppraisalsTab({ staff, setStaff }){
  const rows=Array.isArray(staff.appraisals)?staff.appraisals:[]; const setRows=r=>setStaff({ ...staff, appraisals:r });
  const add=()=>setRows([...(rows||[]), { id:"A"+Math.random().toString(36).slice(2,8).toUpperCase(), date:"", type:"Supervision", note:"" }]);
  const set=(id,k,v)=>setRows(rows.map(r=>r.id===id?{...r,[k]:v}:r));
  const del=(id)=>setRows(rows.filter(r=>r.id!==id));
  const upload=(id,file)=>{ if(!file) return; const r=new FileReader(); r.onload=()=>set(id,"fileUrl",r.result)||set(id,"fileName",file.name); r.readAsDataURL(file); };

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ fontWeight:800 }}>Appraisals & Supervisions</div><div style={{flex:1}}/>
        <button style={{ ...S.btn, ...S.primary }} onClick={add}>+ Add</button>
      </div>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Date</th><th style={S.th}>Type</th><th style={S.th}>Note</th><th style={S.th}>Attachment</th><th style={S.th}>Actions</th></tr></thead>
        <tbody>
          {(rows||[]).length===0?(<tr><td style={S.td} colSpan={5}>(No entries)</td></tr>):
            rows.map(r=>(
              <tr key={r.id}>
                <td style={S.td}><input type="date" value={r.date||""} onChange={(e)=>set(r.id,"date",e.target.value)} style={S.input}/></td>
                <td style={S.td}>
                  <select value={r.type||"Supervision"} onChange={(e)=>set(r.id,"type",e.target.value)} style={S.input}>
                    <option>Supervision</option><option>Appraisal</option><option>Probation Review</option>
                  </select>
                </td>
                <td style={S.td}><input value={r.note||""} onChange={(e)=>set(r.id,"note",e.target.value)} style={S.input}/></td>
                <td style={S.td}>
                  <input type="file" onChange={(e)=>upload(r.id,e.target.files?.[0])}/>
                  {r.fileName && <div><a href={r.fileUrl} target="_blank" rel="noreferrer">{r.fileName}</a></div>}
                </td>
                <td style={S.td}><button style={S.btn} onClick={()=>del(r.id)}>Remove</button></td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

/* Contacts (Next of Kin) */
function ContactsTab({ staff, setStaff }){
  const c=staff.contacts||{nok1:{},nok2:{}}; const setC=p=>setStaff({ ...staff, contacts:{...c,...p}});
  return (
    <div style={{ display:"grid", gap:16 }}>
      {[1,2].map(i=>{
        const k="nok"+i; const row=c[k]||{};
        const put=(key,val)=>setC({ [k]:{ ...row, [key]:val } });
        return (
          <div key={i} style={{ border:"1px dashed #e5e7eb", borderRadius:12, padding:12 }}>
            <div style={{ fontWeight:800, marginBottom:6 }}>Next of Kin {i}</div>
            <div style={S.row}>
              <Field label="Name" value={row.name||""} onChange={(v)=>put("name",v)}/>
              <Field label="Relationship" value={row.relationship||""} onChange={(v)=>put("relationship",v)}/>
            </div>
            <div style={S.row}>
              <Field label="Phone" value={row.phone||""} onChange={(v)=>put("phone",v)}/>
              <Field label="Email" value={row.email||""} onChange={(v)=>put("email",v)}/>
            </div>
            <Field label="Address" value={row.address||""} onChange={(v)=>put("address",v)}/>
          </div>
        );
      })}
    </div>
  );
}

/* Assets / Uniform */
function AssetsTab({ staff, setStaff }){
  const rows=Array.isArray(staff.assets)?staff.assets:[]; const setRows=r=>setStaff({ ...staff, assets:r });
  const add=()=>setRows([...(rows||[]), { id:"T"+Math.random().toString(36).slice(2,8).toUpperCase(), item:"", serial:"", issued:"", returned:"", note:"" }]);
  const set=(id,k,v)=>setRows(rows.map(r=>r.id===id?{...r,[k]:v}:r));
  const del=(id)=>setRows(rows.filter(r=>r.id!==id));
  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ fontWeight:800 }}>Equipment & Uniform</div><div style={{flex:1}}/>
        <button style={{ ...S.btn, ...S.primary }} onClick={add}>+ Issue Item</button>
      </div>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Item</th><th style={S.th}>Serial/Size</th><th style={S.th}>Issued</th><th style={S.th}>Returned</th><th style={S.th}>Note</th><th style={S.th}>Actions</th></tr></thead>
        <tbody>
          {(rows||[]).length===0?(<tr><td style={S.td} colSpan={6}>(No items)</td></tr>):
            rows.map(r=>(
              <tr key={r.id}>
                <td style={S.td}><input value={r.item||""} onChange={(e)=>set(r.id,"item",e.target.value)} style={S.input}/></td>
                <td style={S.td}><input value={r.serial||""} onChange={(e)=>set(r.id,"serial",e.target.value)} style={S.input}/></td>
                <td style={S.td}><input type="date" value={r.issued||""} onChange={(e)=>set(r.id,"issued",e.target.value)} style={S.input}/></td>
                <td style={S.td}><input type="date" value={r.returned||""} onChange={(e)=>set(r.id,"returned",e.target.value)} style={S.input}/></td>
                <td style={S.td}><input value={r.note||""} onChange={(e)=>set(r.id,"note",e.target.value)} style={S.input}/></td>
                <td style={S.td}><button style={S.btn} onClick={()=>del(r.id)}>Remove</button></td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

/* Availability */
function AvailabilityTab({ staff, setStaff }){
  const a=staff.availability||{preferred:"",daysOff:[]}; const setA=p=>setStaff({ ...staff, availability:{...a,...p}});
  const toggleDay=d=>setA({ daysOff: a.daysOff?.includes(d)?a.daysOff.filter(x=>x!==d):[...(a.daysOff||[]),d] });
  const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return (
    <div style={{ display:"grid", gap:12 }}>
      <Field label="Preferred Shift Pattern" value={a.preferred||""} onChange={(v)=>setA({preferred:v})}/>
      <div>
        <div style={S.label}>Days Unavailable</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {DAYS.map(d=>{
            const active=a.daysOff?.includes(d);
            return <button key={d} onClick={()=>toggleDay(d)} style={{ ...S.btn, ...(active?S.primary:{}) }}>{d}</button>;
          })}
        </div>
      </div>
    </div>
  );
}

/* Sickness log */
function SicknessTab({ staff, setStaff }){
  const rows=Array.isArray(staff.sickness)?staff.sickness:[]; const setRows=r=>setStaff({ ...staff, sickness:r });
  const add=()=>setRows([...(rows||[]), { id:"Sick"+Math.random().toString(36).slice(2,7).toUpperCase(), start:"", end:"", days:0, note:"" }]);
  const set=(id,k,v)=>setRows(rows.map(r=>r.id===id?{...r,[k]:v}:r));
  const del=(id)=>setRows(rows.filter(r=>r.id!==id));
  const upload=(id,file)=>{ if(!file) return; const r=new FileReader(); r.onload=()=>set(id,"fitNoteUrl",r.result)||set(id,"fitNoteName",file.name); r.readAsDataURL(file); };
  const spanDays=(a,b)=>{ if(!a||!b) return 0; const A=new Date(a),B=new Date(b); if(isNaN(A)||isNaN(B)) return 0; return Math.max(0,Math.ceil(((B-A)/86400000)+1)); };
  const total=(rows||[]).reduce((s,r)=>s+(r.days||spanDays(r.start,r.end)||0),0);

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ fontWeight:800 }}>Sickness Episodes</div><div style={{flex:1}}/>
        <div style={{ fontWeight:800 }}>Total days: {total}</div>
        <button style={{ ...S.btn, ...S.primary }} onClick={add}>+ Add</button>
      </div>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Start</th><th style={S.th}>End</th><th style={{...S.th,textAlign:"right"}}>Days</th><th style={S.th}>Note</th><th style={S.th}>Fit note</th><th style={S.th}>Actions</th></tr></thead>
        <tbody>
          {(rows||[]).length===0?(<tr><td style={S.td} colSpan={6}>(No entries)</td></tr>):
            rows.map(r=>{
              const computed=spanDays(r.start,r.end);
              return (
                <tr key={r.id}>
                  <td style={S.td}><input type="date" value={r.start||""} onChange={(e)=>set(r.id,"start",e.target.value)} style={S.input}/></td>
                  <td style={S.td}><input type="date" value={r.end||""} onChange={(e)=>set(r.id,"end",e.target.value)} style={S.input}/></td>
                  <td style={{...S.td,textAlign:"right"}}><input type="number" min="0" value={r.days||computed||0} onChange={(e)=>set(r.id,"days",Math.max(0,Number(e.target.value)||0))} style={S.input}/></td>
                  <td style={S.td}><input value={r.note||""} onChange={(e)=>set(r.id,"note",e.target.value)} style={S.input}/></td>
                  <td style={S.td}>
                    <input type="file" onChange={(e)=>upload(r.id,e.target.files?.[0])}/>
                    {r.fitNoteName && <div><a href={r.fitNoteUrl} target="_blank" rel="noreferrer">{r.fitNoteName}</a></div>}
                  </td>
                  <td style={S.td}><button style={S.btn} onClick={()=>del(r.id)}>Remove</button></td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
}
