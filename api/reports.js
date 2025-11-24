// /api/reports.js
// CEREBRO MAESTRO TCDS (Ingesta + Analítica)
// Autor: Genaro Carrasco Ozuna

import { applyCors } from "./utils/cors.js";

// Memoria Volátil (vive mientras el serverless esté “caliente”)
let events = [];

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ============ MODO INGESTA (POST) ============
  if (req.method === "POST") {
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      if (!body || typeof body !== "object" || typeof body.metrics !== "object") {
        return res.status(400).json({ error: "Invalid payload" });
      }

      // Límite de tamaño básico para evitar abusos
      const rawLen = JSON.stringify(body).length;
      if (rawLen > 4000) {
        return res.status(413).json({ error: "Payload too large" });
      }

      const m = body.metrics;

      const event = {
        device_id: String(body.device_id || "anon").slice(0, 64),
        timestamp: Date.now(),
        metrics: {
          tC: Number(m.tC) || 0,
          LI: Number(m.LI) || 0,
          R: Number(m.R) || 0,
          dH: Number(m.dH) || 0,
          Q: Number(m.Q_Arnold) || 0
        }
      };

      // Guardamos en memoria (buffer circular máx 1000)
      events.push(event);
      if (events.length > 1000) events.shift();

      // Log compacto, sin GPS ni datos sensibles
      try {
        console.log(
          `[INGESTA] Nodo=${event.device_id.slice(0, 8)} ` +
          `LI=${event.metrics.LI.toFixed(2)} ` +
          `dH=${event.metrics.dH.toFixed(3)}`
        );
      } catch {
        // no pasa nada si el log falla
      }

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("Error en POST /api/reports:", e);
      return res.status(500).json({ error: "Error interno" });
    }
  }

  // ============ MODO DASHBOARD (GET) ============
  if (req.method === "GET") {
    const now = Date.now();
    // Ventana de 5 minutos para tiempo real
    const recent = events.filter(
      (e) => now - e.timestamp < 5 * 60 * 1000
    );
    const total = recent.length;

    const avg = (key) =>
      total === 0
        ? 0
        : recent.reduce((acc, e) => acc + (e.metrics[key] || 0), 0) / total;

    const tc_mean = avg("tC");
    const li_mean = avg("LI");
    const r_mean = avg("R");
    const dh_mean = avg("dH");
    const q_mean = avg("Q");

    // Nivel de alerta simple basado en Σ-metrics
    let alert_level = "none";
    if (li_mean >= 0.9 && dh_mean <= -0.5) {
      alert_level = "watch";           // red claramente coherente
    } else if (li_mean >= 0.8 && dh_mean <= -0.4) {
      alert_level = "elevated";        // posible estructura
    }

    const active_nodes = new Set(recent.map((e) => e.device_id)).size;

    // Los últimos 50 eventos para la gráfica
    const latest_raw = recent
      .slice(-50)
      .map((e) => ({
        time: e.timestamp,
        metrics: e.metrics
      }));

    return res.status(200).json({
      status: "TCDS Master Node Online",
      active_nodes,
      tc_mean,
      li_mean,
      r_mean,
      dh_mean,
      q_mean,
      cached_events: total,
      alert_level,
      latest_raw
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
