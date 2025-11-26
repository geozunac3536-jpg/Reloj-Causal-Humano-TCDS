// /api/config.js
// Configuración global del Reloj Causal Humano — TCDS

import { applyCors } from "./utils/cors.js";

if (!globalThis.__TCDS_CONFIG__) {
  globalThis.__TCDS_CONFIG__ = {
    mode_hint: "auto",          // auto | force_scientific | force_demo
    report_interval_ms: 5000,   // sugerencia para tamaño de ventana
    alerts_enabled: true,
    version: "1.5.0",
    updated_at: new Date().toISOString()
  };
}

const PUBLIC_DASH_KEY = "TCDS-RELOJ-CAUSAL-KEY";

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      config: globalThis.__TCDS_CONFIG__,
      dash_key: PUBLIC_DASH_KEY
    });
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

      if (body.dash_key && body.dash_key !== PUBLIC_DASH_KEY) {
        return res.status(403).json({ error: "Clave de tablero inválida" });
      }

      const cfg = globalThis.__TCDS_CONFIG__;

      if (typeof body.mode_hint === "string") {
        cfg.mode_hint = body.mode_hint;
      }
      if (typeof body.report_interval_ms === "number" && body.report_interval_ms > 500) {
        cfg.report_interval_ms = body.report_interval_ms;
      }
      if (typeof body.alerts_enabled === "boolean") {
        cfg.alerts_enabled = body.alerts_enabled;
      }

      cfg.updated_at = new Date().toISOString();

      console.log("[CONFIG] Actualizada:", cfg);
      return res.status(200).json({ ok: true, config: cfg });

    } catch (e) {
      console.error("Error en /api/config POST:", e);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
