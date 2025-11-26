// dashboard-reports.js
// Lógica del panel maestro del Reloj Causal Humano — TCDS

const elsDash = {
  kpiLI: document.getElementById("kpiLI"),
  kpiR: document.getElementById("kpiR"),
  kpiRMSE: document.getElementById("kpiRMSE"),
  kpiDH: document.getElementById("kpiDH"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  logSummary: document.getElementById("logSummary"),
  nodeCount: document.getElementById("nodeCount"),
  qCount: document.getElementById("qCount"),
  btnDemo: document.getElementById("btnDemo"),
  btnReset: document.getElementById("btnReset")
};

let chart;
let autoRefreshId = null;

function initChart() {
  const ctx = document.getElementById("chartSigma").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "LI",      data: [], borderWidth: 1.5, tension: 0.25 },
        { label: "R",       data: [], borderWidth: 1.5, tension: 0.25 },
        { label: "RMSE_SL", data: [], borderWidth: 1.5, borderDash: [4,4], tension: 0.25 },
        { label: "ΔH",      data: [], borderWidth: 1.5, borderDash: [2,3], tension: 0.2 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e5e7f3", font: { size: 11 } }
        }
      },
      scales: {
        x: {
          ticks: { color: "#9aa3c2", maxRotation: 0 },
          grid: { color: "rgba(148,163,184,0.18)" }
        },
        y: {
          ticks: { color: "#9aa3c2" },
          grid: { color: "rgba(148,163,184,0.18)" }
        }
      }
    }
  });
}

function updateStatusSummary(stats) {
  const { counts, averages } = stats;
  const total = counts.phi + counts.borderline + counts.q;

  elsDash.statusDot.classList.remove("phi", "borderline", "q");

  if (!total) {
    elsDash.statusDot.classList.add("phi");
    elsDash.statusText.textContent =
      "Interpretación E-Veto: sin datos aún (esperando reportes de nodos).";
    elsDash.logSummary.textContent =
      "Todavía no hay eventos registrados en el backend. A medida que los nodos móviles envíen ventanas Σ+ΔH, este panel mostrará su distribución φ-driven / borderline / Q-driven.";
    return;
  }

  const pctPhi = (counts.phi / total * 100).toFixed(1);
  const pctBorder = (counts.borderline / total * 100).toFixed(1);
  const pctQ = (counts.q / total * 100).toFixed(1);

  let mode = "phi";
  if (counts.q > counts.phi && counts.q > counts.borderline) mode = "q";
  else if (counts.borderline >= counts.phi && counts.borderline >= counts.q) mode = "borderline";

  elsDash.statusDot.classList.add(
    mode === "phi" ? "phi" : mode === "q" ? "q" : "borderline"
  );

  if (mode === "phi") {
    elsDash.statusText.textContent =
      `Interpretación E-Veto: lapso mayormente φ-driven (ruido estructural). Q-driven ≈ ${pctQ}% de ventanas.`;
  } else if (mode === "borderline") {
    elsDash.statusText.textContent =
      `Interpretación E-Veto: régimen borderline entre ruido y coherencia. Q-driven ≈ ${pctQ}% de ventanas.`;
  } else {
    elsDash.statusText.textContent =
      `Interpretación E-Veto: régimen con fracción significativa Q-driven (~${pctQ}% de ventanas coherentes).`;
  }

  elsDash.logSummary.textContent =
    `Distribución actual: ${pctPhi}% φ-driven, ${pctBorder}% borderline y ${pctQ}% Q-driven. ` +
    `Estos porcentajes se basan en las ventanas Σ+ΔH reportadas por los nodos del Reloj Causal Humano.`;
}

function updateChart(latest_raw) {
  const labels = [];
  const liData = [];
  const rData = [];
  const rmseData = [];
  const dhData = [];

  latest_raw.forEach((e, idx) => {
    const label = e.ts ? e.ts.slice(11, 19) : `#${idx}`;
    labels.push(label);
    liData.push(typeof e.li === "number" ? e.li : null);
    rData.push(typeof e.r === "number" ? e.r : null);
    rmseData.push(typeof e.rmse_sl === "number" ? e.rmse_sl : null);
    dhData.push(typeof e.dh === "number" ? e.dh : null);
  });

  chart.data.labels = labels;
  chart.data.datasets[0].data = liData;
  chart.data.datasets[1].data = rData;
  chart.data.datasets[2].data = rmseData;
  chart.data.datasets[3].data = dhData;
  chart.update();
}

function updateKPIsAndCounts(stats, active_nodes) {
  const { averages, counts } = stats;

  if (averages.li != null) elsDash.kpiLI.textContent = averages.li.toFixed(2);
  if (averages.r != null)  elsDash.kpiR.textContent  = averages.r.toFixed(2);
  if (averages.rmse_sl != null) elsDash.kpiRMSE.textContent = averages.rmse_sl.toFixed(2);
  if (averages.dh != null) elsDash.kpiDH.textContent = averages.dh.toFixed(2);

  const totalWindows = counts.phi + counts.borderline + counts.q;
  elsDash.nodeCount.textContent = active_nodes != null ? active_nodes.toString() : totalWindows.toString();
  elsDash.qCount.textContent = counts.q.toString();
}

async function fetchAndRender() {
  try {
    const resp = await fetch("/api/reports");
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    const data = await resp.json();

    if (!data || !data.stats) {
      console.warn("[TCDS] Respuesta /api/reports sin stats:", data);
      return;
    }

    updateKPIsAndCounts(data.stats, data.active_nodes);
    updateStatusSummary(data.stats);
    updateChart(data.latest_raw || []);
  } catch (e) {
    console.warn("[TCDS] Error al leer /api/reports:", e);
    elsDash.statusText.textContent =
      "No se pudo actualizar desde el backend. Verifica la función /api/reports.";
  }
}

function startAutoRefresh(intervalMs = 8000) {
  if (autoRefreshId) clearInterval(autoRefreshId);
  autoRefreshId = setInterval(fetchAndRender, intervalMs);
}

function stopAutoRefresh() {
  if (autoRefreshId) clearInterval(autoRefreshId);
  autoRefreshId = null;
}

function hookButtons() {
  elsDash.btnDemo.addEventListener("click", () => {
    fetchAndRender();
    startAutoRefresh();
  });

  elsDash.btnReset.addEventListener("click", () => {
    stopAutoRefresh();
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets.forEach(d => d.data = []);
      chart.update();
    }
    elsDash.nodeCount.textContent = "0";
    elsDash.qCount.textContent = "0";
    elsDash.statusText.textContent =
      "Dashboard reseteado. Pulsa “Iniciar demo sintética” para recargar desde /api/reports.";
    elsDash.logSummary.textContent =
      "Sin muestras activas. Este panel refleja la coherencia agregada una vez que los nodos reportan.";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initChart();
  hookButtons();
  // Si quieres que arranque solo:
  // fetchAndRender();
  // startAutoRefresh();
});
