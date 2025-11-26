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
  tcMode: document.getElementById("tcMode")
};

let config = null;
let sensorActive = false;
let lastSampleTime = 0;
let windowSamples = [];

// ================== CONFIG ==================

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
      version: "1.5.0"
    };
  }
}

// ================== HELPERS E-VETO ==================

function computeSpectralEntropy(mags) {
  const N = mags.length;
  if (!N) return { dH: 0, powerSpectrum: [] };

  const M = Math.min(128, N);
  const start = N - M;
  const x = new Array(M);
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

  const K = Math.floor(M / 2);
  const power = new Array(K).fill(0);
  const TWO_PI = 2 * Math.PI;

  for (let k = 0; k < K; k++) {
    let re = 0, im = 0;
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

  let H = 0;
  for (let k = 0; k < K; k++) {
    const pk = power[k];
    if (pk <= 0) continue;
    const p = pk / totalPower;
    H += -p * (Math.log(p) / Math.log(2));
  }

  const Hmax = Math.log(K) / Math.log(2);
  const dH = Hmax > 0 ? (H / Hmax - 1.0) : 0; // [-1,0]

  return { dH, powerSpectrum: power };
}

function computeLI(mags, powerSpectrum) {
  const N = mags.length;
  if (!N) return 0;

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
  const liRaw = 1 / (1 + noiseFactor);

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
      const half = maxVal / Math.E;
      let left = maxIdx, right = maxIdx;
      for (let k = maxIdx; k >= 0; k--) {
        if (powerSpectrum[k] < half) { left = k; break; }
      }
      for (let k = maxIdx; k < powerSpectrum.length; k++) {
        if (powerSpectrum[k] < half) { right = k; break; }
      }
      const bwBins = Math.max(1, right - left);
      const fPeak = maxIdx / powerSpectrum.length;
      Q = fPeak > 0 ? (fPeak / (bwBins / powerSpectrum.length)) : 1;
    }
  }

  const qNorm = Math.tanh(Q / 8);
  const li = Math.max(0, Math.min(1, liRaw * (0.5 + 0.5 * qNorm)));
  return li;
}

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

function applyEVeto(dH, LI, kappa) {
  const isOrdered  = (dH < -0.4);
  const isLocked   = (LI > 0.85);
  const isPhysical = (kappa <= 1.0);

  if (isOrdered && isLocked && isPhysical) {
    return "Q_DRIVEN_VALID";
  } else {
    return "PHI_OR_ARTEFACT";
  }
}

// ================== ENVÍO AL BACKEND ==================

async function sendReport(sample) {
  try {
    const resp = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample)
    });
    const json = await resp.json();
    console.log("[TCDS] Reporte enviado, clase red:", json.class);
  } catch (e) {
    console.warn("[TCDS] Error enviando reporte a /api/reports:", e);
  }
}

// ================== PROCESO DE VENTANA ==================

function processRawSample(acc, timestamp) {
  const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
  windowSamples.push({ mag, timestamp });

  const now = timestamp;
  if (!lastSampleTime) lastSampleTime = now;

  const interval = (config && config.report_interval_ms) || 5000;
  const elapsed = now - lastSampleTime;
  if (elapsed < interval) return;

  lastSampleTime = now;

  const N = windowSamples.length;
  if (!N) return;

  const mags = windowSamples.map(s => s.mag);

  const { dH, powerSpectrum } = computeSpectralEntropy(mags);
  const LI = computeLI(mags, powerSpectrum);
  const kappa = computeKappaSigma(mags);

  const R = Math.max(0, Math.min(1, 0.8 + 0.2 * LI));
  const RMSE_SL = Math.max(0, Math.min(0.3, kappa / 5));

  const t_c = (LI - 0.5) * 0.08 + (dH + 0.5) * -0.04;

  const evetoClass = applyEVeto(dH, LI, kappa);

  let lapsoClass = "phi";
  if (evetoClass === "Q_DRIVEN_VALID") {
    lapsoClass = "q";
  } else {
    const softOrdered  = (dH < -0.2);
    const softLocked   = (LI > 0.7);
    const softPhysical = (kappa <= 1.5);
    const score = [softOrdered, softLocked, softPhysical].filter(Boolean).length;
    if (score >= 2) lapsoClass = "borderline";
  }

  windowSamples = [];

  const sample = {
    node_id: "browser-mobile",
    region: "desconocida",
    li: LI,
    r: R,
    rmse_sl: RMSE_SL,
    dh: dH,
    t_c: t_c,
    ts: new Date().toISOString(),
    class: lapsoClass,
    meta: {
      kappa_sigma: kappa,
      eveto_class: evetoClass,
      n_samples: N
    }
  };

  els.li.textContent = LI.toFixed(2);
  els.r.textContent = R.toFixed(2);
  els.rmse.textContent = RMSE_SL.toFixed(2);
  els.dh.textContent = dH.toFixed(3);
  els.tc.textContent = (t_c >= 0 ? "+" : "") + t_c.toFixed(3);

  if (lapsoClass === "phi") {
    els.tcMode.textContent = "LAPSO φ-driven (ruido / baseline)";
  } else if (lapsoClass === "borderline") {
    els.tcMode.textContent = "Zona borderline (transición φ ↔ Q)";
  } else {
    els.tcMode.textContent = "Candidata Q-driven (E-Veto aprobado)";
  }

  els.status.textContent = `ventana local: ${lapsoClass} · E-Veto: ${evetoClass}`;

  sendReport(sample);
}

// ================== SENSORES ==================

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

async function requestSensorPermission() {
  els.status.textContent = "solicitando permiso de sensor…";

  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
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
    sensorActive = true;
    els.status.textContent = "Sensor activo (modo estándar). Nodo enviando ventanas Σ.";
  }
}

// ================== INIT ==================

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
