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
// ================== HELPERS E-VETO (ΔH, LI, κΣ) ==================

/**
 * Calcula la entropía espectral de Shannon normalizada ΔH ∈ [-1, 0]
 * a partir de una ventana de magnitudes de aceleración.
 * - Ventana: últimos M puntos (ej. 128)
 * - FFT simplificada (DFT) sobre [0, M/2)
 */
function computeSpectralEntropy(mags) {
  const N = mags.length;
  if (!N) return { dH: 0, powerSpectrum: [] };

  // Tomamos los últimos M puntos para mantener costo bajo
  const M = Math.min(128, N);
  const start = N - M;
  const x = new Array(M);

  // Quitamos media (centrado)
  let sum = 0;
  for (let i = 0; i < M; i++) {
    const v = mags[start + i];
    sum += v;
    x[i] = v;
  }
  const mean = sum / M;
  for (let i = 0; i < M; i++) {
    x[i] -= mean;
  }

  const K = Math.floor(M / 2);    // sólo hasta Nyquist
  const power = new Array(K).fill(0);

  // DFT simplificada (O(M^2), pero M pequeño => ok en móvil)
  const TWO_PI = 2 * Math.PI;
  for (let k = 0; k < K; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < M; n++) {
      const angle = -TWO_PI * k * n / M;
      const xn = x[n];
      re += xn * Math.cos(angle);
      im += xn * Math.sin(angle);
    }
    power[k] = re * re + im * im;
  }

  let totalPower = 0;
  for (let k = 0; k < K; k++) totalPower += power[k];
  if (totalPower <= 0) {
    return { dH: 0, powerSpectrum: power };
  }

  // Shannon H en base 2
  let H = 0;
  for (let k = 0; k < K; k++) {
    const pk = power[k];
    if (pk <= 0) continue;
    const p = pk / totalPower;
    H += -p * (Math.log(p) / Math.log(2));
  }

  const Hmax = Math.log(K) / Math.log(2);
  const dH = Hmax > 0 ? (H / Hmax - 1.0) : 0;   // ∈ [-1, 0]

  return { dH, powerSpectrum: power };
}

/**
 * Calcula Locking Index (LI) combinando:
 * - ruido relativo (σ / |μ|)
 * - factor de agudeza espectral (Q ~ pico / ancho de banda)
 */
function computeLI(mags, powerSpectrum) {
  const N = mags.length;
  if (!N) return 0;

  // Estadística de ventana
  let sum = 0;
  for (let i = 0; i < N; i++) sum += mags[i];
  const mean = sum / N;

  let varSum = 0;
  for (let i = 0; i < N; i++) {
    const d = mags[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / N);

  const noiseFactor = std / (Math.abs(mean) + 1e-6);
  const liRaw = 1 / (1 + noiseFactor);   // ruido↑ → LI↓

  // Factor Q aproximado
  let Q = 1;
  if (powerSpectrum && powerSpectrum.length > 4) {
    let maxVal = -Infinity;
    let maxIdx = 0;
    for (let k = 1; k < powerSpectrum.length; k++) {
      if (powerSpectrum[k] > maxVal) {
        maxVal = powerSpectrum[k];
        maxIdx = k;
      }
    }
    if (maxVal > 0) {
      const half = maxVal / Math.E;  // "ancho" a ~1/e
      let left = maxIdx, right = maxIdx;
      for (let k = maxIdx; k >= 0; k--) {
        if (powerSpectrum[k] < half) { left = k; break; }
      }
      for (let k = maxIdx; k < powerSpectrum.length; k++) {
        if (powerSpectrum[k] < half) { right = k; break; }
      }
      const bwBins = Math.max(1, right - left);
      const fPeak = maxIdx / powerSpectrum.length; // (0..0.5 aprox)
      Q = fPeak > 0 ? (fPeak / (bwBins / powerSpectrum.length)) : 1;
    }
  }

  const qNorm = Math.tanh(Q / 8);          // saturamos Q
  const li = Math.max(0, Math.min(1, liRaw * (0.5 + 0.5 * qNorm)));
  return li;
}

/**
 * κΣ: razón entre gradiente máximo y amplitud máxima.
 * κΣ > 1 → crecimiento físicamente sospechoso (artefacto).
 */
function computeKappaSigma(mags) {
  const N = mags.length;
  if (N < 2) return 0;
  let maxGrad = 0;
  let maxAmp = 0;
  for (let i = 1; i < N; i++) {
    const prev = mags[i - 1];
    const cur = mags[i];
    const grad = Math.abs(cur - prev);
    if (grad > maxGrad) maxGrad = grad;
    const amp = Math.abs(cur);
    if (amp > maxAmp) maxAmp = amp;
  }
  if (maxAmp <= 0) return 0;
  return maxGrad / maxAmp;
}

/**
 * Filtro E-Veto (núcleo canónico):
 * ΔH < −0.4, LI > 0.85, κΣ ≤ 1.0
 */
function applyEVeto(dH, LI, kappa) {
  const isOrdered  = (dH < -0.4);
  const isLocked   = (LI > 0.85);
  const isPhysical = (kappa <= 1.0);

  if (isOrdered && isLocked && isPhysical) {
    return "Q_DRIVEN_VALID";      // ALERTA_SISMICA_VALIDA
  } else {
    return "PHI_OR_ARTEFACT";     // φ-driven o ruido
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
