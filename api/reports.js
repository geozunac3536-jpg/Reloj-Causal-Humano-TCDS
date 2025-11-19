// api/reports.js
//
// Endpoint unificado:
//  - POST /api/reports → recibe eventos del Reloj Causal Humano
//  - GET  /api/reports → devuelve resumen + últimos eventos
//
// Nota: almacenamiento en memoria (se pierde al reiniciar la función).
// Es perfecto para experimento en Vercel.

let events = [];

// Pequeño helper para formatear fecha legible
function formatDate(ts) {
  const d = new Date(ts);
  return d.toISOString(); // UTC, fácil de parsear
}

export default async function handler(req, res) {
  // CORS básico por si en algún momento lo llamas cross-origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      // Vercel puede darte body ya parseado o como string
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // Validación muy ligera
      if (!body || !body.metrics) {
        return res.status(400).json({ ok: false, error: "Payload inválido" });
      }

      const now = Date.now();

      const event = {
        device_id: body.device_id || "anon",
        mode: body.mode || "desconocido",
        timestamp: body.timestamp || now,
        receivedAt: now,
        metrics: {
          aMag: body.metrics.aMag ?? null,
          tC_proxy: body.metrics.tC_proxy ?? null,
          LI_proxy: body.metrics.LI_proxy ?? null,
          R_proxy: body.metrics.R_proxy ?? null,
          dH_proxy: body.metrics.dH_proxy ?? null,
          sampleRate: body.metrics.sampleRate ?? null,
        },
      };

      events.push(event);

      // Limitar a los últimos 1000 registros para no crecer infinito
      if (events.length > 1000) {
        events = events.slice(-1000);
      }

      console.log("Nuevo evento causal:", {
        device_id: event.device_id,
        mode: event.mode,
        LI: event.metrics.LI_proxy,
        R: event.metrics.R_proxy,
        dH: event.metrics.dH_proxy,
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Error procesando POST /api/reports:", err);
      return res.status(500).json({ ok: false, error: "Error interno" });
    }
  }

  if (req.method === "GET") {
    // Agregados básicos por modo
    const counts = {
      total: events.length,
      baseline: 0,
      ruido: 0,
      ventana_q: 0,
      otros: 0,
    };

    for (const ev of events) {
      if (ev.mode === "baseline") counts.baseline++;
      else if (ev.mode === "ruido") counts.ruido++;
      else if (ev.mode === "ventana_q") counts.ventana_q++;
      else counts.otros++;
    }

    // Últimos 50 eventos (más recientes primero)
    const lastEvents = events
      .slice(-50)
      .reverse()
      .map((ev) => ({
        device_id: ev.device_id,
        mode: ev.mode,
        timestamp: ev.timestamp,
        timestamp_iso: formatDate(ev.timestamp),
        aMag: ev.metrics.aMag,
        tC_proxy: ev.metrics.tC_proxy,
        LI_proxy: ev.metrics.LI_proxy,
        R_proxy: ev.metrics.R_proxy,
        dH_proxy: ev.metrics.dH_proxy,
        sampleRate: ev.metrics.sampleRate,
      }));

    return res.status(200).json({
      ok: true,
      counts,
      lastEvents,
    });
  }

  // Método no soportado
  return res.status(405).json({ ok: false, error: "Método no permitido" });
}
