// /api/config.js
// Control remoto simple de nodos TCDS
// Autor: Genaro Carrasco Ozuna

import { applyCors } from "./utils/cors.js";

// Estado global muy ligero
let configState = {
  mode_hint: "auto",           // auto | force_scientific | force_demo
  report_interval_ms: 5000,    // sugerencia para nodos
  alerts_enabled: true         // para futuras versiones con sonido
};

// Define esta variable en Vercel > Settings > Environment Variables
const CONFIG_KEY = process.env.TCDS_CONFIG_KEY || "";

// Helper
function mergeConfig(partial) {
  if (!partial || typeof partial !== "object") return;
  if (partial.mode_hint && typeof partial.mode_hint === "string") {
    configState.mode_hint = partial.mode_hint;
  }
  if (
    typeof partial.report_interval_ms === "number" &&
    partial.report_interval_ms >= 100 &&
    partial.report_interval_ms <= 600000
  ) {
    configState.report_interval_ms = Math.floor(partial.report_interval_ms);
  }
  if (typeof partial.alerts_enabled === "boolean") {
    configState.alerts_enabled = partial.alerts_enabled;
  }
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ============ GET: lectura de config actual ============
  if (req.method === "GET") {
    return res.status(200).json({
      ...configState,
      // campo reservado para futuras extensiones
      version: "1.0.0"
    });
  }

  // ============ POST: actualización (requiere llave) ============
  if (req.method === "POST") {
    // Validar llave simple
    if (!CONFIG_KEY) {
      return res
        .status(500)
        .json({ error: "CONFIG_KEY no configurada en el servidor" });
    }

    const key = req.headers["x-tcds-key"];
    if (key !== CONFIG_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      mergeConfig(body || {});

      try {
        console.log(
          `[CONFIG] mode_hint=${configState.mode_hint} ` +
          `interval=${configState.report_interval_ms}ms ` +
          `alerts=${configState.alerts_enabled}`
        );
      } catch {
        // ignorar errores de log
      }

      return res.status(200).json({ ok: true, config: configState });
    } catch (e) {
      console.error("Error en POST /api/config:", e);
      return res.status(500).json({ error: "Error interno" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
