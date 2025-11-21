// api/reports.js
// CEREBRO DE INGESTA (Memoria Compartida)
// Función: Recibe datos del sensor, los guarda en RAM y permite auditoría.

// 1. Exportamos la memoria 'events' para que query.js pueda leerla
export let events = [];

export default async function handler(req, res) {
  // CORS: Permite que tu reloj (frontend) envíe datos desde cualquier lugar
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // --- POST: Recibir datos del Nodo (Tu Celular) ---
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Validación básica de seguridad
      if (!body || !body.metrics) {
        return res.status(400).json({ ok: false, error: "Datos incompletos" });
      }

      // Reconstrucción de t_C si falta (para el dashboard visual)
      const aMag = body.metrics.aMag || 0;
      const tC_derived = Math.min(aMag / 10, 1) * 2 - 1;

      const event = {
        device_id: body.device_id || "anon",
        timestamp: body.timestamp || Date.now(),
        receivedAt: Date.now(),
        geo: body.geo || {}, // Guarda coordenadas GPS
        metrics: {
          aMag: aMag,
          // Aquí alineamos los nombres con tu index.html v1.5
          LI: body.metrics.LI ?? 0,
          R: body.metrics.R ?? 0,
          dH: body.metrics.dH ?? 0,
          tC: body.metrics.tC ?? tC_derived,
          Q_Arnold: body.metrics.Q_Arnold ?? 0
        }
      };

      // Guardar en memoria (Buffer de 1000 eventos)
      events.push(event);
      if (events.length > 1000) events.shift();

      // Log para ver en Vercel que llegó
      console.log(`[INGESTA] Nodo: ${event.device_id.slice(0,5)} | LI: ${event.metrics.LI.toFixed(2)}`);

      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: "Error interno" });
    }
  }

  // --- GET: Para que tú verifiques si hay datos entrando ---
  if (req.method === "GET") {
    return res.status(200).json({
      status: "TCDS Network Online",
      cached_events: events.length,
      latest: events.slice(-5).reverse()
    });
  }
}
