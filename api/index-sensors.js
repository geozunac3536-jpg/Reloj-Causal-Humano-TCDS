// index-sensor.js
// Lógica de front para el Reloj Causal Humano — TCDS (nodo local)

const els = {
  btn: document.getElementById("activateBtn"),
  status: document.getElementById("statusLabel"),
  li: document.getElementById("liVal"),
  r: document.getElementById("rVal"),
  rmse: document.getElementById("rmseVal"),
  dh: document.getElementById("dhVal"),
  tc: document.getElementById("tcValue"),
  tcMode: document.getElementById("tcMode"),
};

let config = null;
let sensorActive = false;
let lastSampleTime = 0;
let windowSamples = [];

// 1) Cargar configuración global del backend
async function loadConfig() {
  try {
    const resp = await fetch("/api/config");
    if (!resp.ok) throw new Error("Config HTTP " + resp.status);
    const json = await resp.json();
    config = json.config || {};
    console.log("[TCDS] Config cargada:", config);
  } catch (e) {
    console.warn("[TCDS] No se pudo cargar /api/config, usando defaults.", e);
    config = {
      mode_hint: "auto",
      report_interval_ms: 5000,
      alerts_enabled: true,
      version: "1.5.0",
    };
  }
}

// 2) Clasificar ventana con la misma lógica del backend
function classifyWindow(li, r, rmse, dh) {
  const li_min = 0.9;
  const r_min = 0.95;
  const rmse_max = 0.10;
  const dh_max = -0.20;

  const kpiOk = li >= li_min && r > r_min && rmse < rmse_max;
  const entropyOk = dh <= dh_max;

  if (!kpiOk && !entropyOk) return "phi";
  if (kpiOk && entropyOk) return "q";
  return "borderline";
}

// 3) Actualizar UI local con una ventana Σ
function updateUI(sample) {
  const { li, r, rmse_sl, dh, t_c } = sample;

  if (typeof li === "number") els.li.textContent = li.toFixed(2);
  if (typeof r === "number") els.r.textContent = r.toFixed(2);
  if (typeof rmse_sl === "number") els.rmse.textContent = rmse_sl.toFixed(2);
  if (typeof dh === "number") els.dh.textContent = dh.toFixed(2);

  if (typeof t_c === "number") {
    els.tc.textContent = (t_c >= 0 ? "+" : "") + t_c.toFixed(3);
  }

  const cls = classifyWindow(li, r, rmse_sl, dh);
  if (cls === "phi") {
    els.tcMode.textContent = "LAPSO φ-driven (ruido / baseline)";
  } else if (cls === "borderline") {
    els.tcMode.textContent = "Zona borderline (transición φ ↔ Q)";
  } else {
    els.tcMode.textContent = "Candidata Q-driven (coherencia Σ + ΔH)";
  }

  els.status.textContent = `ventana local: ${cls}`;
}

// 4) Enviar ventana al backend
async function sendReport(sample) {
  try {
    const resp = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
    });
    const json = await resp.json();
    console.log("[TCDS] Reporte enviado, clase E-Veto:", json.class);
  } catch (e) {
    console.warn("[TCDS] Error enviando reporte a /api/reports:", e);
  }
}

// 5) Procesar una muestra cruda del sensor -> construir ventana Σ de ejemplo
function processRawSample(acc, timestamp) {
  windowSamples.push({ acc, timestamp });

  // Usamos tamaño de ventana por tiempo (ej: 5s)
  const now = timestamp;
  if (!lastSampleTime) lastSampleTime = now;

  const interval = (config && config.report_interval_ms) || 5000;
  const elapsed = now - lastSampleTime;
  if (elapsed < interval) return;

  lastSampleTime = now;

  // ======== AQUÍ VA TU CÁLCULO REAL DE Σ-METRICS ========
  // Esto es una aproximación dummy: usa varianza/energía como proxy.
  const n = windowSamples.length;
  if (!n) return;

  let sumMag = 0;
  let sumMag2 = 0;
  for (const s of windowSamples) {
    const m = Math.sqrt(
      s.acc.x * s.acc.x +
      s.acc.y * s.acc.y +
      s.acc.z * s.acc.z
    );
    sumMag += m;
    sumMag2 += m * m;
  }
  const mean = sumMag / n;
  const variance = sumMag2 / n - mean * mean;
  const std = Math.sqrt(Math.max(variance, 0));

  // A partir de aquí solo es demo:
  const li = Math.max(0, Math.min(1, 1 - std / 3));       // locking ~ inverso de la dispersión
  const r = Math.max(0, Math.min(1, 0.9 + (Math.random() * 0.1))); // demo
  const rmse_sl = Math.max(0, Math.min(0.3, std / 10));   // demo
  const dh = -0.25 + (Math.random() - 0.5) * 0.2;         // demo ΔH
  const t_c = (Math.random() - 0.5) * 0.08;               // demo tC

  const sample = {
    node_id: "browser-mobile",
    region: "desconocida",
    li,
    r,
    rmse_sl,
    dh,
    t_c,
    ts: new Date().toISOString(),
    meta: {
      n_samples: n,
      mean_acc: mean,
    },
  };

  // Limpiar ventana
  windowSamples = [];

  // Actualizar UI + enviar al backend
  updateUI(sample);
  sendReport(sample);
}

// 6) Manejar sensores de movimiento (Android/iOS)
function attachDeviceMotion() {
  function handler(event) {
    if (!sensorActive) return;
    if (!event.accelerationIncludingGravity) return;
    const acc = event.accelerationIncludingGravity;
    processRawSample(
      { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 },
      performance.now()
    );
  }
  window.addEventListener("devicemotion", handler);
}

// 7) Gestionar permisos (iOS necesita requestPermission)
async function requestSensorPermission() {
  els.status.textContent = "Solictando permiso de sensor…";

  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    // iOS
    try {
      const res = await DeviceMotionEvent.requestPermission();
      if (res === "granted") {
        sensorActive = true;
        els.status.textContent = "Sensor activo (iOS). Nodo enviando ventanas Σ.";
      } else {
        els.status.textContent = "Permiso de sensor denegado (iOS).";
      }
    } catch (e) {
      console.error(e);
      els.status.textContent = "Error al solicitar permiso de sensor (iOS).";
    }
  } else {
    // Android / otros
    sensorActive = true;
    els.status.textContent = "Sensor activo (modo estándar). Nodo enviando ventanas Σ.";
  }
}

// 8) Inicializar flujo
async function init() {
  await loadConfig();
  attachDeviceMotion();

  els.btn.addEventListener("click", async () => {
    if (sensorActive) {
      sensorActive = false;
      els.status.textContent = "Sensor pausado. Toca nuevamente para reanudar.";
      return;
    }
    await requestSensorPermission();
  });
}

init().catch((e) => console.error("[TCDS] Error en init index-sensor:", e));
