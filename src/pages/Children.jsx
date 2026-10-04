// src/pages/Children.jsx
import React from "react";
import { useSearchParams } from "react-router-dom";
import { isEmail, isIsoDate, todayISO } from "../utils/validators";

const API = "http://localhost:5000/api/children";

/* ================= UI bits ================= */
const S = {
  container: { maxWidth: 1100, margin: "0 auto", padding: "16px" },
  h1: { fontSize: 24, fontWeight: 800, margin: "16px 0" },
  grid: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 },
  listCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, height: "calc(100vh - 180px)", overflow: "auto" },
  detailCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 },
  btn: { padding: "8px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 },
  primary: { background: "#2563eb", color: "#fff", borderColor: "#2563eb" },
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
  td: { borderTop: "1px solid #e5e7eb", padding: 8, textAlign: "left", fontSize: 14 }
};
const currency = (n) => `£${(Number(n) || 0).toFixed(2)}`;

/* small helpers */
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ageYears = (dob) => {
  if (!dob) return "";
  const d = new Date(dob), now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return `${y} yrs`;
};

/* input helpers for phone */
const digitsOnly = (s = "") => (s || "").replace(/\D+/g, "");
const tenDigits = (s = "") => digitsOnly(s).slice(0, 10);
const isTenDigits = (s = "") => digitsOnly(s).length === 10;

/* dropdown constants (MoM wording) */
const STATUS_OPTIONS = [
  "Enquiry", "Offered", "Accepted", "Enrolled", "Waiting list", "Leaver"
];
const SEX_OPTIONS = ["", "Male", "Female", "Other"];
const SETTINGS_OPTIONS = ["", "Teddington", "Chiswick", "Default"]; // from your session-defs usage
const ROOM_SUGGESTIONS = ["Baby Room", "Toddler Room", "Preschool", "Bluebells", "Sunflowers"];

/* ================= Page ================= */
export default function Children() {
  const [list, setList] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [selectedId, setSelectedId] = React.useState(null);
  const [child, setChild] = React.useState(null);

  const [toast, setToast] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "About Me";
  const [tab, setTab] = React.useState(tabParam);
  React.useEffect(() => setSearchParams({ tab, id: selectedId || "" }), [tab, selectedId]); // URL-sync

  const [dirty, setDirty] = React.useState(false);
  const [edit, setEdit] = React.useState(false); // view vs edit mode

  // staff list for Key Person dropdown
  const [staffOpts, setStaffOpts] = React.useState([]);
  React.useEffect(() => {
    fetch("http://localhost:5000/api/staff")
      .then((r) => r.ok ? r.json() : [])
      .then((rows) => setStaffOpts(Array.isArray(rows) ? rows.map(s => ({ value: s.id, label: s.name })) : []))
      .catch(() => setStaffOpts([]));
  }, []);

  // debounced search
  React.useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setList(data);
        if (!selectedId && data.length) setSelectedId(data[0].id);
      } catch (e) {
        setError(e.message || "Failed to load list");
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  // load detail
  React.useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/${selectedId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const full = await res.json();

        // legacy map
        const parents = (full.parents?.length ? full.parents : [{}, {}]).map((p, i) => ({
          type: `Guardian ${i + 1}`,
          firstname: (p.name || "").trim().split(/\s+/)[0] || "",
          lastname: (p.name || "").trim().split(/\s+/).slice(1).join(" ") || "",
          relationship: p.relationship || p.relation || "",
          email: p.email || "",
          phone: tenDigits(p.phone || ""),
          addr1: p.addr1 || p.address || "",
          addr2: p.addr2 || "",
          city: p.city || "",
          postcode: p.postcode || "",
          employerName: p.employerName || "",
          jobTitle: p.jobTitle || "",
          workEmail: p.workEmail || "",
          workPhone: tenDigits(p.workPhone || ""),
          photoUrl: p.photoUrl || ""
        }));

        const bookings = full.bookings || {};
        const patterns = bookings.patterns?.length
          ? bookings.patterns
          : [{ startDate: bookings.effectiveDates?.[0]?.from || "", endDate: bookings.effectiveDates?.[0]?.to || "", schedule: { mon: "None", tue: "None", wed: "None", thu: "None", fri: "None" } }];
        const activeIndex = Number.isInteger(bookings.activeIndex) ? bookings.activeIndex : 0;

        // NEW: structured diet with graceful fallback from old fields
        const withDefaults = {
          firstName: full.firstName || "",
          middleName: full.middleName || "",
          lastName: full.lastName || "",
          roomId: full.roomId || "",
          keyPersonId: full.keyPersonId || "",
          registrationFormUrl: full.registrationFormUrl || "",
          childPhotoUrl: full.childPhotoUrl || "",
          pickupPassword: full.pickupPassword || "",
          collectors: Array.isArray(full.collectors) ? full.collectors : [],
          diet: {
            type: (full.diet?.type) ||
                  (["allergy", "intolerance", "standard"].includes(String(full.dietary).toLowerCase())
                    ? String(full.dietary).toLowerCase()
                    : "standard"),
            notes: full.diet?.notes || full.dietaryNotes || (full.dietary && !["allergy","intolerance","standard"].includes(String(full.dietary).toLowerCase()) ? full.dietary : "")
          },
          additionalNotes: full.additionalNotes || "",
          status: full.status || ""
        };

        setChild({
          ...full,
          ...withDefaults,
          parents,
          bookings: { ...bookings, patterns, activeIndex, extrasList: bookings.extrasList || [] }
        });
        setEdit(false);
        setDirty(false);
      } catch (e) {
        setError(e.message || "Failed to load child");
      }
    })();
  }, [selectedId]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2200);
  };

  async function save() {
    if (!child) return;

    // guardian validations
    for (const p of child.parents || []) {
      if ((p.addr1 || p.city) && !String(p.postcode || "").trim()) {
        showToast("error", "Postcode is required on guardian address");
        return;
      }
      if (p.email && !isEmail(p.email)) {
        showToast("error", "Guardian email looks invalid");
        return;
      }
      if (p.phone && !isTenDigits(p.phone)) {
        showToast("error", "Guardian phone must be exactly 10 digits");
        return;
      }
    }
    // collectors phone rule
    for (const r of child.collectors || []) {
      if (r.phone && !isTenDigits(r.phone)) {
        showToast("error", "Collector phone must be exactly 10 digits");
        return;
      }
    }
    // date validations
    if (child.dob) {
      if (!isIsoDate(child.dob) || child.dob > todayISO()) {
        showToast("error", "Enter a valid DOB (YYYY-MM-DD) not in the future");
        return;
      }
    }
    if (child.registrationDate && !isIsoDate(child.registrationDate)) {
      showToast("error", "Enter a valid Registration Date (YYYY-MM-DD)");
      return;
    }
    if (child.startDate && !isIsoDate(child.startDate)) {
      showToast("error", "Enter a valid Start Date (YYYY-MM-DD)");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...child,
        // NEW: keep both new and legacy dietary keys for compatibility
        diet: child.diet || undefined,
        dietary: child.diet?.type ?? child.dietary,
        dietaryNotes: child.diet?.notes ?? child.dietaryNotes,
        parents: (child.parents || []).map((p) => ({
          ...p,
          name: `${(p.firstname || "").trim()} ${(p.lastname || "").trim()}`.trim(),
          relation: p.relationship
        }))
      };

      const res = await fetch(`${API}/${child.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setChild(updated);
      setList((prev) =>
        prev.map((c) =>
          c.id === updated.id
            ? {
                id: updated.id,
                name: `${updated.firstName || ""} ${updated.middleName ? updated.middleName + " " : ""}${updated.lastName || ""}`.trim(),
                dob: updated.dob,
                setting: updated.setting,
                status: updated.status,
                balance: updated.balance ?? 0
              }
            : c
        )
      );
      setDirty(false);
      setEdit(false);
      showToast("success", "Saved ✓");
    } catch (e) {
      setError(e.message || "Failed to save");
      showToast("error", "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function addChild() {
    setBusy(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parents: [{}, {}],
          bookings: { patterns: [{ startDate: "", endDate: "", schedule: { mon: "None", tue: "None", wed: "None", thu: "None", fri: "None" } }], activeIndex: 0 },
          diet: { type: "standard", notes: "" }, // NEW
          dietary: "standard"                      // legacy compat
        })
      });
      const created = await res.json();
      const res2 = await fetch(API);
      setList(await res2.json());
      setSelectedId(created.id);
      setTab("About Me");
      showToast("success", "Child added");
      setDirty(false);
      setEdit(true);
    } catch (e) {
      setError(e.message || "Failed to add");
      showToast("error", "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeChild(id) {
    if (!window.confirm("Delete this child?")) return;
    setBusy(true);
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      const res2 = await fetch(API);
      const data = await res2.json();
      setList(data);
      if (data.length) setSelectedId(data[0].id);
      else {
        setSelectedId(null);
        setChild(null);
      }
      showToast("success", "Deleted");
      setDirty(false);
      setEdit(false);
    } catch (e) {
      setError(e.message || "Failed to delete");
      showToast("error", "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  /* uploads as data URLs (no special API needed for demo) */
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  return (
    <div style={S.container}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            right: 16,
            top: 76,
            zIndex: 1100,
            background: toast.type === "success" ? "#16a34a" : "#dc2626",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            fontWeight: 800
          }}
        >
          {toast.msg}
        </div>
      )}

      <h1 style={S.h1}>Children</h1>
      {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>Error: {error}</div>}

      <div style={S.grid}>
        {/* LEFT LIST */}
        <div style={S.listCard}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Search child, setting, ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ ...S.input, flex: 1 }}
            />
            <button onClick={addChild} disabled={busy} style={{ ...S.btn, ...S.primary }}>
              + Child
            </button>
          </div>

          {list.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 10,
                  marginBottom: 8,
                  borderRadius: 12,
                  border: `2px solid ${active ? "#2563eb" : "#e5e7eb"}`,
                  background: active ? "#eef2ff" : "#fff",
                  cursor: "pointer"
                }}
                title={`Balance ${currency(c.balance)}`}
              >
                <div style={{ fontWeight: 800 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{c.setting || "—"} · {c.status}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  Balance: <b>{currency(c.balance)}</b>
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT DETAIL */}
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
            {["About Me", "Guardians", "Collection", "Additional Needs", "Attendance", "Fees"].map((t) => (
              <button key={t} style={S.chip(tab === t)} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {dirty && <span style={S.pill}>Unsaved changes</span>}
            {child && (
              <>
                <button onClick={() => setEdit((e) => !e)} style={S.btn}>
                  {edit ? "Cancel" : "Edit"}
                </button>
                <button onClick={() => removeChild(child.id)} disabled={busy} style={S.btn}>
                  Delete
                </button>
                <button onClick={save} disabled={busy || !dirty} style={{ ...S.btn, ...S.primary }}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>

          <div style={S.detailCard}>
            {!child ? (
              <div>Select a child from the list.</div>
            ) : tab === "About Me" ? (
              <AboutMe
                edit={edit}
                child={child}
                setChild={(c) => {
                  setChild(c);
                  setDirty(true);
                }}
                staffOpts={staffOpts}
                fileToDataUrl={fileToDataUrl}
              />
            ) : tab === "Guardians" ? (
              <Guardians
                edit={edit}
                child={child}
                setChild={(c) => {
                  setChild(c);
                  setDirty(true);
                }}
                fileToDataUrl={fileToDataUrl}
              />
            ) : tab === "Collection" ? (
              <Collection
                edit={edit}
                child={child}
                setChild={(c) => {
                  setChild(c);
                  setDirty(true);
                }}
              />
            ) : tab === "Additional Needs" ? (
              <AdditionalNeeds
                child={child}
                setChild={(c) => {
                  setChild(c);
                  setDirty(true);
                }}
              />
            ) : tab === "Attendance" ? (
              <Bookings
                edit={edit}
                child={child}
                setChild={(c) => {
                  setChild(c);
                  setDirty(true);
                }}
              />
            ) : (
              <Fees
                edit={edit}
                child={child}
                setChild={(c) => {
                  setChild(c);
                  setDirty(true);
                }}
              />
            )}
          </div>

          {/* Export */}
          {child && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => exportChildProfile(child)}
                style={{ ...S.btn, ...S.primary }}
                title="Download Child Profile (no fees/pattern/amendments)"
              >
                Download Child Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============== Fields & Tabs =============== */
function Field({ label, value, onChange, type = "text", placeholder = "", disabled, listId }) {
  return (
    <label style={S.field}>
      <div style={S.label}>{label}</div>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={S.input}
        disabled={disabled}
        list={listId}
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [], disabled }) {
  return (
    <label style={S.field}>
      <div style={S.label}>{label}</div>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={S.input} disabled={disabled}>
        {options.map((o) => (
          <option key={(o.value ?? o) || "empty"} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

function DietaryBadge({ value }) {
  const t = (typeof value === "string" ? value : value?.type) || "standard";
  if (t === "allergy") return <span style={{ ...S.pill, background: "#fee", borderColor: "#f88", color: "#7f1d1d" }}>Allergy</span>;
  if (t === "intolerance") return <span style={{ ...S.pill, background: "#fffae6", borderColor: "#f5c04e", color: "#7a4b00" }}>Intolerance</span>;
  return <span style={{ ...S.pill, background: "#e5f5e0", borderColor: "#a0d3a8", color: "#14532d" }}>Standard</span>;
}

/* ---------- About Me ---------- */
function AboutMe({ edit, child, setChild, fileToDataUrl, staffOpts }) {
  const onPhoto = async (file) => {
    if (!file) return;
    const url = await fileToDataUrl(file);
    setChild({ ...child, childPhotoUrl: url });
  };
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* header card */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div>
          {child.childPhotoUrl ? (
            <img src={child.childPhotoUrl} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 12, background: "#e5e7eb" }} />
          )}
          <div style={{ marginTop: 8 }}>
            <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} disabled={!edit} />
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {child.firstName} {child.middleName ? child.middleName + " " : ""}{child.lastName} {child.dob && <span style={{ color: "#64748b" }}>· {ageYears(child.dob)}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <DietaryBadge value={child.diet} />
            {child.carePlanUrl && (
              <a href={child.carePlanUrl} style={{ textDecoration: "underline" }}>
                Care plan
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={S.row}>
        <Field label="Child ID (auto-generated)" value={child.id} onChange={() => {}} disabled />
        <Select label="Status" value={child.status} onChange={(v) => setChild({ ...child, status: v })} options={STATUS_OPTIONS} disabled={!edit} />
      </div>

      <div style={S.row}>
        <Field label="First name" value={child.firstName} onChange={(v) => setChild({ ...child, firstName: v })} disabled={!edit} />
        <Field label="Middle name (optional)" value={child.middleName} onChange={(v) => setChild({ ...child, middleName: v })} disabled={!edit} />
      </div>
      <div style={S.row}>
        <Field label="Last name" value={child.lastName} onChange={(v) => setChild({ ...child, lastName: v })} disabled={!edit} />
        <Select label="Sex" value={child.sex} onChange={(v) => setChild({ ...child, sex: v })} options={SEX_OPTIONS} disabled={!edit} />
      </div>

      <div style={S.row}>
        <Field label="Address" value={child.address} onChange={(v) => setChild({ ...child, address: v })} disabled={!edit} />
        <Select label="Setting" value={child.setting} onChange={(v) => setChild({ ...child, setting: v })} options={SETTINGS_OPTIONS} disabled={!edit} />
      </div>

      <div style={S.row}>
        <Field label="Registration Date" type="date" value={child.registrationDate} onChange={(v) => setChild({ ...child, registrationDate: v })} disabled={!edit} />
        <Field label="Start Date" type="date" value={child.startDate} onChange={(v) => setChild({ ...child, startDate: v })} disabled={!edit} />
      </div>

      {/* Room (combobox with suggestions) / Key Person (dropdown from staff) */}
      <div style={S.row}>
        <div>
          <Field label="Room" value={child.roomId} onChange={(v) => setChild({ ...child, roomId: v })} disabled={!edit} listId="rooms-list" />
          <datalist id="rooms-list">
            {ROOM_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <Select
          label="Key person"
          value={child.keyPersonId}
          onChange={(v) => setChild({ ...child, keyPersonId: v })}
          options={[{ value: "", label: "" }, ...staffOpts]}
          disabled={!edit}
        />
      </div>

      {/* Registration Form */}
      <div>
        <div style={S.label}>Registration form (PDF)</div>
        <input
          type="file"
          accept="application/pdf"
          onChange={async (e) => {
            if (!e.target.files?.[0]) return;
            const url = await fileToDataUrl(e.target.files[0]);
            setChild({ ...child, registrationFormUrl: url });
          }}
          disabled={!edit}
        />
        {child.registrationFormUrl && (
          <div style={{ marginTop: 6 }}>
            <a href={child.registrationFormUrl} target="_blank" rel="noreferrer">
              Download registration form
            </a>
          </div>
        )}
      </div>

      {/* Notes */}
      <Field label="Notes" value={child.notes || ""} onChange={(v) => setChild({ ...child, notes: v })} disabled={!edit} />
    </div>
  );
}

/* ---------- Guardians ---------- */
function Guardians({ edit, child, setChild, fileToDataUrl }) {
  const update = (i, k, v) => {
    const parents = (child.parents || []).map((p, idx) => (idx === i ? { ...p, [k]: v } : p));
    setChild({ ...child, parents });
  };
  const ensure = (idx) =>
    child.parents?.[idx] || {
      type: `Guardian ${idx + 1}`,
      firstname: "",
      lastname: "",
      relationship: "",
      email: "",
      phone: "",
      addr1: "",
      addr2: "",
      city: "",
      postcode: "",
      employerName: "",
      jobTitle: "",
      workEmail: "",
      workPhone: "",
      photoUrl: ""
    };

  const onPhoto = async (i, file) => {
    if (!file) return;
    const url = await fileToDataUrl(file);
    update(i, "photoUrl", url);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {[0, 1].map((i) => {
        const p = ensure(i);
        return (
          <div key={i} style={{ border: "1px dashed #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>{`Guardian ${i + 1}`}</div>
              {p.photoUrl ? <img src={p.photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} /> : <div style={{ width: 56, height: 56, borderRadius: 12, background: "#e5e7eb" }} />}
            </div>
            <div style={{ marginBottom: 8 }}>
              <input type="file" accept="image/*" onChange={(e) => onPhoto(i, e.target.files?.[0])} disabled={!edit} />
            </div>

            <div style={S.row}>
              <Field label="First name" value={p.firstname || ""} onChange={(v) => update(i, "firstname", v)} disabled={!edit} />
              <Field label="Relationship" value={p.relationship} onChange={(v) => update(i, "relationship", v)} disabled={!edit} />
            </div>
            <div style={S.row}>
              <Field label="Last name" value={p.lastname || ""} onChange={(v) => update(i, "lastname", v)} disabled={!edit} />
              <div />
            </div>
            <div style={S.row}>
              <Field label="Email" value={p.email} onChange={(v) => update(i, "email", v)} disabled={!edit} />
              <label style={S.field}>
                <div style={S.label}>Phone (10 digits)</div>
                <input
                  inputMode="numeric"
                  pattern="\d*"
                  value={p.phone || ""}
                  onChange={(e) => update(i, "phone", tenDigits(e.target.value))}
                  style={S.input}
                  disabled={!edit}
                />
              </label>
            </div>

            <div style={S.row}>
              <Field label="Address line 1" value={p.addr1} onChange={(v) => update(i, "addr1", v)} disabled={!edit} />
              <Field label="Address line 2" value={p.addr2} onChange={(v) => update(i, "addr2", v)} disabled={!edit} />
            </div>
            <div style={S.row}>
              <Field label="City" value={p.city} onChange={(v) => update(i, "city", v)} disabled={!edit} />
              <Field label="Postcode" value={p.postcode} onChange={(v) => update(i, "postcode", v)} disabled={!edit} />
            </div>

            <div style={S.row}>
              <Field label="Employer name" value={p.employerName} onChange={(v) => update(i, "employerName", v)} disabled={!edit} />
              <Field label="Job title" value={p.jobTitle} onChange={(v) => update(i, "jobTitle", v)} disabled={!edit} />
            </div>
            <div style={S.row}>
              <Field label="Work email" value={p.workEmail} onChange={(v) => update(i, "workEmail", v)} disabled={!edit} />
              <label style={S.field}>
                <div style={S.label}>Work phone (10 digits)</div>
                <input
                  inputMode="numeric"
                  pattern="\d*"
                  value={p.workPhone || ""}
                  onChange={(e) => update(i, "workPhone", tenDigits(e.target.value))}
                  style={S.input}
                  disabled={!edit}
                />
              </label>
            </div>

            <Select
              label="Parental responsibility"
              value={p.parentalResponsibility || ""}
              onChange={(v) => update(i, "parentalResponsibility", v)}
              options={["", "Yes", "No"]}
              disabled={!edit}
            />
            <Field
              label="Collection arrangement (notes)"
              value={p.collectionNotes || ""}
              onChange={(v) => update(i, "collectionNotes", v)}
              disabled={!edit}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Collection ---------- */
function Collection({ edit, child, setChild }) {
  const collectors = Array.isArray(child.collectors) ? child.collectors : [];
  const setCollectors = (rows) => setChild({ ...child, collectors: rows });

  const add = () => setCollectors([...(collectors || []), { id: Math.random().toString(36).slice(2, 8), name: "", relationship: "", phone: "" }]);
  const update = (i, k, v) => setCollectors(collectors.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const remove = (i) => setCollectors(collectors.filter((_, idx) => idx !== i));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Field
        label="Pickup password"
        value={child.pickupPassword || ""}
        onChange={(v) => setChild({ ...child, pickupPassword: v })}
        disabled={!edit}
      />

      <div style={{ border: "1px dashed #e5e7eb", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <b>Approved collectors</b>
          <button style={S.btn} onClick={add} disabled={!edit}>
            + Add collector
          </button>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Relationship</th>
              <th style={S.th}>Phone</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(collectors || []).length === 0 && (
              <tr>
                <td style={S.td} colSpan={4}>
                  (No collectors)
                </td>
              </tr>
            )}
            {(collectors || []).map((r, i) => (
              <tr key={r.id || i}>
                <td style={S.td}>
                  <input value={r.name || ""} onChange={(e) => update(i, "name", e.target.value)} style={S.input} disabled={!edit} />
                </td>
                <td style={S.td}>
                  <input value={r.relationship || ""} onChange={(e) => update(i, "relationship", e.target.value)} style={S.input} disabled={!edit} />
                </td>
                <td style={S.td}>
                  <input inputMode="numeric" pattern="\d*" value={r.phone || ""} onChange={(e) => update(i, "phone", tenDigits(e.target.value))} style={S.input} disabled={!edit} />
                </td>
                <td style={S.td}>
                  <button style={S.btn} onClick={() => remove(i)} disabled={!edit}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Additional Needs (inc. dietary) ---------- */
function AdditionalNeeds({ child, setChild }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Field label="Additional needs" value={child.medical || ""} onChange={(v) => setChild({ ...child, medical: v })} />

      {/* Structured dietary: type + notes */}
      <label style={S.field}>
        <div style={S.label}>Dietary</div>
        <select
          value={child.diet?.type || "standard"}
          onChange={(e) => setChild({ ...child, diet: { ...(child.diet || {}), type: e.target.value } })}
          style={S.input}
        >
          <option value="standard">Standard</option>
          <option value="allergy">Allergy</option>
          <option value="intolerance">Intolerance</option>
        </select>
      </label>
      <Field
        label="Dietary notes"
        value={child.diet?.notes || ""}
        onChange={(v) => setChild({ ...child, diet: { ...(child.diet || {}), notes: v } })}
      />

      <Field label="Care plan" value={child.carePlans || ""} onChange={(v) => setChild({ ...child, carePlans: v })} />

      {/* Professionals involved: Yes/No + conditional details */}
      <label style={S.field}>
        <div style={S.label}>Professionals involved</div>
        <select
          value={child.professionalsYN || ""}
          onChange={(e) => setChild({ ...child, professionalsYN: e.target.value })}
          style={S.input}
        >
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </label>
      {child.professionalsYN === "Yes" && (
        <Field
          label="Professionals details"
          value={child.professionalsDetails || ""}
          onChange={(v) => setChild({ ...child, professionalsDetails: v })}
        />
      )}
      <Field label="Child Protection" value={child.childProtection || ""} onChange={(v) => setChild({ ...child, childProtection: v })} />
      <label style={S.field}>
        <div style={S.label}>SEN</div>
        <select value={child.SEN || ""} onChange={(e) => setChild({ ...child, SEN: e.target.value })} style={S.input}>
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </label>

      <div>
        <button onClick={() => downloadAdditionalNeedsReport(child)} style={{ ...S.btn, ...S.primary }}>
          Print Additional Needs Report
        </button>
      </div>
    </div>
  );
}

/* ---------- Bookings / Attendance ---------- */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri"];
const DAY_LABEL = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri" };

function sessionsToSchedule(sessions = []) {
  const map = { mon: "None", tue: "None", wed: "None", thu: "None", fri: "None" };
  sessions.forEach((s) => {
    const k = (s.day || "").toLowerCase().slice(0, 3);
    if (DAY_KEYS.includes(k)) map[k] = s.session || "None";
  });
  return map;
}
function scheduleToSessions(schedule, defs) {
  return DAY_KEYS.map((k) => {
    const session = schedule[k] || "None";
    const info = defs[session] || { start: null, end: null, hours: 0 };
    return { day: DAY_LABEL[k], session, start: info.start, end: info.end, hours: info.hours ?? 0 };
  }).filter((s) => s.session !== "None");
}

function Bookings({ edit, child, setChild }) {
  const raw = child.bookings || {};
  const hasNewShape = Array.isArray(raw.sessions) || Array.isArray(raw.effectiveDates);

  const [patterns, setPatterns] = React.useState(() => {
    if (raw.patterns && raw.patterns.length) return raw.patterns;
    if (hasNewShape) {
      const schedule = sessionsToSchedule(raw.sessions);
      const range = (raw.effectiveDates && raw.effectiveDates[0]) || {};
      return [{ startDate: range.from || "", endDate: range.to || "", schedule }];
    }
    return [{ startDate: "", endDate: "", schedule: { mon: "None", tue: "None", wed: "None", thu: "None", fri: "None" } }];
  });
  const [activeIndex, setActiveIndex] = React.useState(Number.isInteger(raw.activeIndex) ? raw.activeIndex : 0);
  const [extrasList, setExtrasList] = React.useState(Array.isArray(raw.extrasList) ? raw.extrasList : []);

  const [defs, setDefs] = React.useState({
    None: { start: null, end: null, hours: 0 },
    AM: { start: "08:00", end: "13:00", hours: 5 },
    PM: { start: "13:00", end: "18:00", hours: 5 },
    "Full Day": { start: "08:00", end: "18:00", hours: 10 }
  });
  React.useEffect(() => {
    const setting = child.setting || "";
    fetch(`http://localhost:5000/api/session-defs?setting=${encodeURIComponent(setting)}`)
      .then((r) => r.json())
      .then(setDefs)
      .catch(() => {});
  }, [child.setting]);

  const active = patterns[activeIndex] || patterns[0];
  const schedule = active.schedule || { mon: "None", tue: "None", wed: "None", thu: "None", fri: "None" };
  const weeklyHours = DAY_KEYS.reduce((sum, d) => sum + ((defs[schedule[d]] || {}).hours || 0), 0);

  const commit = (next) => {
    const cur = next.patterns[next.activeIndex] || next.patterns[0];
    const sessions = scheduleToSessions(cur.schedule, defs);
    const effectiveDates = [{ from: cur.startDate || "", to: cur.endDate || "" }];
    setChild({
      ...child,
      bookings: {
        pattern: raw.pattern || "",
        amendments: raw.amendments || "",
        extras: raw.extras || "",
        registers: raw.registers || "",
        patterns: next.patterns,
        activeIndex: next.activeIndex,
        extrasList: next.extrasList,
        sessions,
        effectiveDates
      }
    });
  };

  const setPattern = (idx, patch) => {
    const next = patterns.map((p, i) => (i === idx ? { ...p, ...patch, schedule: { ...p.schedule, ...(patch.schedule || {}) } } : p));
    setPatterns(next);
    commit({ patterns: next, activeIndex, extrasList });
  };
  const addPattern = () => {
    const pad = { mon: "None", tue: "None", wed: "None", thu: "None", fri: "None" };
    const next = [...patterns, { startDate: "", endDate: "", schedule: pad }];
    setPatterns(next);
    setActiveIndex(next.length - 1);
    commit({ patterns: next, activeIndex: next.length - 1, extrasList });
  };
  const removePattern = (idx) => {
    if (patterns.length === 1) return;
    const next = patterns.filter((_, i) => i !== idx);
    const ai = Math.max(0, Math.min(activeIndex, next.length - 1));
    setPatterns(next);
    setActiveIndex(ai);
    commit({ patterns: next, activeIndex: ai, extrasList });
  };
  const setSchedule = (k, v) => !edit ? null : setPattern(activeIndex, { schedule: { ...schedule, [k]: v } });

  const setText = (k, v) => setChild({ ...child, bookings: { ...(raw || {}), [k]: v, patterns, activeIndex, extrasList } });

  const addExtra = () => {
    const next = [...extrasList, { date: "", session: "AM", note: "" }];
    setExtrasList(next);
    commit({ patterns, activeIndex, extrasList: next });
  };
  const setExtra = (i, key, val) => {
    const next = extrasList.map((x, idx) => (idx === i ? { ...x, [key]: val } : x));
    setExtrasList(next);
    commit({ patterns, activeIndex, extrasList: next });
  };
  const removeExtra = (i) => {
    const next = extrasList.filter((_, idx) => idx !== i);
    setExtrasList(next);
    commit({ patterns, activeIndex, extrasList: next });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <b>Patterns:</b>
        <select
          value={activeIndex}
          onChange={(e) => {
            const ai = Number(e.target.value);
            setActiveIndex(ai);
            commit({ patterns, activeIndex: ai, extrasList });
          }}
          style={S.input}
          disabled={!edit}
        >
          {patterns.map((_, i) => (
            <option key={i} value={i}>
              Pattern {i + 1}
            </option>
          ))}
        </select>
        <button style={S.btn} onClick={addPattern} disabled={!edit}>
          + Add pattern
        </button>
        {patterns.length > 1 && (
          <button style={S.btn} onClick={() => removePattern(activeIndex)} disabled={!edit}>
            Remove pattern
          </button>
        )}
      </div>

      <div style={S.row}>
        <Field label="Start Date (effective)" type="date" value={active.startDate || ""} onChange={(v) => setPattern(activeIndex, { startDate: v })} disabled={!edit} />
        <Field label="End Date (optional)" type="date" value={active.endDate || ""} onChange={(v) => setPattern(activeIndex, { endDate: v })} disabled={!edit} />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Day</th>
              <th style={S.th}>Session</th>
              <th style={S.th}>Start</th>
              <th style={S.th}>End</th>
              <th style={S.th}>Hours</th>
            </tr>
          </thead>
          <tbody>
            {DAY_KEYS.map((k) => {
              const sess = schedule[k] || "None";
              const info = defs[sess] || { start: "", end: "", hours: 0 };
              return (
                <tr key={k}>
                  <td style={S.td}>{DAY_LABEL[k]}</td>
                  <td style={S.td}>
                    <select value={sess} onChange={(e) => setSchedule(k, e.target.value)} style={S.input} disabled={!edit}>
                      {Object.keys(defs).map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td style={S.td}>{info.start || "—"}</td>
                  <td style={S.td}>{info.end || "—"}</td>
                  <td style={S.td}>{info.hours ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <b>Weekly hours:</b> {weeklyHours}h
        </div>
      </div>

      <Field label="Registers (notes)" value={raw.registers || ""} onChange={(v) => setText("registers", v)} disabled={!edit} />

      {/* Extras */}
      <div style={{ border: "1px dashed #e5e7eb", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <b>Extra Sessions</b>
          <button style={S.btn} onClick={addExtra} disabled={!edit}>
            + Add extra session
          </button>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Session</th>
              <th style={S.th}>Note</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {extrasList.length === 0 && (
              <tr>
                <td style={S.td} colSpan={4}>
                  (No extra sessions)
                </td>
              </tr>
            )}
            {extrasList.map((x, i) => (
              <tr key={i}>
                <td style={S.td}>
                  <input type="date" value={x.date || ""} onChange={(e) => setExtra(i, "date", e.target.value)} style={S.input} disabled={!edit} />
                </td>
                <td style={S.td}>
                  <select value={x.session || "AM"} onChange={(e) => setExtra(i, "session", e.target.value)} style={S.input} disabled={!edit}>
                    {Object.keys(defs).map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td style={S.td}>
                  <input value={x.note || ""} onChange={(e) => setExtra(i, "note", e.target.value)} style={S.input} disabled={!edit} placeholder="(optional)" />
                </td>
                <td style={S.td}>
                  <button style={S.btn} onClick={() => removeExtra(i)} disabled={!edit}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Fees / Account (robust) ---------- */
function Fees({ edit, child, setChild }) {
  const fees = child.fees || {};
  const setFees = (patch) => setChild({ ...child, fees: { ...fees, ...patch } });

  // Hours from current active pattern (we saved hours into bookings.sessions)
  const weeklyHours = (child.bookings?.sessions || []).reduce((sum, s) => sum + (Number(s.hours) || 0), 0);

  // Defaults / derived
  const hourlyRate = Number(fees.hourlyRate ?? 0);              // £/hr
  const elig = fees.fundingEligibility ?? "none";               // "none" | "2yo" | "u15" | "e30"
  const fundedHrsWk = Number(
    fees.fundedHoursPerWeek ??
    (elig === "u15" ? 15 : elig === "e30" ? 30 : 0)
  );
  const fundedWeeks = Number(fees.fundedWeeksPerYear ?? 38);    // typical term-time
  const siblingOn = !!fees.sibling?.enabled;
  const siblingPct = Number(fees.sibling?.discountPct ?? 0);    // 0–100
  const siblingRef = fees.sibling?.referenceChildId ?? "";

  // Calculations
  const baseAnnual = (weeklyHours * hourlyRate) * 52;
  const baseMonthly = baseAnnual / 12;

  const fundedAnnual = (fundedHrsWk * hourlyRate) * fundedWeeks;
  const fundedMonthly = fundedAnnual / 12;

  // sibling discount applied after funding
  const subAfterFunding = Math.max(0, baseMonthly - fundedMonthly);
  const siblingDiscountMonthly = siblingOn ? (subAfterFunding * (siblingPct / 100)) : 0;

  const estimatedMonthly = Math.max(0, subAfterFunding - siblingDiscountMonthly);

  // Helpers
  const money = (n) => `£${(Number(n) || 0).toFixed(2)}`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Balance + Last invoice */}
      <div style={S.row}>
        <Field
          label="Current Balance"
          value={String(child.balance ?? 0)}
          onChange={(v) => setChild({ ...child, balance: Number(v) || 0 })}
          disabled={!edit}
        />
        <Field
          label="Last Invoice"
          value={fees.lastInvoice || ""}
          onChange={(v) => setFees({ lastInvoice: v })}
          disabled={!edit}
        />
      </div>

      {/* One-off fees */}
      <div style={S.row}>
        <Field
          label="Registration fee"
          value={fees.regFee ?? ""}
          onChange={(v) => setFees({ regFee: v })}
          disabled={!edit}
        />
        <Field
          label="Deposit paid-amount"
          value={fees.deposit ?? ""}
          onChange={(v) => setFees({ deposit: v })}
          disabled={!edit}
        />
      </div>

      {/* Pricing inputs */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Pricing & Funding</div>

        <div style={S.row}>
          <Field
            label={`Hourly rate (${weeklyHours}h/week from Attendance)`}
            value={fees.hourlyRate ?? ""}
            onChange={(v) => setFees({ hourlyRate: v })}
            disabled={!edit}
          />
          <label style={S.field}>
            <div style={S.label}>Funding eligibility</div>
            <select
              value={elig}
              onChange={(e) => {
                const v = e.target.value;
                const autoHours = v === "u15" ? 15 : v === "e30" ? 30 : 0;
                setFees({
                  fundingEligibility: v,
                  fundedHoursPerWeek: (fees.fundedHoursPerWeek ?? autoHours), // don't overwrite if already edited
                  fundedWeeksPerYear: (fees.fundedWeeksPerYear ?? 38)
                });
              }}
              style={S.input}
              disabled={!edit}
            >
              <option value="none">None</option>
              <option value="2yo">2-year-old funding</option>
              <option value="u15">3–4 Universal (15h)</option>
              <option value="e30">3–4 Extended (30h)</option>
            </select>
          </label>
        </div>

        <div style={S.row}>
          <Field
            label="Funded hours per week"
            value={String(fundedHrsWk)}
            onChange={(v) => setFees({ fundedHoursPerWeek: Number(v) || 0 })}
            disabled={!edit}
          />
          <Field
            label="Funded weeks per year"
            value={String(fundedWeeks)}
            onChange={(v) => setFees({ fundedWeeksPerYear: Number(v) || 0 })}
            disabled={!edit}
          />
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={siblingOn}
              onChange={(e) => setFees({ sibling: { ...(fees.sibling || {}), enabled: e.target.checked, discountPct: e.target.checked ? (siblingPct || 10) : 0 } })}
              disabled={!edit}
            />
            <div style={{ fontWeight: 700 }}>Sibling discount</div>
          </div>

          {siblingOn && (
            <div style={S.row}>
              <Field
                label="Sibling discount %"
                value={String(siblingPct)}
                onChange={(v) => setFees({ sibling: { ...(fees.sibling || {}), enabled: true, discountPct: Number(v) || 0, referenceChildId: siblingRef } })}
                disabled={!edit}
              />
              <Field
                label="Sibling (reference child ID) — optional"
                value={siblingRef}
                onChange={(v) => setFees({ sibling: { ...(fees.sibling || {}), enabled: true, discountPct: siblingPct, referenceChildId: v } })}
                disabled={!edit}
              />
            </div>
          )}
        </div>
      </div>

      {/* Live estimate */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Estimate (per month)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
          <div>Base ({weeklyHours}h × £{hourlyRate.toFixed ? hourlyRate.toFixed(2) : hourlyRate}/hr × 52 ÷ 12)</div>
          <div style={{ textAlign: "right" }}>{money(baseMonthly)}</div>

          <div>Funding deduction ({fundedHrsWk}h × £{hourlyRate.toFixed ? hourlyRate.toFixed(2) : hourlyRate}/hr × {fundedWeeks} ÷ 12)</div>
          <div style={{ textAlign: "right" }}>− {money(fundedMonthly)}</div>

          <div>Sibling discount {siblingOn ? `(${siblingPct}% of post-funding)` : ""}</div>
          <div style={{ textAlign: "right" }}>− {money(siblingDiscountMonthly)}</div>

          <div style={{ fontWeight: 800, borderTop: "1px dashed #cbd5e1", paddingTop: 6 }}>Estimated monthly</div>
          <div style={{ textAlign: "right", fontWeight: 800, borderTop: "1px dashed #cbd5e1", paddingTop: 6 }}>{money(estimatedMonthly)}</div>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            style={{ ...S.btn, ...S.primary }}
            onClick={() => setFees({ monthlyFee: Number(estimatedMonthly.toFixed(2)) })}
            disabled={!edit}
            title="Copy estimate to Monthly fee field"
          >
            Apply estimate to Monthly fee
          </button>
          <span style={{ color: "#475569", fontSize: 12 }}>
            Tip: estimate uses the current Attendance pattern’s weekly hours.
          </span>
        </div>
      </div>

      {/* Stored amounts */}
      <div style={S.row}>
        <Field
          label="Funding (notes)"
          value={fees.funding ?? ""}
          onChange={(v) => setFees({ funding: v })}
          disabled={!edit}
        />
        <Field
          label="Monthly fee (stored)"
          value={fees.monthlyFee ?? ""}
          onChange={(v) => setFees({ monthlyFee: v })}
          disabled={!edit}
        />
      </div>
    </div>
  );
}


/* ======== Export: Child Profile (no fees/pattern/amendments) ======== */
function exportChildProfile(child) {
  const schedule = child.bookings?.patterns?.[child.bookings?.activeIndex || 0]?.schedule || {};
  const dayRow = (label, key) => `<tr><td>${label}</td><td>${esc(schedule[key] || "None")}</td></tr>`;

  const html = `
  <html><head><meta charset="utf-8">
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;font-size:12pt;color:#0f172a}
    h1,h2{margin:0 0 6px} h1{font-size:18pt} h2{font-size:14pt;margin-top:14px}
    table{width:100%;border-collapse:collapse;margin:6px 0}
    th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
    th{background:#f3f4f6}
    .section{margin:10px 0 16px}
  </style>
  </head><body>
    <h1>Child Profile — ${esc(child.firstName)} ${esc(child.middleName || "")} ${esc(child.lastName)}</h1>

    <div class="section"><h2>About Me</h2><table>
      <tr><th>ID</th><td>${esc(child.id)}</td></tr>
      <tr><th>Status</th><td>${esc(child.status)}</td></tr>
      <tr><th>DOB</th><td>${esc(child.dob)}</td></tr>
      <tr><th>Sex</th><td>${esc(child.sex)}</td></tr>
      <tr><th>Address</th><td>${esc(child.address)}</td></tr>
      <tr><th>Registration Date</th><td>${esc(child.registrationDate)}</td></tr>
      <tr><th>Start Date</th><td>${esc(child.startDate)}</td></tr>
      <tr><th>URN</th><td>${esc(child.URN)}</td></tr>
      <tr><th>Setting</th><td>${esc(child.setting)}</td></tr>
      <tr><th>Room</th><td>${esc(child.roomId)}</td></tr>
      <tr><th>Key person</th><td>${esc(child.keyPersonId)}</td></tr>
      <tr><th>Dietary</th><td>${esc((child.diet?.type || "standard"))}${child.diet?.notes ? " — " + esc(child.diet.notes) : ""}</td></tr>
    </table></div>

    <div class="section"><h2>Guardians</h2><table>
      <tr><th>Guardian</th><th>Name</th><th>Relationship</th><th>Email</th><th>Phone</th><th>Address</th><th>Postcode</th></tr>
      ${(child.parents || [])
        .map(
          (p, i) => `<tr>
        <td>Guardian ${i + 1}</td><td>${esc((p.firstname||"")+" "+(p.lastname||""))}</td><td>${esc(p.relationship || p.relation)}</td>
        <td>${esc(p.email)}</td><td>${esc(p.phone)}</td><td>${esc(p.addr1 || p.address)} ${esc(p.addr2 || "")} ${esc(p.city || "")}</td><td>${esc(p.postcode || "")}</td>
      </tr>`
        )
        .join("")}
    </table></div>

    <div class="section"><h2>Collection</h2><table>
      <tr><th>Pickup password</th><td>${esc(child.pickupPassword || "")}</td></tr>
    </table>
    <table>
      <tr><th>Name</th><th>Relationship</th><th>Phone</th></tr>
      ${(child.collectors || [])
        .map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.relationship)}</td><td>${esc(r.phone)}</td></tr>`)
        .join("")}
    </table></div>

    <div class="section"><h2>Additional Needs</h2><table>
      <tr><th>Additional needs</th><td>${esc(child.medical)}</td></tr>
      <tr><th>Care plan</th><td>${esc(child.carePlans)}</td></tr>
      <tr><th>SEN</th><td>${esc(child.SEN)}</td></tr>
      <tr><th>Notes</th><td>${esc(child.additionalNotes || "")}</td></tr>
      ${child.professionalsYN ? `<tr><th>Professionals involved</th><td>${esc(child.professionalsYN)}</td></tr>` : ""}
      ${child.professionalsYN==="Yes" ? `<tr><th>Professionals details</th><td>${esc(child.professionalsDetails||"")}</td></tr>` : ""}
    </table></div>

    <div class="section"><h2>Attendance (current pattern)</h2><table>
      <tr><th>Day</th><th>Session</th></tr>
      ${dayRow("Mon","mon")}${dayRow("Tue","tue")}${dayRow("Wed","wed")}${dayRow("Thu","thu")}${dayRow("Fri","fri")}
    </table></div>
  </body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Child_Profile_${(child.lastName || "").trim()}_${(child.firstName || "").trim()}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function downloadAdditionalNeedsReport(child) {
  const esc2 = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `
  <html><head><meta charset="utf-8">
  <style>
    body{font-family:Segoe UI,Arial,sans-serif;font-size:12pt;color:#0f172a}
    h1{font-size:16pt;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin:6px 0}
    th,td{border:1px solid #d1d5db;padding:6px;text-align:left}
    th{background:#f3f4f6}
  </style>
  </head><body>
    <h1>Additional Needs Report — ${esc2(child.firstName)} ${esc2(child.middleName || "")} ${esc2(child.lastName)}</h1>
    <table>
      <tr><th>Additional needs</th><td>${esc2(child.medical)}</td></tr>
      <tr><th>Dietary</th><td>${esc2((child.diet?.type || "standard"))}${child.diet?.notes ? " — " + esc2(child.diet.notes) : ""}</td></tr>
      <tr><th>Care plan</th><td>${esc2(child.carePlans)}</td></tr>
      ${child.professionalsYN ? `<tr><th>Professionals involved</th><td>${esc2(child.professionalsYN)}</td></tr>` : ""}
      ${child.professionalsYN==="Yes" ? `<tr><th>Professionals details</th><td>${esc2(child.professionalsDetails||"")}</td></tr>` : ""}
      <tr><th>Child Protection</th><td>${esc2(child.childProtection)}</td></tr>
      <tr><th>SEN</th><td>${esc2(child.SEN)}</td></tr>
    </table>
  </body></html>`;
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AdditionalNeeds-${child.id}.doc`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
