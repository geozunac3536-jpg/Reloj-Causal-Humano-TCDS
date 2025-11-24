// Configuración global en memoria (se reinicia cuando Vercel recicla la función)
if (!globalThis.__TCDS_CONFIG__) {
  globalThis.__TCDS_CONFIG__ = {
    mode_hint: "auto",          // auto | force_scientific | force_demo
    report_interval_ms: 5000,   // default para nodos
    alerts_enabled: true
  };
}

const ALLOWED_ORIGINS = [
  "https://reloj-causal-humano-tcds.vercel.app",
  "https://tcds-reloj-causal.vercel.app",
  "https://geozunac3536-jpg.github.io"
];

// Clave mínima de control (visible en el frontend, sirve como "llave del tablero")
const SERVER_KEY = process.env.TCDS_CONFIG_KEY || "TCDS_CONFIG_DEV_KEY";

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-TCDS-KEY");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const cfg = globalThis.__TCDS_CONFIG__;

  // === GET: los nodos leen la configuración ===
  if (req.method === "GET") {
    return res.status(200).json({
      ...cfg,
      server_time: Date.now()
    });
  }

  // === POST: sólo el dashboard (con llave) puede modificar ===
  if (req.method === "POST") {
    const key = req.headers["x-tcds-key"];
    if (!key || key !== SERVER_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

      if (typeof body.mode_hint === "string") {
        cfg.mode_hint = body.mode_hint;
      }
      if (typeof body.report_interval_ms === "number" && body.report_interval_ms >= 200) {
        cfg.report_interval_ms = body.report_interval_ms;
      }
      if (typeof body.alerts_enabled === "boolean") {
        cfg.alerts_enabled = body.alerts_enabled;
      }

      console.log("[CONFIG] Actualizada:", cfg);

      return res.status(200).json({ ok: true, config: cfg });
    } catch (e) {
      console.error("Error en /api/config POST:", e);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
