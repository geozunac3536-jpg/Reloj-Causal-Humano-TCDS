export default async function handler(req, res) {
  // === CORS / Seguridad básica ===
  const ALLOWED_ORIGINS = [
    "https://reloj-causal-humano-tcds.vercel.app",
    "https://tcds-reloj-causal.vercel.app",
    "https://geozunac3536-jpg.github.io"
  ];
  const origin = req.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-TCDS-KEY");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // === Memoria volátil global (buffer de eventos) ===
  if (!globalThis.__TCDS_EVENTS__) {
    globalThis.__TCDS_EVENTS__ = [];
  }
  const events = globalThis.__TCDS_EVENTS__;

  const now = Date.now();

  const getIp = () =>
    (req.headers["x-real-ip"]) ||
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  // === POST: ingesta desde nodos ===
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== "object" || !body.metrics) {
        return res.status(400).json({ error: "Bad payload" });
      }

      const m = body.metrics || {};
      const event = {
        time: typeof body.timestamp === "number" ? body.timestamp : now,
        device_id: body.device_id || "anon",
        ip: getIp(),
        geo: body.geo || null,
        metrics: {
          aMag: Number(m.aMag || 0),
          LI: Number(m.LI || 0),
          R: Number(m.R || 0),
          dH: Number(m.dH || 0),
          Q: Number(m.Q_Arnold || 0)
        }
      };

      events.push(event);
      // buffer circular: máximo 1000 eventos
      if (events.length > 1000) events.splice(0, events.length - 1000);

      console.log(
        `[INGEST] ${event.device_id.slice(0, 6)} | IP=${event.ip} | LI=${event.metrics.LI.toFixed(2)} | dH=${event.metrics.dH.toFixed(3)}`
      );

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("Error en /api/reports POST:", e);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  // === GET: agregados para dashboard ===
  if (req.method === "GET") {
    const windowMs = 5 * 60 * 1000; // últimos 5 minutos
    const recent = events.filter((e) => now - e.time < windowMs);
    const total = recent.length;

    const avg = (key) =>
      total === 0
        ? 0
        : recent.reduce((acc, e) => acc + (e.metrics?.[key] ?? 0), 0) / total;

    const li_mean = avg("LI");
    const dh_mean = avg("dH");
    const r_mean = avg("R");
    const q_mean = avg("Q");

    // Nivel de alerta rudimentario (puedes refinar después)
    let alert_level = "none";
    if (li_mean >= 0.9 && dh_mean <= -0.4) {
      alert_level = "watch";
    }
    if (li_mean >= 0.95 && dh_mean <= -0.6) {
      alert_level = "warning_demo"; // aún demo, no sismo real
    }

    const active_nodes = new Set(recent.map((e) => e.device_id)).size;

    const latest_raw = events
      .slice(-50)
      .map((e) => ({
        time: e.time,
        device_id: e.device_id,
        metrics: e.metrics
      }));

    return res.status(200).json({
      status: "TCDS Master Node Online",
      active_nodes,
      cached_events: total,
      li_mean,
      dh_mean,
      r_mean,
      q_mean,
      alert_level,
      latest_raw
    });
  }

  // Método no soportado
  return res.status(405).json({ error: "Method not allowed" });
}
