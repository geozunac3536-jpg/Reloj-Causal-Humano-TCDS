// api/config.js
// CEREBRO DE CONFIGURACIÓN REMOTA TCDS
// Permite que el Dashboard controle el comportamiento de los Nodos

// Memoria volátil de configuración (Valores por defecto)
let globalConfig = {
  demo_gain: 1.0,
  report_interval_ms: 5000,
  mode_hint: "auto",      // 'auto', 'force_demo', 'force_scientific'
  alerts_enabled: true
};

export default function handler(req, res) {
  // CORS: Permitir acceso desde Dashboard y Sensores
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // 1. EL DASHBOARD ENVÍA ÓRDENES (POST)
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      
      // Actualizamos la configuración global
      globalConfig = { ...globalConfig, ...body };
      
      console.log("[CONFIG] Actualizada por Dashboard:", globalConfig);
      return res.status(200).json({ ok: true, config: globalConfig });
    } catch (e) {
      return res.status(500).json({ error: "Error de formato" });
    }
  }

  // 2. LOS SENSORES LEEN ÓRDENES (GET)
  if (req.method === "GET") {
    return res.status(200).json(globalConfig);
  }
}
