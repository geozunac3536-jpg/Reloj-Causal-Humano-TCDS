// api/reports.js
// Endpoint de Ingesta TCDS - Nodo Geo-Sincronizado

// Simulamos persistencia temporal para ver datos en /api/query sin base de datos real aún
let events = [];

export default async function handler(req, res) {
  // Headers CORS para permitir que el index.html (Github Pages) envíe datos
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // 1. Extracción de Datos TCDS
      const event = {
        device_id: body.device_id || "anon",
        timestamp_local: body.timestamp || Date.now(),
        timestamp_server: Date.now(), // Tiempo absoluto de llegada
        
        // 2. Datos de Geolocalización (CRÍTICO PARA TRIANGULACIÓN SÍSMICA)
        geo: {
          lat: body.geo?.lat || null,
          lon: body.geo?.lon || null,
          acc: body.geo?.acc || null
        },

        // 3. Métricas de Coherencia (Sigma Rules)
        metrics: {
          LI: body.metrics?.LI || 0, // Locking Index
          R: body.metrics?.R || 0,   // Kuramoto
          dH: body.metrics?.dH || 0, // Entropía
          aMag: body.metrics?.aMag || 0
        }
      };

      // ---------------------------------------------------------
      // ZONA DE PERSISTENCIA (FIREBASE / SUPABASE / MONGODB)
      // Aquí es donde conectarías tu DB real.
      // Ejemplo conceptual:
      // await db.collection('tcds_sensor_data').add(event);
      // ---------------------------------------------------------

      // Por ahora, guardamos en memoria (últimos 100 eventos)
      events.push(event);
      if (events.length > 100) events.shift();

      // Log de Auditoría (Visible en Vercel Logs)
      console.log(`[TCDS-INGEST] Nodo: ${event.device_id.slice(0,5)}... | Geo: ${event.geo.lat ? 'OK' : 'N/A'} | LI: ${event.metrics.LI.toFixed(2)}`);

      return res.status(200).json({ ok: true, sync_ts: event.timestamp_server });

    } catch (err) {
      console.error("Error en ingesta:", err);
      return res.status(500).json({ ok: false });
    }
  }

  // Endpoint de consulta simple para depuración
  if (req.method === "GET") {
    return res.status(200).json({ 
      status: "TCDS Ingest Node Online", 
      cached_events: events.length,
      latest: events.slice(-5) 
    });
  }
}
