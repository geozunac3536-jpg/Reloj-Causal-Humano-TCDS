// /api/reports.js
// CEREBRO MAESTRO TCDS (Ingesta + Analítica + E-Veto de red)

import { applyCors } from "./utils/cors.js";

let events = [];
let history = [];
const MAX_HISTORY = 50;

const EVETO_THRESHOLDS = {
  li_min: 0.9,
  r_min: 0.95,
  rmse_max: 0.10,
  dh_max: -0.20
};

function normalizeTimestamp(ts) {
  if (!ts) return new Date().toISOString();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function classifyWindowNetwork(li, r, rmse, dh) {
  const kpiOk =
    typeof li === "number" && li >= EVETO_THRESHOLDS.li_min &&
    typeof r === "number" && r > EVETO_THRESHOLDS.r_min &&
    typeof rmse === "number" && rmse < EVETO_THRESHOLDS.rmse_max;

  const entropyOk = typeof dh === "number" && dh <= EVETO_THRESHOLDS.dh_max;

  if (!kpiOk && !entropyOk) return "phi";
  if (kpiOk && entropyOk) return "q";
  return "borderline";
}

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
    class: body.class || null,
    meta: body.meta || {}
  };

  const netClass = classifyWindowNetwork(sample.li, sample.r, sample.rmse_sl, sample.dh);
  sample.class = netClass;

  events.push(sample);
  if (events.length > 2000) {
    events = events.slice(-2000);
  }

  history.push(sample);
  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY);
  }

  return sample;
}

function buildDashboardPayload() {
  if (events.length === 0) {
    return {
      ok: true,
      stats: {
        total_events: 0,
        counts: { phi: 0, borderline: 0, q: 0 },
        averages: { li: null, r: null, rmse_sl: null, dh: null, t_c: null }
      },
      latest_raw: [],
      thresholds: EVETO_THRESHOLDS,
      active_nodes: 0,
      cached_events: 0,
      dh_mean: null,
      li_mean: null,
      alert_level: "none"
    };
  }

  let sumLI = 0, sumR = 0, sumRMSE = 0, sumDH = 0, sumTC = 0;
  let nLI = 0, nR = 0, nRMSE = 0, nDH = 0, nTC = 0;
  let phi = 0, border = 0, q = 0;
  const nodeSet = new Set();

  for (const e of events) {
    nodeSet.add(e.node_id);

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

  const averages = {
    li: nLI ? sumLI / nLI : null,
    r: nR ? sumR / nR : null,
    rmse_sl: nRMSE ? sumRMSE / nRMSE : null,
    dh: nDH ? sumDH / nDH : null,
    t_c: nTC ? sumTC / nTC : null
  };

  const counts = { phi, borderline: border, q };

  const qRatio = total ? q / total : 0;
  const alert_level =
    qRatio > 0.25 && averages.dh !== null && averages.dh < -0.5 && averages.li !== null && averages.li > 0.9
      ? "warning_demo"
      : qRatio > 0.10
        ? "watch"
        : "none";

  const payload = {
    ok: true,
    stats: {
      total_events: total,
      counts,
      averages
    },
    latest_raw: history,
    thresholds: EVETO_THRESHOLDS,
    // Alias para paneles tipo "Master Node"
    active_nodes: nodeSet.size,
    cached_events: total,
    dh_mean: averages.dh,
    li_mean: averages.li,
    alert_level
  };

  return payload;
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const sample = ingestEvent(body);

      console.log(
        "[REPORT] Nodo:", sample.node_id,
        "| class:", sample.class,
        "| LI:", sample.li,
        "| ΔH:", sample.dh,
        "| κΣ:", sample.meta?.kappa_sigma
      );

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

  if (req.method === "GET") {
    try {
      const payload = buildDashboardPayload();
      return res.status(200).json(payload);
    } catch (err) {
      console.error("Error en GET /api/reports:", err);
      return res.status(500).json({ error: "Error interno en dashboard" });
    }
  }

  return res.status(405).json({ error: "Método no permitido" });
}
