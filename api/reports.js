// api/reports.js
// CEREBRO UNIFICADO TCDS (Ingesta + Analítica)
// Soluciona el problema de memoria dividida en Vercel

// Memoria Volátil (Se mantiene viva en el contenedor activo)
let events = [];

export default async function handler(req, res) {
  // CORS: Permisos totales para tu Dashboard y Reloj
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ---------------------------------------------------------
  // MODO 1: INGESTA (POST) - El Reloj envía datos aquí
  // ---------------------------------------------------------
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      
      if (!body || !body.metrics) return res.status(400).json({ error: "Data error" });

      // Guardamos el evento
      const event = {
        device_id: body.device_id || "anon",
        timestamp: Date.now(),
        metrics: {
          tC: body.metrics.tC || 0,
          LI: body.metrics.LI || 0,
          R: body.metrics.R || 0,
          dH: body.metrics.dH || 0,
          Q: body.metrics.Q_Arnold || 0
        }
      };

      events.push(event);
      // Mantenemos solo los últimos 1000 para no llenar la memoria
      if (events.length > 1000) events.shift();

      console.log(`[INGESTA] Dato recibido. Memoria actual: ${events.length} eventos.`);
      return res.status(200).json({ ok: true, msg: "Recibido" });

    } catch (e) { return res.status(500).json({ error: "Error interno" }); }
  }

  // ---------------------------------------------------------
  // MODO 2: ANALÍTICA (GET) - El Dashboard lee esto
  // ---------------------------------------------------------
  if (req.method === "GET") {
    // Calculamos los promedios aquí mismo (donde están los datos)
    
    const now = Date.now();
    // Filtramos solo datos recientes (últimos 5 minutos) para que sea tiempo real
    const recent = events.filter(e => (now - e.timestamp) < 5 * 60 * 1000);
    const total = recent.length;

    // Nodos activos únicos
    const uniqueNodes = new Set(recent.map(e => e.device_id)).size;

    // Helper de promedio
    const avg = (key) => total === 0 ? 0 : recent.reduce((acc, e) => acc + (e.metrics[key]||0), 0) / total;

    // Respuesta formateada para el Dashboard
    return res.status(200).json({
      status: "TCDS Unified Brain Online",
      active_nodes: uniqueNodes, // El Dashboard busca esto
      tc_mean: avg('tC'),        // El Dashboard busca esto
      li_mean: avg('LI'),
      r_mean: avg('R'),
      dh_mean: avg('dH'),
      q_mean: avg('Q'),
      // Datos extra para debug
      memory_size: events.length,
      latest_timestamp: total > 0 ? recent[recent.length-1].timestamp : 0
    });
  }
}
