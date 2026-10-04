// backend/server.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Enable CORS for frontend
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

/* ---------------- Utilities / Validators ---------------- */
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_DIGITS_RX = /\d/g;
const isEmail = (s) => typeof s === "string" && EMAIL_RX.test(s.trim());
const isPhone = (s) => {
  if (typeof s !== "string") return false;
  const digits = (s.match(PHONE_DIGITS_RX) || []).join("");
  return digits.length >= 10 && digits.length <= 13; // simple tolerance (UK mobiles ~11)
};
const isIsoDate = (s) =>
  typeof s === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(new Date(s).valueOf());

const todayISO = () => new Date().toISOString().slice(0, 10);
const notPast = (iso) => isIsoDate(iso) && iso >= todayISO();
const isoMonth = (d = new Date()) => d.toISOString().slice(0, 7);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/* ---------------- Session definitions per setting ---------------- */
const SESSION_DEFS = {
  default: {
    "None": { start: null, end: null, hours: 0 },
    "AM": { start: "08:00", end: "13:00", hours: 5 },
    "PM": { start: "13:00", end: "18:00", hours: 5 },
    "Full Day": { start: "08:00", end: "18:00", hours: 10 },
  },
  Teddington: {
    "None": { start: null, end: null, hours: 0 },
    "AM": { start: "08:30", end: "12:30", hours: 4 },
    "PM": { start: "12:30", end: "17:30", hours: 5 },
    "Full Day": { start: "08:30", end: "17:30", hours: 9 },
  },
  Chiswick: {
    "None": { start: null, end: null, hours: 0 },
    "AM": { start: "08:00", end: "13:00", hours: 5 },
    "PM": { start: "13:00", end: "18:00", hours: 5 },
    "Full Day": { start: "08:00", end: "18:00", hours: 10 },
  },
};

app.get("/api/session-defs", (req, res) => {
  const setting = req.query.setting;
  res.json(SESSION_DEFS[setting] || SESSION_DEFS.default);
});

/* ---------------- Synthetic demo data: Children ---------------- */
let children = [
  {
    id: "C101",
    firstName: "Ava",
    lastName: "Example",
    sex: "F",
    dob: "2021-04-18",
    address: "1 Demo Street, London",
    registrationDate: "2023-08-20",
    URN: "URN-001",
    startDate: "2023-09-04",
    setting: "feltham2",
    status: "Enrolled",
    balance: 120.5,
    dietary: "No nuts; veg only",
    medical: "None",
    carePlans: "",
    SEN: "No",
    parents: [
      { type: "Guardian 1", name: "Alex Example", relation: "Parent", email: "alex@example.com", phone: "07700 900001", address: "Same as child" },
      { type: "Guardian 2", name: "", relation: "", email: "", phone: "", address: "" }
    ],
    bookings: {
      sessions: [
        { day: "Mon", session: "Full Day", start: "08:30", end: "17:30", hours: 9 },
        { day: "Tue", session: "AM",      start: "08:30", end: "12:30", hours: 4 },
        { day: "Thu", session: "PM",      start: "12:30", end: "17:30", hours: 5 },
      ],
      effectiveDates: [{ from: "2023-09-01", to: "" }],
      pattern: "Mon/Tue/Thu Mixed",
      amendments: "",
      extras: "Lunch club Fri",
      registers: "Present 92%",
      patterns: [{ startDate: "2023-09-01", endDate: "", schedule: { mon:"Full Day",tue:"AM",wed:"None",thu:"PM",fri:"None" } }],
      activeIndex: 0,
      extrasList: []
    },
    fees: { lastInvoice: "2024-05", funding: "" }
  },
  {
    id: "C103",
    firstName: "Noah",
    lastName: "Example",
    sex: "F",
    dob: "2020-12-02",
    address: "2 Demo Street, London",
    registrationDate: "2022-08-30",
    URN: "URN-003",
    startDate: "2022-09-12",
    setting: "feltham",
    status: "Enrolled",
    balance: 0,
    dietary: "Vegetarian",
    medical: "Inhaler PRN",
    carePlans: "Asthma care plan",
    SEN: "No",
    parents: [
      { type: "Guardian 1", name: "Jordan Example", relation: "Parent", email: "jordan@example.com", phone: "07700 900002", address: "Same as child" },
      { type: "Guardian 2", name: "", relation: "", email: "", phone: "", address: "" }
    ],
    bookings: {
      sessions: [
        { day: "Tue", session: "AM", start: "08:00", end: "13:00", hours: 5 },
        { day: "Thu", session: "PM", start: "13:00", end: "18:00", hours: 5 },
      ],
      effectiveDates: [{ from: "2022-09-12", to: "" }],
      pattern: "Tue/Thu Half Days",
      amendments: "",
      extras: "",
      registers: "",
      patterns: [{ startDate: "2022-09-12", endDate: "", schedule: { mon:"None",tue:"AM",wed:"None",thu:"PM",fri:"None" } }],
      activeIndex: 0,
      extrasList: []
    },
    fees: { lastInvoice: "2024-05", funding: "2yo funding" }
  },
  {
    id: "C104",
    firstName: "Mia",
    lastName: "Example",
    sex: "M",
    dob: "2022-06-22",
    address: "3 Demo Street, London",
    registrationDate: "2024-07-20",
    URN: "URN-004",
    startDate: "2024-09-02",
    setting: "feltham3",
    status: "Waiting list",
    balance: 45.0,
    dietary: "",
    medical: "",
    carePlans: "",
    SEN: "No",
    parents: [
      { type: "Guardian 1", name: "Taylor Example", relation: "Parent", email: "taylor@example.com", phone: "07700 900003", address: "Same as child" },
      { type: "Guardian 2", name: "", relation: "", email: "", phone: "", address: "" }
    ],
    bookings: {
      sessions: [],
      effectiveDates: [{ from: "", to: "" }],
      pattern: "",
      amendments: "",
      extras: "",
      registers: "",
      patterns: [{ startDate: "", endDate: "", schedule: { mon:"None",tue:"None",wed:"None",thu:"None",fri:"None" } }],
      activeIndex: 0,
      extrasList: []
    },
    fees: { lastInvoice: "", funding: "" }
  }
];

const childSummary = (c) => ({
  id: c.id,
  name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
  dob: c.dob,
  setting: c.setting,
  status: c.status,
  balance: c.balance ?? 0
});

// Generate next EHC### id
function nextChildEHC() {
  const nums = children
    .map(c => (c.id || ""))
    .map(id => (id.startsWith("EHC") ? Number(id.slice(3)) : 0))
    .filter(n => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return "EHC" + String(max + 1).padStart(3, "0");
}

/* ---------------- Root ---------------- */
app.get("/", (_, res) => res.send("Nursery API running"));

/* ---------------- Children ---------------- */
app.get("/api/children", (req, res) => {
  const { status, q } = req.query;
  let data = [...children];
  if (status) data = data.filter(c => c.status === status);
  if (q) {
    const s = q.toLowerCase();
    data = data.filter(c =>
      c.id.toLowerCase().includes(s) ||
      (c.firstName||"").toLowerCase().includes(s) ||
      (c.lastName||"").toLowerCase().includes(s) ||
      (c.setting||"").toLowerCase().includes(s)
    );
  }
  res.json(data.map(childSummary));
});


/* ---------- Children metrics (helper + routes) ---------- */

// helper: "YYYY-MM" +/- n months
function addMonths(baseMonth /* "YYYY-MM" */, n) {
  const [y, m] = baseMonth.split("-").map(Number);
  const d = new Date(y, (m - 1) + n, 1);
  return d.toISOString().slice(0, 7);
}
// compute the payload once so both routes can use it
function childrenMetricsPayload() {
  const month = new Date().toISOString().slice(0, 7);
  const enrolled = children.filter(c => c.status === "Enrolled").length;
  const waiting  = children.filter(c => /waiting/i.test(c.status || "")).length;

  // new registrations that match current month in registrationDate or startDate
  const newThisMonth = children.filter(c => {
    const d = c.registrationDate || c.startDate || "";
    return typeof d === "string" && d.startsWith(month);
  }).length;

  // 6-month trend (oldest → latest)
  const trend = Array.from({ length: 6 }).map((_, i) => {
    const mm = addMonths(month, i - 5);    // 5 months ago .. this month
    const count = children.filter(c => {
      const d = c.registrationDate || c.startDate || "";
      return typeof d === "string" && d.startsWith(mm);
    }).length;
    return { month: mm, count };
  });

  return { month, enrolled, waiting, newThisMonth, trend };
}

// canonical endpoint
app.get("/api/children/metrics", (req, res) => {
  res.json(childrenMetricsPayload());
});

// backwards-compat for older UI (the Dashboard currently calls this)
app.get("/api/children/summary", (req, res) => {
  res.json(childrenMetricsPayload());
});

/* ---------------- Children: metrics for Dashboard ---------------- */
function addMonths(isoYYYYMM, delta) {
  const [y, m] = isoYYYYMM.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

app.get("/api/children/metrics", (req, res) => {
  const month = req.query.month || isoMonth(); // YYYY-MM

  // Totals
  const enrolled = children.filter(c => (c.status || "") === "Enrolled").length;
  const waiting = children.filter(c => (c.status || "").toLowerCase() === "waiting list").length;

  // “New this month”: prefer registrationDate, fall back to startDate
  const newThisMonth = children.filter(c => {
    const d = c.registrationDate || c.startDate || "";
    return typeof d === "string" && d.startsWith(month);
  }).length;

  // 6-month trend of new registrations (oldest → latest)
  const trend = Array.from({ length: 6 }).map((_, i) => {
    const mm = addMonths(month, i - 5);
    const count = children.filter(c => {
      const d = c.registrationDate || c.startDate || "";
      return typeof d === "string" && d.startsWith(mm);
    }).length;
    return { month: mm, count };
  });

  res.json({ month, enrolled, waiting, newThisMonth, trend });
});

app.get("/api/children/:id", (req, res) => {
  const child = children.find(c => c.id === req.params.id);
  if (!child) return res.status(404).json({ error: "Not found" });
  res.json(child);
});

app.post("/api/children", (req, res) => {
  const body = req.body || {};

  // Basic guardian/email/phone sanity checks (non-blocking; only if provided)
  const parents = Array.isArray(body.parents) ? body.parents : [
    { type: "Guardian 1", name: "", relation: "", email: "", phone: "", address: "" },
    { type: "Guardian 2", name: "", relation: "", email: "", phone: "", address: "" },
  ];
  parents.forEach(p => {
    if (p.email && !isEmail(p.email)) p.email = "";
    if (p.phone && !isPhone(p.phone)) p.phone = "";
  });

  // New ID: prefer provided; else auto EHC###
  const id = body.id || nextChildEHC();

  const next = {
    id,
    firstName: "",
    lastName: "",
    sex: "",
    dob: "",
    address: "",
    registrationDate: "",
    URN: "",
    startDate: "",
    setting: "",
    status: "Enrolled",
    balance: 0,
    dietary: "",
    medical: "",
    carePlans: "",
    SEN: "",
    parents,
    bookings: {
      sessions: [],
      effectiveDates: [{ from: "", to: "" }],
      pattern: "",
      amendments: "",
      extras: "",
      registers: "",
      patterns: [{ startDate:"", endDate:"", schedule:{ mon:"None",tue:"None",wed:"None",thu:"None",fri:"None" } }],
      activeIndex:0,
      extrasList:[]
    },
    fees: { lastInvoice: "", funding: "" },
    ...body
  };
  children.unshift(next);
  res.status(201).json(next);
});

app.put("/api/children/:id", (req, res) => {
  const i = children.findIndex(c => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "Not found" });

  // Validate common fields lightly
  const incoming = { ...req.body };
  if (incoming.parents && Array.isArray(incoming.parents)) {
    incoming.parents = incoming.parents.map(p => ({
      ...p,
      email: p.email && isEmail(p.email) ? p.email : (p.email ? "" : p.email),
      phone: p.phone && isPhone(p.phone) ? p.phone : (p.phone ? "" : p.phone),
    }));
  }
  // Preserve original id
  children[i] = { ...children[i], ...incoming, id: children[i].id };
  res.json(children[i]);
});

app.delete("/api/children/:id", (req, res) => {
  const i = children.findIndex(c => c.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "Not found" });
  const removed = children.splice(i, 1)[0];
  res.json({ ok: true, removed: childSummary(removed) });
});

/* ---------- Children summary (Dashboard) ---------- */
app.get("/api/children/summary", (req, res) => {
  const month = isoMonth();
  const enrolled = children.filter(c => c.status === "Enrolled").length;
  const waiting = children.filter(c => c.status && c.status.toLowerCase().includes("waiting")).length;

  // New this month: by registrationDate or startDate within the month
  const newThisMonth = children.filter(c =>
    (c.registrationDate && c.registrationDate.startsWith(month)) ||
    (c.startDate && c.startDate.startsWith(month))
  ).length;

  // Tiny demo history if none stored elsewhere
  const history = [8, 9, 11, 10, 12, 14];

  res.json({ enrolled, waiting, newThisMonth, history });
});

/* ==================== FINANCE API ==================== */

// Helpers
const childById = (id) => children.find(c => c.id === id);
const childRow = (c) => ({
  childId: c.id,
  name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
  setting: c.setting || "",
  status: c.status || "",
  balance: Number(c.balance || 0)
});

// Seeded ledgers so Finance never looks empty
const LEDGERS = {
  C101: [
    { date: "2024-04-01", description: "Opening Balance", opening: 120.50, debit: 0, credit: 0, balance: 120.50 },
    { date: "2024-04-28", description: "Invoice Apr", debit: 250.00, credit: 0, balance: 370.50 },
    { date: "2024-05-05", description: "Payment (Card)", debit: 0, credit: 250.00, balance: 120.50 },
  ],
  C103: [{ date: "2024-04-01", description: "Opening Balance", opening: 0.00, debit: 0, credit: 0, balance: 0.00 }],
  C104: [{ date: "2024-04-01", description: "Opening Balance", opening: 45.00, debit: 0, credit: 0, balance: 45.00 }],
};

function computeOutstanding() {
  if (children && children.length) return children.map(childRow);
  return [
    { childId: "C101", name: "Ava Example", setting: "Teddington", status: "Enrolled", balance: 120.5 },
    { childId: "C104", name: "Mia Example", setting: "Isleworth", status: "Waiting list", balance: 45.0 },
  ];
}

// Outstanding
app.get("/api/finance/outstanding", (req, res) => {
  const { q = "", status = "", setting = "" } = req.query;
  let rows = computeOutstanding();

  if (status) rows = rows.filter(r => (r.status || "").toLowerCase() === status.toLowerCase());
  if (setting) rows = rows.filter(r => (r.setting || "").toLowerCase() === setting.toLowerCase());

  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(r =>
      r.childId.toLowerCase().includes(s) ||
      (r.name || "").toLowerCase().includes(s) ||
      (r.setting || "").toLowerCase().includes(s) ||
      (r.status || "").toLowerCase().includes(s)
    );
  }
  res.json(rows);
});

// Statement
app.get("/api/finance/account/:childId", (req, res) => {
  const child = childById(req.params.childId);
  if (!child) return res.status(404).json({ error: "Child not found" });

  const tx = (LEDGERS[child.id] || []).map((t, i, arr) => {
    if (i === 0) return t;
    const prev = arr[i - 1];
    const bal = (prev.balance || 0) + (t.debit || 0) - (t.credit || 0);
    return { ...t, balance: typeof t.balance === "number" ? t.balance : bal };
  });

  res.json({
    child: { id: child.id, name: `${child.firstName} ${child.lastName}`.trim(), setting: child.setting, status: child.status },
    transactions: tx
  });
});

// Record Payment (with modeOfPayment + no past dates)
const PAYMENT_MODES = new Set(["Cash", "Cheque", "Bank transfer"]);
app.post("/api/finance/account/:childId/payment", (req, res) => {
  const { amount = 0, modeOfPayment, date } = req.body || {};
  const id = req.params.childId;

  if (!PAYMENT_MODES.has(modeOfPayment)) {
    return res.status(400).json({ error: "Invalid modeOfPayment. Use: Cash, Cheque, Bank transfer." });
  }
  const when = date || todayISO();
  if (!isIsoDate(when) || !notPast(when)) {
    return res.status(400).json({ error: "Payment date must be today or in the future." });
  }

  const list = LEDGERS[id] || (LEDGERS[id] = [{ date: "2024-04-01", description: "Opening Balance", opening: 0, debit: 0, credit: 0, balance: 0 }]);
  const last = list[list.length - 1];
  const next = {
    date: when,
    description: `Payment (${modeOfPayment})`,
    debit: 0,
    credit: Number(amount),
    balance: Number((last.balance || 0) - Number(amount))
  };
  list.push(next);
  const c = childById(id);
  if (c) c.balance = next.balance;
  res.status(201).json(next);
});

// Add Charge
app.post("/api/finance/account/:childId/invoice", (req, res) => {
  const { amount = 0, description = "Invoice", date } = req.body || {};
  const id = req.params.childId;
  const when = date || todayISO();
  if (!isIsoDate(when)) return res.status(400).json({ error: "Invalid date" });

  const list = LEDGERS[id] || (LEDGERS[id] = [{ date: "2024-04-01", description: "Opening Balance", opening: 0, debit: 0, credit: 0, balance: 0 }]);
  const last = list[list.length - 1];
  const next = {
    date: when,
    description,
    debit: Number(amount),
    credit: 0,
    balance: Number((last.balance || 0) + Number(amount))
  };
  list.push(next);
  const c = childById(id);
  if (c) c.balance = next.balance;
  res.status(201).json(next);
});

// Simple weekly hours (fallback)
function weeklyHoursFor(child) {
  const wh = child.bookings?.weeklyHours;
  if (typeof wh === "number") return wh;
  return child.status === "Enrolled" ? 25 : 0; // demo default
}

// Bulk Generate Month Invoices
app.post("/api/finance/invoices/generate", (req, res) => {
  const { month = isoMonth(), ratePerHour = 8.0 } = req.body || {};
  const weeks = 4.33;

  const generated = [];
  (children || []).forEach(c => {
    if (c.status !== "Enrolled") return;
    const wh = weeklyHoursFor(c);
    if (!wh) return;

    const amount = Number((wh * ratePerHour * weeks).toFixed(2));
    const list = LEDGERS[c.id] || (LEDGERS[c.id] = [{ date: `${month}-01`, description: "Opening Balance", opening: 0, debit: 0, credit: 0, balance: 0 }]);
    const last = list[list.length - 1];
    const line = {
      date: `${month}-01`,
      description: `Invoice ${month}`,
      debit: amount,
      credit: 0,
      balance: Number((last.balance || 0) + amount)
    };
    list.push(line);
    c.balance = line.balance;
    c.fees = { ...(c.fees || {}), lastInvoice: month };

    generated.push({ childId: c.id, name: `${c.firstName} ${c.lastName}`.trim(), amount, weekHours: wh });
  });

  res.json({ month, ratePerHour, generated, count: generated.length });
});

// Payroll (unchanged approach)
const ROLE_RATE = { "Room Lead": 16.5, "Practitioner": 13.0 };
app.get("/api/finance/payroll", (req, res) => {
  const m = req.query.month || isoMonth();
  const rows = (staff && staff.length ? staff : [{
    id: "S201", fullName: "Demo Lead", role: "Room Lead", payroll: { attendancePercent: 97 }
  }]).map(s => {
    const hours = Math.round((s.payroll?.attendancePercent || 95) / 100 * 160);
    const rate = ROLE_RATE[s.role] || 12.0;
    const gross = Number((hours * rate).toFixed(2));
    return { staffId: s.id, name: s.fullName, role: s.role, month: m, hours, rate, gross };
  });
  res.json(rows);
});

// Finance summary / aging (as before)
app.get("/api/finance/reports/summary", (req, res) => {
  const out = computeOutstanding();
  const outstanding = out.reduce((sum, r) => sum + Number(r.balance || 0), 0);

  const aging = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  out.forEach(r => {
    const h = r.childId.charCodeAt(1) % 4;
    if (h === 0) aging["0-30"] += r.balance || 0;
    else if (h === 1) aging["31-60"] += r.balance || 0;
    else if (h === 2) aging["61-90"] += r.balance || 0;
    else aging["90+"] += r.balance || 0;
  });

  const enrolled = children.filter(c => c.status === "Enrolled").length;
  const lastInvoice = children.map(c => c.fees?.lastInvoice || "").filter(Boolean).sort().pop() || "";
  const month = isoMonth();

  const rows = (staff || []).map(s => {
    const hours = Math.round((s.payroll?.attendancePercent || 95) / 100 * 160);
    const rate = ROLE_RATE[s.role] || 12.0;
    return hours * rate;
  });
  const payrollEstimate = rows.reduce((a, b) => a + b, 0);

  res.json({ outstanding, enrolled, lastInvoice, payrollEstimate, aging, month, history: [4200, 6100, 5900, 6800, 6400, outstanding] });
});

// Fee reminders
app.get("/api/finance/reminders", (req, res) => {
  const list = computeOutstanding()
    .filter(r => (r.balance || 0) > 0.01)
    .map(r => ({
      childId: r.childId,
      name: r.name,
      balance: r.balance,
      email: (childById(r.childId)?.parents?.find(p => p.email)?.email) || `${r.childId.toLowerCase()}@example.com`
    }));
  res.json({ count: list.length, recipients: list });
});

/* ===================== Synthetic demo data: Staff ===================== */
let staff = [
  {
    id: "S201",
    fullName: "Morgan Example",
    role: "Room Lead",
    team: "Toddlers",
    homeAddress: "10 Demo Avenue, London",
    phone: "07700 900011",
    email: "morgan@example.com",
    startDate: "2022-01-10",
    rtwStatus: "Verified",
    dbsNumber: "DEMO-554433",
    bradfordScore: 8,
    reports: {
      inductionDate: "2022-01-12",
      supervision: "Monthly",
      trainingsMandatory: "Safeguarding, Food Hygiene",
      trainingsEnhanced: "SEND intro",
      absence: "No recent absence",
      hrReports: "",
      sicknessDays: 1,
      holidayBalance: 7,
      safeguardingTraining: "Up to date"
    },
    payroll: {
      attendancePercent: 98,
      shiftAllocation: "Mon–Fri 08:00–17:00",
      rosterNote: "Covers Wed late"
    },
    holidays: {
      remainingDays: 7,
      teamHolidayNote: "Team leader to approve"
    },
    ofsted: {
      dbsDate: "2023-05-03",
      pfaExpiry: "2026-05-03",
      safeguardingDate: "2024-02-01",
      foodHygieneDate: "2024-03-15",
      twoYearChecks: "Trained",
      lado: "Aware",
      childProtection: "Up to date",
      notifications: "",
      sen: "Level 2",
      eypp: "Yes",
      immunisation: "Complete"
    }
  },
  {
    id: "S202",
    fullName: "Jamie Example",
    role: "Practitioner",
    team: "Preschool",
    homeAddress: "11 Demo Avenue, London",
    phone: "07700 900012",
    email: "jamie@example.com",
    startDate: "2023-06-05",
    rtwStatus: "Verified",
    dbsNumber: "DEMO-778899",
    bradfordScore: 16,
    reports: {
      inductionDate: "2023-06-10",
      supervision: "6-weekly",
      trainingsMandatory: "Safeguarding",
      trainingsEnhanced: "",
      absence: "1 day May",
      hrReports: "",
      sicknessDays: 2,
      holidayBalance: 10,
      safeguardingTraining: "Due refresh Oct"
    },
    payroll: {
      attendancePercent: 96,
      shiftAllocation: "Tue–Sat rota",
      rosterNote: ""
    },
    holidays: {
      remainingDays: 10,
      teamHolidayNote: ""
    },
    ofsted: {
      dbsDate: "2023-06-01",
      pfaExpiry: "2025-06-01",
      safeguardingDate: "2023-10-01",
      foodHygieneDate: "",
      twoYearChecks: "Shadowing",
      lado: "Aware",
      childProtection: "Pending refresh",
      notifications: "",
      sen: "",
      eypp: "",
      immunisation: ""
    }
  }
];

const staffSummary = (s) => ({ id: s.id, name: s.fullName, role: s.role, team: s.team });

app.get("/api/staff", (req, res) => {
  const { q } = req.query;
  let data = [...staff];
  if (q) {
    const s = q.toLowerCase();
    data = data.filter(p =>
      p.id.toLowerCase().includes(s) ||
      (p.fullName||"").toLowerCase().includes(s) ||
      (p.role||"").toLowerCase().includes(s) ||
      (p.team||"").toLowerCase().includes(s)
    );
  }
  res.json(data.map(staffSummary));
});

app.get("/api/staff/:id", (req, res) => {
  const p = staff.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Not found" });
  res.json(p);
});

app.post("/api/staff", (req, res) => {
  const body = req.body || {};
  const id = body.id || `S${Math.floor(100000 + Math.random() * 900000)}`;
  const next = {
    id,
    fullName: "New Member",
    role: "Practitioner",
    team: "",
    homeAddress: "",
    phone: "",
    email: "",
    startDate: "",
    rtwStatus: "",
    dbsNumber: "",
    bradfordScore: 0,
    reports: {
      inductionDate: "",
      supervision: "",
      trainingsMandatory: "",
      trainingsEnhanced: "",
      absence: "",
      hrReports: "",
      sicknessDays: 0,
      holidayBalance: 0,
      safeguardingTraining: ""
    },
    payroll: { attendancePercent: 0, shiftAllocation: "", rosterNote: "" },
    holidays: { remainingDays: 0, teamHolidayNote: "" },
    ofsted: {
      dbsDate: "", pfaExpiry: "", safeguardingDate: "", foodHygieneDate: "",
      twoYearChecks: "", lado: "", childProtection: "", notifications: "",
      sen: "", eypp: "", immunisation: ""
    },
    ...body
  };
  staff.unshift(next);
  res.status(201).json(next);
});

app.put("/api/staff/:id", (req, res) => {
  const i = staff.findIndex(s => s.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "Not found" });

  const incoming = { ...req.body };
  if (incoming.email && !isEmail(incoming.email)) incoming.email = "";
  if (incoming.phone && !isPhone(incoming.phone)) incoming.phone = "";

  staff[i] = { ...staff[i], ...incoming, id: staff[i].id };
  res.json(staff[i]);
});

app.delete("/api/staff/:id", (req, res) => {
  const i = staff.findIndex(s => s.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: "Not found" });
  const removed = staff.splice(i, 1)[0];
  res.json({ ok: true, removed: staffSummary(removed) });
});

/* ===================== STAFF ATTENDANCE (NEW) ===================== */
let ATTENDANCE = [
  // { id: "A001", staffId: "S201", date: "2025-09-01", start: "08:00", end: "17:00", hours: 9, location: "Teddington", note: "", approved: true }
];

function nextAttendanceId() {
  const n = (ATTENDANCE.map(a => Number(a.id?.slice(1)) || 0).sort((a,b)=>b-a)[0] || 0) + 1;
  return "A" + String(n).padStart(3, "0");
}

// List (filter by staffId / month)
app.get("/api/staff/attendance", (req, res) => {
  const { staffId = "", month = "" } = req.query;
  let rows = [...ATTENDANCE];
  if (staffId) rows = rows.filter(r => r.staffId === staffId);
  if (month) rows = rows.filter(r => (r.date || "").startsWith(month)); // YYYY-MM
  res.json(rows);
});

// Create
app.post("/api/staff/attendance", (req, res) => {
  const { staffId, date, start = "09:00", end = "17:00", hours, location = "", note = "" } = req.body || {};
  if (!staffId) return res.status(400).json({ error: "staffId required" });
  if (!isIsoDate(date)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });

  const toHrs = (t) => (parseInt(t.slice(0,2)) + parseInt(t.slice(3,5))/60);
  const hrs = typeof hours === "number" ? hours : Math.max(0, toHrs(end) - toHrs(start));

  const row = { id: nextAttendanceId(), staffId, date, start, end, hours: Number(hrs.toFixed(2)), location, note, approved: false };
  ATTENDANCE.push(row);
  res.status(201).json(row);
});

// Update
app.put("/api/staff/attendance/:id", (req, res) => {
  const idx = ATTENDANCE.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  ATTENDANCE[idx] = { ...ATTENDANCE[idx], ...req.body, id: ATTENDANCE[idx].id };
  res.json(ATTENDANCE[idx]);
});

/* ===================== STAFF HOLIDAYS (NEW) ===================== */
let HOLIDAYS = [
  // { id: "H001", staffId: "S201", requestedOn: "2025-08-20", from: "2025-09-10", to: "2025-09-12", days: 3, status: "Pending", note: "", allowanceDays: 20 }
];

function nextHolidayId() {
  const n = (HOLIDAYS.map(h => Number(h.id?.slice(1)) || 0).sort((a,b)=>b-a)[0] || 0) + 1;
  return "H" + String(n).padStart(3, "0");
}

// List (filter by staffId / status)
app.get("/api/staff/holidays", (req, res) => {
  const { staffId = "", status = "" } = req.query;
  let rows = [...HOLIDAYS];
  if (staffId) rows = rows.filter(r => r.staffId === staffId);
  if (status) rows = rows.filter(r => (r.status || "").toLowerCase() === status.toLowerCase());
  res.json(rows);
});

// Create
app.post("/api/staff/holidays", (req, res) => {
  const { staffId, from, to, days, note = "", allowanceDays = 20 } = req.body || {};
  if (!staffId) return res.status(400).json({ error: "staffId required" });
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
    return res.status(400).json({ error: "from/to must be valid ISO dates, and from <= to" });
  }
  const d = typeof days === "number" ? days : Math.max(1, Math.round((new Date(to) - new Date(from)) / (1000*60*60*24)) + 1);
  const row = {
    id: nextHolidayId(),
    staffId,
    requestedOn: todayISO(),
    from, to,
    days: d,
    status: "Pending",
    note,
    allowanceDays
  };
  HOLIDAYS.push(row);
  res.status(201).json(row);
});

// Approve/Reject
app.patch("/api/staff/holidays/:id", (req, res) => {
  const idx = HOLIDAYS.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const { status } = req.body || {};
  if (!["Pending", "Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be Pending | Approved | Rejected" });
  }
  HOLIDAYS[idx] = { ...HOLIDAYS[idx], status };
  res.json(HOLIDAYS[idx]);
});

/* ===================== Synthetic demo data: Viewings ===================== */
let VIEWINGS = [
  {
    id: "V001",
    childName: "Ava Example",
    parentName: "Alex Example",
    phone: "07700 900021",
    email: "alex@example.com",
    setting: "Teddington",
    date: "2025-09-05",
    time: "10:30",
    staff: "Morgan Example",
    source: "Website",
    status: "Booked", // Booked | Completed | No-show | Converted
    followUp: "",
    notes: "Prefers mornings.",
    createdAt: "2025-08-24T10:00:00Z",
    updatedAt: "2025-08-24T10:00:00Z",
  },
  {
    id: "V002",
    childName: "Noah Example",
    parentName: "Jordan Example",
    phone: "07700 900022",
    email: "jordan@example.com",
    setting: "Isleworth",
    date: "2025-08-20",
    time: "14:00",
    staff: "Jamie Example",
    source: "Phone",
    status: "Completed",
    followUp: "2025-08-25",
    notes: "Asked about SEN support.",
    createdAt: "2025-08-15T14:00:00Z",
    updatedAt: "2025-08-21T12:00:00Z",
  },
  {
    id: "V003",
    childName: "Mia Example",
    parentName: "Taylor Example",
    phone: "07700 900023",
    email: "taylor@example.com",
    setting: "Chiswick",
    date: "2025-08-19",
    time: "09:00",
    staff: "Morgan Example",
    source: "Walk-in",
    status: "No-show",
    followUp: "",
    notes: "",
    createdAt: "2025-08-12T09:00:00Z",
    updatedAt: "2025-08-19T10:00:00Z",
  },
];

function nextViewingId() {
  const n = (VIEWINGS.map(v => Number(v.id.slice(1)) || 0).sort((a,b)=>b-a)[0] || 0) + 1;
  return "V" + String(n).padStart(3, "0");
}

app.get("/api/viewings", (req, res) => {
  let { q = "", status = "", setting = "", from = "", to = "" } = req.query;
  let rows = [...VIEWINGS];

  if (from) rows = rows.filter(v => v.date >= from);
  if (to) rows = rows.filter(v => v.date <= to);
  if (status) rows = rows.filter(v => v.status === status);
  if (setting) rows = rows.filter(v => (v.setting || "").toLowerCase() === setting.toLowerCase());

  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(v =>
      (v.childName||"").toLowerCase().includes(s) ||
      (v.parentName||"").toLowerCase().includes(s) ||
      (v.email||"").toLowerCase().includes(s) ||
      (v.phone||"").toLowerCase().includes(s) ||
      (v.setting||"").toLowerCase().includes(s) ||
      v.id.toLowerCase().includes(s)
    );
  }

  rows.sort((a,b) => (a.date+b.time).localeCompare(b.date+b.time));
  res.json(rows);
});

app.get("/api/viewings/metrics", (req, res) => {
  const total = VIEWINGS.length;
  const upcoming = VIEWINGS.filter(v => v.status === "Booked" && v.date >= todayISO()).length;
  const completed = VIEWINGS.filter(v => v.status === "Completed").length;
  const noshow = VIEWINGS.filter(v => v.status === "No-show").length;
  const converted = VIEWINGS.filter(v => v.status === "Converted").length;
  res.json({
    total,
    upcoming,
    completed,
    noshow,
    converted,
    conversionRate: total ? Math.round((converted / total) * 100) : 0,
    noShowRate: total ? Math.round((noshow / total) * 100) : 0,
  });
});

app.post("/api/viewings", (req, res) => {
  const v = req.body || {};
  const now = new Date().toISOString();
  const row = {
    id: nextViewingId(),
    childName: v.childName || "",
    parentName: v.parentName || "",
    phone: v.phone || "",
    email: v.email || "",
    setting: v.setting || "",
    date: v.date || todayISO(),
    time: v.time || "10:00",
    staff: v.staff || "",
    source: v.source || "Website",
    status: v.status || "Booked",
    followUp: v.followUp || "",
    notes: v.notes || "",
    createdAt: now,
    updatedAt: now,
  };
  VIEWINGS.push(row);
  res.status(201).json(row);
});

app.patch("/api/viewings/:id", (req, res) => {
  const idx = VIEWINGS.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  VIEWINGS[idx] = { ...VIEWINGS[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json(VIEWINGS[idx]);
});

app.delete("/api/viewings/:id", (req, res) => {
  const idx = VIEWINGS.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  const [removed] = VIEWINGS.splice(idx, 1);
  res.json(removed);
});

/* ===================== OCCUPANCY API (for /Occupancy.jsx & Dashboard) ===================== */
const OCCUPANCY = {
  // month => { totalRegistered, statusCounts, rooms: [...] }
  [isoMonth()]: {
    totalRegistered: 100,
    statusCounts: { enrolled: 60, offered: 8, accepted: 5, waiting: 12 },
    rooms: [
      { id:"r1", name:"Baby", capacity:20, ages:"3–15m", Mon:50, Tue:100, Wed:100, Thu:100, Fri:50 },
      { id:"r2", name:"Toddlers", capacity:20, ages:"15m–21m", Mon:50, Tue:100, Wed:100, Thu:100, Fri:100 },
      { id:"r3", name:"2–3s", capacity:30, ages:"2–3y", Mon:80, Tue:85, Wed:90, Thu:88, Fri:84 },
      { id:"r4", name:"Preschool", capacity:30, ages:"3–5y", Mon:95, Tue:94, Wed:96, Thu:97, Fri:95 },
    ]
  }
};

app.get("/api/occupancy", (req, res) => {
  const month = req.query.month || isoMonth();
  const data = OCCUPANCY[month];
  if (!data) {
    // default fallback
    return res.json({ month, totalRegistered: 100, statusCounts: { enrolled:0, offered:0, accepted:0, waiting:0 }, rooms: [] });
  }
  res.json({ month, ...data });
});

app.put("/api/occupancy", (req, res) => {
  const { month = isoMonth(), totalRegistered = 0, statusCounts = {}, rooms = [] } = req.body || {};
  OCCUPANCY[month] = {
    totalRegistered: clamp(Number(totalRegistered) || 0, 0, 100000),
    statusCounts: {
      enrolled: clamp(Number(statusCounts.enrolled) || 0, 0, 100000),
      offered: clamp(Number(statusCounts.offered) || 0, 0, 100000),
      accepted: clamp(Number(statusCounts.accepted) || 0, 0, 100000),
      waiting: clamp(Number(statusCounts.waiting) || 0, 0, 100000),
    },
    rooms: Array.isArray(rooms) ? rooms.map(r => ({
      id: r.id || Math.random().toString(36).slice(2,8),
      name: r.name || "Room",
      capacity: clamp(Number(r.capacity) || 0, 0, 100000),
      ages: r.ages || "",
      Mon: clamp(Number(r.Mon) || 0, 0, 100), Tue: clamp(Number(r.Tue) || 0, 0, 100),
      Wed: clamp(Number(r.Wed) || 0, 0, 100), Thu: clamp(Number(r.Thu) || 0, 0, 100),
      Fri: clamp(Number(r.Fri) || 0, 0, 100),
    })) : []
  };
  res.json({ ok: true, month, ...OCCUPANCY[month] });
});

/* ===================== OFSTED / COMPLIANCE API ===================== */
// Fire Drills
let FIRE_DRILLS = [
  // { id:"FD001", date:"2025-06-02", time:"10:00", setting:"Teddington", lead:"Tash", signedBy:"Manager", notes:"AM session" }
];
let INCIDENTS = [
  // { id:"IN001", date:"2025-08-20", childName:"Nina", setting:"Feltham", type:"Injury", injury:"Bruise", actionTaken:"Cold compress", reportedToParent:true, status:"Logged", notes:"" }
];
let COMPLAINTS = [
  // { id:"CP001", date:"2025-08-10", parentName:"Will", setting:"Isleworth", subject:"Meals", status:"Investigating", responseDue:"2025-08-17", notes:"" }
];
let AUDITS = [
  // { id:"AU001", date:"2025-07-02", setting:"Chiswick", area:"H&S", rating:"Requires Action", actions:"Replace signage", actionsDue:"2025-07-20", status:"Open", notes:"" }
];

const nextId = (prefix, arr) => {
  const n = (arr.map(x => Number(String(x.id||"").replace(/\D+/g,"")) || 0).sort((a,b)=>b-a)[0] || 0) + 1;
  return prefix + String(n).padStart(3, "0");
};

function applyFilters(list, { q, setting, status, from, to }) {
  let rows = [...list];
  if (from) rows = rows.filter(r => (r.date || "") >= from);
  if (to) rows = rows.filter(r => (r.date || "") <= to);
  if (setting) rows = rows.filter(r => (r.setting || "").toLowerCase() === String(setting).toLowerCase());
  if (status) rows = rows.filter(r => (r.status || "").toLowerCase() === String(status).toLowerCase());
  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(s));
  }
  return rows;
}

/* ---- Fire Drills ---- */
app.get("/api/ofsted/fire-drills", (req, res) => {
  let { q="", setting="", from="", to="", limit="", sort="" } = req.query;
  let rows = applyFilters(FIRE_DRILLS, { q, setting, from, to });
  if (String(sort).toLowerCase() === "desc") rows.sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
  else rows.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  if (limit) rows = rows.slice(0, Number(limit) || 0);
  res.json(rows);
});

app.post("/api/ofsted/fire-drills", (req, res) => {
  const f = req.body || {};
  const row = {
    id: nextId("FD", FIRE_DRILLS),
    date: f.date || todayISO(),
    time: f.time || "10:00",
    setting: f.setting || "",
    lead: f.lead || "",
    signedBy: f.signedBy || "",
    notes: f.notes || ""
  };
  FIRE_DRILLS.push(row);
  res.status(201).json(row);
});

app.patch("/api/ofsted/fire-drills/:id", (req, res) => {
  const idx = FIRE_DRILLS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  FIRE_DRILLS[idx] = { ...FIRE_DRILLS[idx], ...req.body, id: FIRE_DRILLS[idx].id };
  res.json(FIRE_DRILLS[idx]);
});

app.delete("/api/ofsted/fire-drills/:id", (req, res) => {
  const idx = FIRE_DRILLS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  res.json(FIRE_DRILLS.splice(idx,1)[0]);
});

/* ---- Incidents ---- */
app.get("/api/ofsted/incidents", (req, res) => {
  const rows = applyFilters(INCIDENTS, req.query);
  rows.sort((a,b) => (a.date).localeCompare(b.date));
  res.json(rows);
});

app.post("/api/ofsted/incidents", (req, res) => {
  const f = req.body || {};
  const row = {
    id: nextId("IN", INCIDENTS),
    date: f.date || todayISO(),
    childName: f.childName || "",
    setting: f.setting || "",
    type: f.type || "Injury",
    injury: f.injury || "",
    actionTaken: f.actionTaken || "",
    reportedToParent: !!f.reportedToParent,
    status: f.status || "Logged",
    notes: f.notes || ""
  };
  INCIDENTS.push(row);
  res.status(201).json(row);
});

app.patch("/api/ofsted/incidents/:id", (req, res) => {
  const idx = INCIDENTS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  INCIDENTS[idx] = { ...INCIDENTS[idx], ...req.body, id: INCIDENTS[idx].id };
  res.json(INCIDENTS[idx]);
});

app.delete("/api/ofsted/incidents/:id", (req, res) => {
  const idx = INCIDENTS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  res.json(INCIDENTS.splice(idx,1)[0]);
});

/* ---- Complaints ---- */
app.get("/api/ofsted/complaints", (req, res) => {
  const rows = applyFilters(COMPLAINTS, req.query);
  rows.sort((a,b) => (a.date).localeCompare(b.date));
  res.json(rows);
});

app.post("/api/ofsted/complaints", (req, res) => {
  const f = req.body || {};
  const row = {
    id: nextId("CP", COMPLAINTS),
    date: f.date || todayISO(),
    parentName: f.parentName || "",
    setting: f.setting || "",
    subject: f.subject || "",
    status: f.status || "Logged",
    responseDue: f.responseDue || "",
    notes: f.notes || ""
  };
  COMPLAINTS.push(row);
  res.status(201).json(row);
});

app.patch("/api/ofsted/complaints/:id", (req, res) => {
  const idx = COMPLAINTS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  COMPLAINTS[idx] = { ...COMPLAINTS[idx], ...req.body, id: COMPLAINTS[idx].id };
  res.json(COMPLAINTS[idx]);
});

app.delete("/api/ofsted/complaints/:id", (req, res) => {
  const idx = COMPLAINTS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  res.json(COMPLAINTS.splice(idx,1)[0]);
});

/* ---- Audits ---- */
app.get("/api/ofsted/audits", (req, res) => {
  const rows = applyFilters(AUDITS, req.query);
  rows.sort((a,b) => (a.date).localeCompare(b.date));
  res.json(rows);
});

app.post("/api/ofsted/audits", (req, res) => {
  const f = req.body || {};
  const row = {
    id: nextId("AU", AUDITS),
    date: f.date || todayISO(),
    setting: f.setting || "",
    area: f.area || "",
    rating: f.rating || "Good",
    actions: f.actions || "",
    actionsDue: f.actionsDue || "",
    status: f.status || "Open",
    notes: f.notes || ""
  };
  AUDITS.push(row);
  res.status(201).json(row);
});

app.patch("/api/ofsted/audits/:id", (req, res) => {
  const idx = AUDITS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  AUDITS[idx] = { ...AUDITS[idx], ...req.body, id: AUDITS[idx].id };
  res.json(AUDITS[idx]);
});

app.delete("/api/ofsted/audits/:id", (req, res) => {
  const idx = AUDITS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  res.json(AUDITS.splice(idx,1)[0]);
});

/* ===================== FACILITIES API (lightweight) ===================== */
// Assets
let FAC_ASSETS = [
  // { id:"F001", name:"CCTV", type:"Security", location:"Teddington", purchased:"2023-05-01", status:"Operational", notes:"" }
];
// Maintenance tickets
let FAC_TICKETS = [
  // { id:"M001", assetId:"F001", title:"Replace camera 2", opened:"2025-08-20", status:"Open", priority:"High", due:"2025-08-28", notes:"" }
];

const nextFacId = (prefix, arr) => {
  const n = (arr.map(x => Number(String(x.id||"").replace(/\D+/g,"")) || 0).sort((a,b)=>b-a)[0] || 0) + 1;
  return prefix + String(n).padStart(3, "0");
};

app.get("/api/facilities/assets", (req, res) => {
  const { q="", type="", status="", location="" } = req.query;
  let rows = [...FAC_ASSETS];
  if (type) rows = rows.filter(a => (a.type||"").toLowerCase() === type.toLowerCase());
  if (status) rows = rows.filter(a => (a.status||"").toLowerCase() === status.toLowerCase());
  if (location) rows = rows.filter(a => (a.location||"").toLowerCase() === location.toLowerCase());
  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(a => JSON.stringify(a).toLowerCase().includes(s));
  }
  res.json(rows);
});

app.post("/api/facilities/assets", (req, res) => {
  const f = req.body || {};
  const row = {
    id: nextFacId("F", FAC_ASSETS),
    name: f.name || "Asset",
    type: f.type || "",
    location: f.location || "",
    purchased: f.purchased || "",
    status: f.status || "Operational",
    notes: f.notes || ""
  };
  FAC_ASSETS.push(row);
  res.status(201).json(row);
});

app.patch("/api/facilities/assets/:id", (req, res) => {
  const idx = FAC_ASSETS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  FAC_ASSETS[idx] = { ...FAC_ASSETS[idx], ...req.body, id: FAC_ASSETS[idx].id };
  res.json(FAC_ASSETS[idx]);
});

app.delete("/api/facilities/assets/:id", (req, res) => {
  const idx = FAC_ASSETS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  res.json(FAC_ASSETS.splice(idx,1)[0]);
});

app.get("/api/facilities/tickets", (req, res) => {
  const { q="", status="", priority="", assetId="" } = req.query;
  let rows = [...FAC_TICKETS];
  if (status) rows = rows.filter(t => (t.status||"").toLowerCase() === status.toLowerCase());
  if (priority) rows = rows.filter(t => (t.priority||"").toLowerCase() === priority.toLowerCase());
  if (assetId) rows = rows.filter(t => t.assetId === assetId);
  if (q) {
    const s = q.toLowerCase();
    rows = rows.filter(t => JSON.stringify(t).toLowerCase().includes(s));
  }
  rows.sort((a,b) => (a.opened || "").localeCompare(b.opened || ""));
  res.json(rows);
});

app.post("/api/facilities/tickets", (req, res) => {
  const f = req.body || {};
  const row = {
    id: nextFacId("M", FAC_TICKETS),
    assetId: f.assetId || "",
    title: f.title || "",
    opened: f.opened || todayISO(),
    status: f.status || "Open",
    priority: f.priority || "Medium",
    due: f.due || "",
    notes: f.notes || ""
  };
  FAC_TICKETS.push(row);
  res.status(201).json(row);
});

app.patch("/api/facilities/tickets/:id", (req, res) => {
  const idx = FAC_TICKETS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  FAC_TICKETS[idx] = { ...FAC_TICKETS[idx], ...req.body, id: FAC_TICKETS[idx].id };
  res.json(FAC_TICKETS[idx]);
});

app.delete("/api/facilities/tickets/:id", (req, res) => {
  const idx = FAC_TICKETS.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  res.json(FAC_TICKETS.splice(idx,1)[0]);
});

app.get("/api/facilities/summary", (req, res) => {
  const totalAssets = FAC_ASSETS.length;
  const openTickets = FAC_TICKETS.filter(t => t.status !== "Closed").length;
  const highPrio = FAC_TICKETS.filter(t => (t.priority||"").toLowerCase() === "high" && t.status !== "Closed").length;
  res.json({ totalAssets, openTickets, highPrio });
});

/* ---------------- start server ---------------- */
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
