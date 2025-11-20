// api/reports.js
// Ingesta de datos de la Red de Sensores TCDS
// Corrección: Exporta la memoria y alinea las claves JSON con index.html

// Memoria volátil compartida (se mantiene mientras la instancia esté viva)
export let events = [];

export default async function handler(req, res) {
  // CORS: Permitir que cualquier origen (tu reloj) envíe datos
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET: Para depuración rápida en navegador
  if (req.method === "GET") {
    return res.status(200).json({
      status: "TCDS Ingest Node Online",
      cached_events: events.length,
      latest: events.slice(-5)
    });
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Validación mínima
      if (!body || !body.metrics) {
        return res.status(400).json({ ok: false, error: "Payload inválido" });
      }

      // Reconstrucción de t_C (Tiempo Causal) basado en aMag si no viene explícito
      // Mapeo simplificado: 0 a 20 m/s² -> -1 a 1
      const aMag = body.metrics.aMag || 0;
      const tC_derived = Math.min(aMag / 10, 1) * 2 - 1;

      const event = {
        device_id: body.device_id || "anon",
        timestamp: body.timestamp || Date.now(),
        receivedAt: Date.now(),
        geo: body.geo || {},
        metrics: {
          aMag: aMag,
          // Alineación con index.html (sin _proxy)
          LI: body.metrics.LI ?? 0,
          R: body.metrics.R ?? 0,
          dH: body.metrics.dH ?? 0,
          tC: body.metrics.tC ?? tC_derived, 
          Q_Arnold: body.metrics.Q_Arnold ?? 0
        }
      };

      // Persistencia en memoria (Buffer circular de 1000 eventos)
      events.push(event);
      if (events.length > 1000) events.shift();

      console.log(`[TCDS-INGEST] Nodo: ${event.device_id.slice(0,5)} | LI: ${event.metrics.LI.toFixed(2)} | Q: ${event.metrics.Q_Arnold.toFixed(2)}`);

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error procesando reporte:", err);
      return res.status(500).json({ ok: false });
    }
  }
}
