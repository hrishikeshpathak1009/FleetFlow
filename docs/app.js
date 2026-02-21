const state = {
  token: localStorage.getItem("ff_token") || "",
  user: JSON.parse(localStorage.getItem("ff_user") || "null"),
};

const qs = new URLSearchParams(window.location.search);
const apiBaseFromQuery = qs.get("apiBase");
if (apiBaseFromQuery) localStorage.setItem("ff_api_base", apiBaseFromQuery);

const API_BASE_URL = (
  window.FLEETFLOW_API_BASE ||
  apiBaseFromQuery ||
  localStorage.getItem("ff_api_base") ||
  ""
).replace(/\/$/, "");

const page = document.body.dataset.page || "";

function byId(id) {
  return document.getElementById(id);
}

function setMsg(id, text, error = false) {
  const el = byId(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("error", error);
}

function fmtDate(v) {
  if (!v) return "-";
  return new Date(v).toLocaleString();
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTable(containerId, headers, rows) {
  const container = byId(containerId);
  if (!container) return;
  const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = rows.length
    ? `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("")}</tbody>`
    : `<tbody><tr><td colspan="${headers.length}">No data</td></tr></tbody>`;
  container.innerHTML = `<table>${thead}${tbody}</table>`;
}

function ensureApiBaseOnGithubPages() {
  const hostedOnGithubPages = window.location.hostname.endsWith("github.io");
  if (hostedOnGithubPages && !API_BASE_URL) {
    throw new Error(
      "Set backend URL first. Use ?apiBase=https://YOUR_API_HOST in page URL."
    );
  }
}

async function api(path, options = {}) {
  ensureApiBaseOnGithubPages();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload?.error?.message || `Request failed (${res.status})`);
  }
  return payload;
}

function logout() {
  localStorage.removeItem("ff_token");
  localStorage.removeItem("ff_user");
  state.token = "";
  state.user = null;
  window.location.href = "./index.html";
}

function wireCommonUi() {
  document.querySelectorAll(".js-user-role").forEach((el) => {
    el.textContent = state.user?.role || "guest";
  });
  document.querySelectorAll(".js-user-name").forEach((el) => {
    el.textContent = state.user?.name || "Guest";
  });
  document.querySelectorAll(".js-api-base").forEach((el) => {
    el.textContent = API_BASE_URL || "same-origin";
  });

  document.querySelectorAll(".js-logout").forEach((btn) => {
    btn.addEventListener("click", logout);
  });
}

function requireAuth() {
  if (!state.token || !state.user) {
    window.location.href = "./index.html";
    return false;
  }
  return true;
}

async function initLoginPage() {
  const form = byId("loginForm");
  const apiInput = byId("apiBase");

  if (apiInput && API_BASE_URL) apiInput.value = API_BASE_URL;

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const customApi = apiInput?.value?.trim();
      if (customApi) localStorage.setItem("ff_api_base", customApi.replace(/\/$/, ""));

      setMsg("loginMsg", "Signing in...");
      const email = byId("email").value.trim();
      const password = byId("password").value;

      const base = customApi || API_BASE_URL;
      const response = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || `Request failed (${response.status})`);

      state.token = payload.data.token;
      state.user = payload.data.user;
      localStorage.setItem("ff_token", state.token);
      localStorage.setItem("ff_user", JSON.stringify(state.user));

      window.location.href = "./dashboard.html";
    } catch (err) {
      setMsg("loginMsg", err.message, true);
    }
  });
}

async function initDashboardPage() {
  setMsg("dashboardMsg", "Loading command center...");
  const [kpis, dash, vehicles, trips] = await Promise.all([
    api("/api/vehicles/kpis").catch(() => ({ data: {} })),
    api("/api/analytics/dashboard").catch(() => ({ data: {} })),
    api("/api/vehicles").catch(() => ({ data: [] })),
    api("/api/trips").catch(() => ({ data: [] })),
  ]);

  const cards = [
    ["Active Fleet", dash.data.activeFleet ?? kpis.data.active ?? 0],
    ["Maintenance Alerts", dash.data.maintenanceAlerts ?? kpis.data.inShop ?? 0],
    ["Utilization Rate", `${dash.data.utilizationRate ?? 0}%`],
    ["Pending Cargo", dash.data.pendingCargo ?? 0],
  ];

  byId("kpiCards").innerHTML = cards
    .map(([name, value]) => `<div class="card"><small>${name}</small><strong>${value}</strong></div>`)
    .join("");

  renderTable(
    "liveFleetTable",
    ["Vehicle", "Plate", "Status", "Region", "Odometer"],
    (vehicles.data || []).slice(0, 8).map((v) => [
      `${escapeHtml(v.name)} ${escapeHtml(v.model)}`,
      escapeHtml(v.plate),
      `<span class="badge">${escapeHtml(v.status)}</span>`,
      escapeHtml(v.region || "-"),
      fmtNum(v.odometerKm ?? v.mileage),
    ])
  );

  renderTable(
    "recentTripsTable",
    ["Trip", "Route", "Status", "Scheduled"],
    (trips.data || []).slice(0, 8).map((t) => [
      escapeHtml(t.id),
      `${escapeHtml(t.origin)} -> ${escapeHtml(t.destination)}`,
      `<span class="badge">${escapeHtml(t.status)}</span>`,
      fmtDate(t.scheduledAt),
    ])
  );

  setMsg("dashboardMsg", "Command center refreshed.");
}

async function initVehiclesPage() {
  async function reload() {
    const res = await api("/api/vehicles");
    renderTable(
      "vehiclesTable",
      ["ID", "Vehicle", "Plate", "Type", "Capacity", "Status", "Region", "Odometer"],
      (res.data || []).map((v) => [
        escapeHtml(v.id),
        `${escapeHtml(v.name || "-")} ${escapeHtml(v.model || "")}`.trim(),
        escapeHtml(v.plate),
        escapeHtml(v.vehicleType || "-") ,
        fmtNum(v.maxLoadKg),
        `<span class="badge">${escapeHtml(v.status)}</span>`,
        escapeHtml(v.region || "-"),
        fmtNum(v.odometerKm ?? v.mileage),
      ])
    );
  }

  byId("vehicleForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/vehicles", {
        method: "POST",
        body: JSON.stringify({
          name: byId("name").value.trim(),
          model: byId("model").value.trim(),
          plate: byId("plate").value.trim(),
          vehicleType: byId("vehicleType").value,
          maxLoadKg: Number(byId("maxLoadKg").value),
          odometerKm: Number(byId("odometerKm").value),
          region: byId("region").value.trim(),
          acquisitionCost: Number(byId("acquisitionCost").value || 0),
        }),
      });
      byId("vehicleForm").reset();
      await reload();
      setMsg("vehiclesMsg", "Vehicle created.");
    } catch (err) {
      setMsg("vehiclesMsg", err.message, true);
    }
  });

  await reload();
}

async function initDispatchPage() {
  async function loadPool() {
    const pool = await api("/api/dispatch/available");
    renderTable(
      "poolVehicles",
      ["Vehicle", "Plate", "Type", "Capacity"],
      (pool.data.vehicles || []).map((v) => [
        `${escapeHtml(v.name)} ${escapeHtml(v.model)}`,
        escapeHtml(v.plate),
        escapeHtml(v.vehicleType),
        fmtNum(v.maxLoadKg),
      ])
    );
    renderTable(
      "poolDrivers",
      ["Driver", "License", "Category", "Expiry"],
      (pool.data.drivers || []).map((d) => [
        escapeHtml(d.name),
        escapeHtml(d.licenseNumber),
        escapeHtml(d.licenseCategory),
        fmtDate(d.licenseExpiresAt),
      ])
    );
  }

  async function loadTrips() {
    const res = await api("/api/trips");
    renderTable(
      "dispatchTrips",
      ["Trip", "Vehicle", "Driver", "Load", "Status", "Action"],
      (res.data || []).map((t) => [
        escapeHtml(t.id),
        escapeHtml(t.vehicleId),
        escapeHtml(t.driverId),
        fmtNum(t.cargoWeightKg),
        `<span class="badge">${escapeHtml(t.status)}</span>`,
        t.status === "planned"
          ? `<button class="btn btn-muted js-dispatch" data-id="${escapeHtml(t.id)}">Dispatch</button>`
          : "-",
      ])
    );
  }

  byId("tripDraftForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: byId("dVehicle").value.trim(),
          driverId: byId("dDriver").value.trim(),
          cargoWeightKg: Number(byId("dWeight").value),
          origin: byId("dOrigin").value.trim(),
          destination: byId("dDest").value.trim(),
          scheduledAt: new Date(byId("dWhen").value).toISOString(),
        }),
      });
      byId("tripDraftForm").reset();
      await Promise.all([loadPool(), loadTrips()]);
      setMsg("dispatchMsg", "Draft trip created.");
    } catch (err) {
      setMsg("dispatchMsg", err.message, true);
    }
  });

  byId("dispatchTrips")?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.classList.contains("js-dispatch")) return;
    try {
      await api(`/api/trips/${target.dataset.id}/dispatch`, { method: "POST" });
      await Promise.all([loadPool(), loadTrips()]);
      setMsg("dispatchMsg", "Trip dispatched.");
    } catch (err) {
      setMsg("dispatchMsg", err.message, true);
    }
  });

  await Promise.all([loadPool(), loadTrips()]);
}

async function initMaintenancePage() {
  async function loadInShop() {
    const res = await api("/api/vehicles/in-shop");
    renderTable(
      "inShopTable",
      ["Vehicle ID", "Status", "Plate", "Action"],
      (res.data || []).map((v) => [
        escapeHtml(v.id),
        `<span class="badge">${escapeHtml(v.status)}</span>`,
        escapeHtml(v.plate),
        `<button class="btn btn-muted js-load-logs" data-vid="${escapeHtml(v.id)}">Open Logs</button>`,
      ])
    );
  }

  byId("maintForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const vid = byId("mVehicleId").value.trim();
      await api(`/api/vehicles/${vid}/maintenance`, {
        method: "POST",
        body: JSON.stringify({
          note: byId("mNote").value.trim(),
          cost: Number(byId("mCost").value || 0),
        }),
      });
      byId("maintForm").reset();
      await loadInShop();
      setMsg("maintenanceMsg", "Maintenance log created and vehicle moved to In Shop.");
    } catch (err) {
      setMsg("maintenanceMsg", err.message, true);
    }
  });

  byId("completeForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api(`/api/vehicles/${byId("cVehicleId").value.trim()}/maintenance/${byId("cLogId").value.trim()}/complete`, {
        method: "PATCH",
      });
      await loadInShop();
      setMsg("maintenanceMsg", "Maintenance completed.");
    } catch (err) {
      setMsg("maintenanceMsg", err.message, true);
    }
  });

  await loadInShop();
}

async function initExpensesPage() {
  async function reload() {
    const res = await api("/api/expenses");
    renderTable(
      "expensesTable",
      ["Type", "Vehicle", "Trip", "Amount", "Date", "Notes"],
      (res.data || []).map((e) => [
        escapeHtml(e.type),
        escapeHtml(e.vehicleId),
        escapeHtml(e.tripId || "-"),
        `$${Number(e.amount || 0).toFixed(2)}`,
        fmtDate(e.date),
        escapeHtml(e.notes || "-"),
      ])
    );
    byId("expenseTotal").textContent = `$${Number(res.meta?.totalAmount || 0).toFixed(2)}`;
  }

  byId("fuelForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api(`/api/trips/${byId("fTripId").value.trim()}/fuel-log`, {
        method: "POST",
        body: JSON.stringify({
          liters: Number(byId("fLiters").value),
          cost: Number(byId("fCost").value),
        }),
      });
      byId("fuelForm").reset();
      await reload();
      setMsg("expensesMsg", "Fuel log recorded.");
    } catch (err) {
      setMsg("expensesMsg", err.message, true);
    }
  });

  await reload();
}

async function initDriversPage() {
  async function reload() {
    const [drivers, expiring] = await Promise.all([
      api("/api/drivers"),
      api("/api/drivers/expiring-licences").catch(() => ({ data: [] })),
    ]);

    renderTable(
      "driversTable",
      ["ID", "Name", "License", "Category", "Expiry", "Status", "Safety"],
      (drivers.data || []).map((d) => [
        escapeHtml(d.id),
        escapeHtml(d.name),
        escapeHtml(d.licenseNumber),
        escapeHtml(d.licenseCategory),
        fmtDate(d.licenseExpiresAt),
        `<span class="badge">${escapeHtml(d.status)}</span>`,
        `${fmtNum(d.safetyScore)} / 100`,
      ])
    );

    byId("expiringList").innerHTML = (expiring.data || []).length
      ? (expiring.data || [])
          .map((d) => `<span class="pill">${escapeHtml(d.name)} · ${fmtDate(d.licenseExpiresAt)}</span>`)
          .join(" ")
      : "<span class='pill'>No upcoming expirations</span>";
  }

  byId("driverUpdateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api(`/api/drivers/${byId("uDriverId").value.trim()}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: byId("uStatus").value,
          licenseCategory: byId("uCategory").value,
          safetyScore: Number(byId("uScore").value),
          licenseExpiresAt: new Date(byId("uExpiry").value).toISOString(),
        }),
      });
      await reload();
      setMsg("driversMsg", "Driver profile updated.");
    } catch (err) {
      setMsg("driversMsg", err.message, true);
    }
  });

  await reload();
}

async function initAnalyticsPage() {
  const [dash, finance] = await Promise.all([
    api("/api/analytics/dashboard"),
    api("/api/analytics/finance"),
  ]);

  const cards = [
    ["Active Fleet", dash.data.activeFleet],
    ["Maintenance Alerts", dash.data.maintenanceAlerts],
    ["Utilization", `${dash.data.utilizationRate}%`],
    ["Pending Cargo", dash.data.pendingCargo],
  ];

  byId("analyticsKpis").innerHTML = cards
    .map(([n, v]) => `<div class='card'><small>${n}</small><strong>${v}</strong></div>`)
    .join("");

  renderTable(
    "financeTable",
    ["Vehicle", "Fuel Cost", "Maint. Cost", "Total Opex", "Fuel Eff. km/L", "ROI"],
    (finance.data || []).map((x) => [
      `${escapeHtml(x.name || "")} ${escapeHtml(x.model || "")}`.trim(),
      `$${Number(x.fuelCost || 0).toFixed(2)}`,
      `$${Number(x.maintenanceCost || 0).toFixed(2)}`,
      `$${Number(x.totalOperationalCost || 0).toFixed(2)}`,
      x.fuelEfficiencyKmPerL == null ? "-" : Number(x.fuelEfficiencyKmPerL).toFixed(2),
      x.roi == null ? "N/A" : Number(x.roi).toFixed(3),
    ])
  );
}

async function initReportsPage() {
  async function load() {
    const [expensesRes, financeRes] = await Promise.all([
      api("/api/expenses"),
      api("/api/analytics/finance"),
    ]);

    const monthly = (expensesRes.data || []).reduce((acc, item) => {
      const key = new Date(item.date).toISOString().slice(0, 7);
      acc[key] = (acc[key] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

    renderTable(
      "monthlyTable",
      ["Month", "Total Expense"],
      Object.entries(monthly)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, total]) => [escapeHtml(month), `$${Number(total).toFixed(2)}`])
    );

    renderTable(
      "roiTable",
      ["Vehicle", "Revenue", "Operational Cost", "ROI"],
      (financeRes.data || []).map((x) => [
        `${escapeHtml(x.name || "")} ${escapeHtml(x.model || "")}`.trim(),
        `$${Number(x.revenue || 0).toFixed(2)}`,
        `$${Number(x.totalOperationalCost || 0).toFixed(2)}`,
        x.roi == null ? "N/A" : Number(x.roi).toFixed(3),
      ])
    );

    byId("reportMsg").textContent = "Reports generated from live API data.";

    byId("downloadCsv")?.addEventListener("click", () => {
      const rows = [["vehicle", "revenue", "operational_cost", "roi"]].concat(
        (financeRes.data || []).map((x) => [x.vehicleId, x.revenue, x.totalOperationalCost, x.roi ?? ""])
      );
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "fleetflow-finance-report.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    byId("printPdf")?.addEventListener("click", () => window.print());
  }

  await load();
}

function wirePage() {
  if (page !== "login" && !requireAuth()) return;
  wireCommonUi();

  const handlers = {
    login: initLoginPage,
    dashboard: initDashboardPage,
    vehicles: initVehiclesPage,
    dispatch: initDispatchPage,
    maintenance: initMaintenancePage,
    expenses: initExpensesPage,
    drivers: initDriversPage,
    analytics: initAnalyticsPage,
    reports: initReportsPage,
  };

  const fn = handlers[page];
  if (!fn) return;

  fn().catch((err) => {
    const fallback = byId("pageMsg") || byId(`${page}Msg`) || byId("loginMsg");
    if (fallback) {
      fallback.textContent = err.message;
      fallback.classList.add("error");
    }
  });
}

wirePage();
