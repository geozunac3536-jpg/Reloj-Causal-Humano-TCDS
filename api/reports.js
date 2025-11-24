// api/reports.js
// CEREBRO MAESTRO TCDS (Ingesta + Analítica + E-Veto de red)
// Autor: Genaro Carrasco Ozuna

// Memoria volátil (vive mientras el servidor esté "caliente")
let events = [];

// Pequeña cola para histórico del dashboard (últimos 50 eventos crudos)
const MAX_HISTORY = 50;
let history = [];

// Configuración de umbrales E-Veto (nivel red)
const EVETO_THRESHOLDS = {
  li_min: 0.9,
  dh_max: -0.5 // ΔH debe ser <= -0.5 para pasar filtro
};

export default async function handler(req, res) {
  // 1. CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. INGESTA: el nodo Shannon envía datos aquí
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || !body.metrics) {
        return res.status(400).json({ error: "Payload inválido (falta metrics)" });
      }

      const now = Date.now();

      const event = {
        device_id: body.device_id || "anon",
        time: new Date(body.timestamp || now).toISOString(),
        geo: body.geo || null,
        metrics: {
          // Mantener nombres compatibles con el nodo
          aMag: body.metrics.aMag || 0,
          LI: body.metrics.LI || 0,
          R: body.metrics.R || 0,
          dH: body.metrics.dH || 0,
          Q: body.metrics.Q_Arnold || 0
        }
      };

      // Guardamos en buffer de 5 minutos para estadísticas rápidas
      events.push({
        ...event,
        _ts: now
      });

      // Limpiamos eventos viejos (> 5 min)
      const FIVE_MIN = 5 * 60 * 1000;
      events = events.filter(e => (now - e._ts) < FIVE_MIN);

      // Guardamos en histórico global (últimos 50 crudos para el dashboard)
      history.push(event);
      if (history.length > MAX_HISTORY) history.shift();

      console.log(
        `[INGESTA] Nodo: ${event.device_id.slice(0, 6)} | LI=${event.metrics.LI.toFixed(2)} | dH=${event.metrics.dH.toFixed(3)}`
      );

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error en POST /api/reports:", err);
      return res.status(500).json({ error: "Error interno en ingesta" });
    }
  }

  // 3. DASHBOARD: el panel global pide aquí las estadísticas
  if (req.method === "GET") {
    try {
      const now = Date.now();
      const recent = events; // ya están filtrados a 5 min
      const total = recent.length;

      const avg = (key) => {
        if (total === 0) return 0;
        return recent.reduce((acc, e) => acc + (e.metrics[key] || 0), 0) / total;
      };

      // 3.1. KPI de red
      const activeNodes = new Set(recent.map(e => e.device_id)).size;

      const tc_mean = avg("tC"); // por si en versiones futuras añades tC
      const li_mean = avg("LI");
      const r_mean  = avg("R");
      const dh_mean = avg("dH");
      const q_mean  = avg("Q");

      // 3.2. E-Veto de red: porcentaje de eventos coherentes
      const coherent = recent.filter(e =>
        e.metrics.LI >= EVETO_THRESHOLDS.li_min &&
        e.metrics.dH <= EVETO_THRESHOLDS.dh_max
      );

      const coherent_count = coherent.length;
      const coherence_ratio = total > 0 ? coherent_count / total : 0;

      // Nivel de alerta simple basado en coherencia de red
      let alert_level = "none";
      if (coherent_count > 0 && coherence_ratio > 0.3) {
        alert_level = "watch"; // hay algo estructurado, pero no dominante
      }
      if (coherent_count > 10 && coherence_ratio > 0.6) {
        alert_level = "warning_demo"; // para demos: mostrar que “algo pasa”
      }

      const payload = {
        status: "TCDS Master Node Online",
        active_nodes: activeNodes,
        cached_events: total,
        tc_mean,
        li_mean,
        r_mean,
        dh_mean,
        q_mean,
        coherent_events: coherent_count,
        coherence_ratio,
        alert_level,
        // histórico crudo para gráficas ΔH vs LI
        latest_raw: history
      };

      return res.status(200).json(payload);
    } catch (err) {
      console.error("Error en GET /api/reports:", err);
      return res.status(500).json({ error: "Error interno en dashboard" });
    }
  }

  // 4. Método no soportado
  return res.status(405).json({ error: "Método no permitido" });
}
