// api/reports.js
// CEREBRO MAESTRO TCDS (Ingesta + Analítica)
// Autor: Genaro Carrasco Ozuna

// Memoria volátil en el servidor (mientras el proceso esté vivo)
let events = [];

export default async function handler(req, res) {
  // 1. CORS básico
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 2. INGESTA (POST) — lo que manda index.html (nodo)
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || !body.metrics) {
        return res.status(400).json({ error: "Data error: metrics missing" });
      }

      const event = {
        device_id: body.device_id || "anon",
        timestamp: body.timestamp || Date.now(),
        geo: body.geo || null,
        metrics: {
          tC: body.metrics.tC || 0,
          LI: body.metrics.LI || 0,
          R: body.metrics.R || 0,
          dH: body.metrics.dH || 0,
          Q: body.metrics.Q_Arnold || 0,
          aMag: body.metrics.aMag || 0,
          mode: body.metrics.mode || "scientific"
        }
      };

      events.push(event);
      if (events.length > 2000) {
        events.shift(); // buffer circular
      }

      console.log(
        `[INGESTA] Nodo=${event.device_id.slice(0, 6)} | LI=${event.metrics.LI.toFixed(2)} | dH=${event.metrics.dH.toFixed(3)}`
      );

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("Error en POST /api/reports:", e);
      return res.status(500).json({ error: "Error interno" });
    }
  }

  // 3. DASHBOARD (GET) — lo que consulta dashboard.html
  if (req.method === "GET") {
    const now = Date.now();
    // últimos 5 minutos como “ventana activa”
    const recent = events.filter(e => (now - e.timestamp) < 5 * 60 * 1000);
    const total = recent.length;

    const avg = (key) =>
      total === 0
        ? 0
        : recent.reduce((acc, e) => acc + (e.metrics[key] || 0), 0) / total;

    // últimos 50 eventos para gráfica temporal
    const history = recent.slice(-50);

    const dh_mean = avg("dH");
    const li_mean = avg("LI");

    // Heurística simple de alerta global (puedes refinarla)
    let alert_level = "none";
    if (li_mean >= 0.9 && dh_mean <= -0.5 && total > 5) {
      alert_level = "warning_demo"; // nivel alto (pensando futuro sísmico/demo)
    } else if (li_mean >= 0.7 || dh_mean <= -0.3) {
      alert_level = "watch"; // vigilancia
    }

    return res.status(200).json({
      status: "TCDS Master Node Online",
      active_nodes: new Set(recent.map(e => e.device_id)).size,
      tc_mean: avg("tC"),
      li_mean,
      r_mean: avg("R"),
      dh_mean,
      q_mean: avg("Q"),
      cached_events: total,

      // Para el dashboard: curva ΔH / LI
      latest_raw: history.map(e => ({
        time: e.timestamp,
        metrics: {
          dH: e.metrics.dH,
          LI: e.metrics.LI,
          R: e.metrics.R,
          tC: e.metrics.tC,
          Q: e.metrics.Q
        }
      })),

      // Para futuros usos (nodos leyendo backend, etc.)
      alert_level
    });
  }

  // 4. Método no soportado
  return res.status(405).json({ error: "Method not allowed" });
}
