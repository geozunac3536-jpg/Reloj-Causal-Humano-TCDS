// /api/reports.js
// CEREBRO MAESTRO TCDS (Ingesta + Analítica + E-Veto de red)
// Autor: Genaro Carrasco Ozuna · Alineado al Reloj Causal Humano v1.5

import { applyCors } from "./utils/cors.js";

// Memoria volátil (vive mientras la función esté "caliente")
let events = [];

// Pequeña cola para histórico del dashboard (últimos N eventos crudos)
const MAX_HISTORY = 50;
let history = [];

// Configuración de umbrales E-Veto (nivel red)
const EVETO_THRESHOLDS = {
  li_min: 0.9,
  r_min: 0.95,
  rmse_max: 0.10,
  dh_max: -0.20 // ΔH debe ser <= -0.20 para pasar filtro
};

// Clasificación de ventana según Σ-metrics + ΔH
function classifyWindow(sample) {
  const { li, r, rmse_sl, dh } = sample;

  const kpiOk =
    typeof li === "number" && li >= EVETO_THRESHOLDS.li_min &&
    typeof r === "number" && r > EVETO_THRESHOLDS.r_min &&
    typeof rmse_sl === "number" && rmse_sl < EVETO_THRESHOLDS.rmse_max;

  const entropyOk = typeof dh === "number" && dh <= EVETO_THRESHOLDS.dh_max;

  if (!kpiOk && !entropyOk) return "phi";       // φ-driven (ruido)
  if (kpiOk && entropyOk) return "q";           // Q-driven (coherencia válida)
  return "borderline";                          // zona intermedia
}

// Normaliza timestamp a ISO
function normalizeTimestamp(ts) {
  if (!ts) return new Date().toISOString();
  const date = new Date(ts);
  if (isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

// Ingesta de un reporte desde el nodo (frontend)
function ingestEvent(body) {
  const sample = {
    node_id: body.node_id || "anon",
    region: body.region || "desconocida",
    li: typeof body.li === "number" ? body.li : null,
    r: typeof body.r === "number" ? body.r : null,
    rmse_sl: typeof body.rmse_sl === "number" ? body.rmse_sl : null,
    dh: typeof body.dh === "number" ? body.dh : null,
    t_c: typeof body.t_c === "number" ? body.t_c : null,
    ts: normalizeTimestamp(body.ts),
    meta: body.meta || {}
  };

  const cls = classifyWindow(sample);
  sample.class = cls;

  // Almacenar en memoria
  events.push(sample);
  if (events.length > 1000) {
    events = events.slice(-1000);
  }

  // Histórico para gráficos ΔH vs LI, etc.
  history.push(sample);
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY);
  }

  return sample;
}

// Cálculo agregado para el dashboard
function buildDashboardPayload() {
  if (events.length === 0) {
    return {
      ok: true,
      stats: {
        total_events: 0,
        counts: {
          phi: 0,
          borderline: 0,
          q: 0
        },
        averages: {
          li: null,
          r: null,
          rmse_sl: null,
          dh: null,
          t_c: null
        }
      },
      latest_raw: [],
      thresholds: EVETO_THRESHOLDS
    };
  }

  let sumLI = 0, sumR = 0, sumRMSE = 0, sumDH = 0, sumTC = 0;
  let nLI = 0, nR = 0, nRMSE = 0, nDH = 0, nTC = 0;
  let phi = 0, border = 0, q = 0;

  for (const e of events) {
    if (typeof e.li === "number") { sumLI += e.li; nLI++; }
    if (typeof e.r === "number") { sumR += e.r; nR++; }
    if (typeof e.rmse_sl === "number") { sumRMSE += e.rmse_sl; nRMSE++; }
    if (typeof e.dh === "number") { sumDH += e.dh; nDH++; }
    if (typeof e.t_c === "number") { sumTC += e.t_c; nTC++; }

    if (e.class === "phi") phi++;
    else if (e.class === "q") q++;
    else if (e.class === "borderline") border++;
  }

  const total = events.length;

  const payload = {
    ok: true,
    stats: {
      total_events: total,
      counts: {
        phi,
        borderline: border,
        q
      },
      averages: {
        li: nLI ? sumLI / nLI : null,
        r: nR ? sumR / nR : null,
        rmse_sl: nRMSE ? sumRMSE / nRMSE : null,
        dh: nDH ? sumDH / nDH : null,
        t_c: nTC ? sumTC / nTC : null
      }
    },
    latest_raw: history,
    thresholds: EVETO_THRESHOLDS
  };

  return payload;
}

export default async function handler(req, res) {
  applyCors(req, res);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // POST → nodo envía una ventana Σ + ΔH
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const sample = ingestEvent(body);

      console.log("[REPORT] Nodo:", sample.node_id, "class:", sample.class, "LI:", sample.li, "ΔH:", sample.dh);

      return res.status(200).json({
        ok: true,
        class: sample.class,
        ts: sample.ts
      });
    } catch (err) {
      console.error("Error en POST /api/reports:", err);
      return res.status(500).json({ error: "Error al procesar reporte" });
    }
  }

  // GET → dashboard pide agregados E-Veto + histórico
  if (req.method === "GET") {
    try {
      const payload = buildDashboardPayload();
      return res.status(200).json(payload);
    } catch (err) {
      console.error("Error en GET /api/reports:", err);
      return res.status(500).json({ error: "Error interno en dashboard" });
    }
  }

  // Método no soportado
  return res.status(405).json({ error: "Método no permitido" });
}
