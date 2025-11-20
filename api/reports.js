// api/reports.js
// Cerebro de Ingesta TCDS - Versión Corregida v1.3

// Exportamos la memoria para compartirla con query.js
export let events = [];

// Helper de fecha
function formatDate(ts) {
  return new Date(ts).toISOString();
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // POST: Recibir datos del Nodo (Reloj)
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Validación TCDS
      if (!body || !body.metrics) {
        return res.status(400).json({ ok: false, error: "Payload inválido" });
      }

      // Reconstrucción de t_C si falta
      const aMag = body.metrics.aMag || 0;
      const tC_derived = Math.min(aMag / 10, 1) * 2 - 1;

      const event = {
        device_id: body.device_id || "anon",
        timestamp: body.timestamp || Date.now(),
        receivedAt: Date.now(),
        geo: body.geo || {}, // Captura GPS
        metrics: {
          aMag: aMag,
          // Alineación exacta con index.html (sin _proxy)
          LI: body.metrics.LI ?? 0,
          R: body.metrics.R ?? 0,
          dH: body.metrics.dH ?? 0,
          tC: body.metrics.tC ?? tC_derived,
          Q_Arnold: body.metrics.Q_Arnold ?? 0
        }
      };

      // Guardar en memoria (Buffer circular)
      events.push(event);
      if (events.length > 1000) events.shift();

      console.log(`[TCDS] Nodo: ${event.device_id.slice(0,5)} | LI: ${event.metrics.LI.toFixed(2)} | GPS: ${event.geo.lat ? 'SI' : 'NO'}`);

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "Error interno" });
    }
  }

  // GET: Visor de Auditoría
  if (req.method === "GET") {
    const lastEvents = events.slice(-50).reverse().map(ev => ({
      id: ev.device_id,
      time: formatDate(ev.timestamp),
      geo: ev.geo,
      // Mapeo correcto para visualización
      LI: ev.metrics.LI,
      R: ev.metrics.R,
      Q: ev.metrics.Q_Arnold
    }));

    return res.status(200).json({
      status: "TCDS Network Online",
      cached_events: events.length,
      latest: lastEvents
    });
  }
}
