// api/reports.js
// CEREBRO MAESTRO TCDS (Ingesta + Analítica + Alertas)
// Versión: 1.5.1 (Shannon Integration)

// Memoria Volátil (Se mantiene viva mientras el servidor esté "caliente")
let events = [];

export default async function handler(req, res) {
  // 1. Configuración de CORS (Permitir acceso a Dashboard y Nodos)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responder rápido a las pruebas de conexión del navegador
  if (req.method === "OPTIONS") return res.status(200).end();

  // ---------------------------------------------------------
  // MODO 1: INGESTA (POST) - Recepción de datos desde el Reloj
  // ---------------------------------------------------------
  if (req.method === "POST") {
    try {
      // Parseo seguro del cuerpo de la petición
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      
      if (!body || !body.metrics) {
        return res.status(400).json({ error: "Payload TCDS inválido" });
      }

      // Construcción del Evento Causal
      const event = {
        device_id: body.device_id || "anon",
        timestamp: Date.now(),
        metrics: {
          tC: typeof body.metrics.tC === 'number' ? body.metrics.tC : 0,
          LI: typeof body.metrics.LI === 'number' ? body.metrics.LI : 0,
          R:  typeof body.metrics.R  === 'number' ? body.metrics.R  : 0,
          dH: typeof body.metrics.dH === 'number' ? body.metrics.dH : 0,
          Q:  typeof body.metrics.Q_Arnold === 'number' ? body.metrics.Q_Arnold : 0
        }
      };

      // Guardar en Memoria (Buffer Circular de 1000 eventos)
      events.push(event);
      if (events.length > 1000) events.shift();

      // Log para depuración en consola de Vercel
      console.log(
        `[INGESTA] Nodo: ${event.device_id.slice(0,5)} | LI: ${event.metrics.LI.toFixed(2)} | dH: ${event.metrics.dH.toFixed(3)}`
      );

      return res.status(200).json({ ok: true });

    } catch (e) {
      console.error("Error crítico en POST:", e);
      return res.status(500).json({ error: "Fallo interno en nodo maestro" });
    }
  }

  // ---------------------------------------------------------
  // MODO 2: ANALÍTICA (GET) - El Dashboard consume esto
  // ---------------------------------------------------------
  if (req.method === "GET") {
    const now = Date.now();
    // Filtramos solo eventos de los últimos 5 minutos (Tiempo Real)
    const recent = events.filter(e => (now - e.timestamp) < 5 * 60 * 1000);
    const total = recent.length;

    // Función auxiliar para promedios seguros
    const avg = (key) =>
      total === 0
        ? 0
        : recent.reduce((acc, e) => acc + (e.metrics[key] || 0), 0) / total;

    // --- [NUEVO] LÓGICA DE ALERTA GLOBAL TCDS ---
    const current_dh_mean = avg("dH");
    const current_li_mean = avg("LI");
    let alert_level = "none";

    // Regla de Alerta Roja: Entropía muy baja (orden) + Locking alto + Múltiples reportes
    if (total >= 3 && current_dh_mean < -0.45 && current_li_mean > 0.75) {
       alert_level = "warning_demo"; 
    } 
    // Regla de Vigilancia (Ámbar): Tendencia a la baja entropía
    else if (total >= 1 && current_dh_mean < -0.25) {
       alert_level = "watch"; 
    }

    // Preparamos datos históricos para la gráfica del Dashboard
    // Enviamos los últimos 50, ordenados del más viejo al más nuevo para Chart.js
    const latest_raw = recent
      .slice(-50)
      .map(e => ({
        time: new Date(e.timestamp).toISOString(),
        metrics: {
          dH: e.metrics.dH,
          LI: e.metrics.LI
        }
      }));

    return res.status(200).json({
      status: "TCDS Master Node Online",
      mode: total === 0 ? "ping" : "live",
      alert_level: alert_level, // <--- EL DATO QUE FALTABA
      active_nodes: new Set(recent.map(e => e.device_id)).size,
      
      // Promedios Globales
      tc_mean: avg("tC"),
      li_mean: current_li_mean,
      r_mean: avg("R"),
      dh_mean: current_dh_mean,
      q_mean: avg("Q"),
      
      // Metadatos
      cached_events: total,
      latest_raw
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
