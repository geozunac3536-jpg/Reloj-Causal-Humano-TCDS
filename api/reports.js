// api/reports.js
// Ingesta TCDS v2.0 - Conexión a Persistencia PostgreSQL (Supabase)
import { createClient } from '@supabase/supabase-js';

// Configuración de conexión (Usa Variables de Entorno en Vercel)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS: Permitir que cualquier nodo (GitHub Pages) envíe datos
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ---------------------------------------------------------
  // POST: Guardar datos del Reloj Causal en la BD
  // ---------------------------------------------------------
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      // 1. Validación Básica TCDS
      if (!body || !body.metrics) {
        return res.status(400).json({ error: "Payload sin métricas causales" });
      }

      // 2. Mapeo de Datos (JSON Frontend -> Columnas SQL)
      const eventData = {
        device_id: body.device_id || "unknown-node",
        client_timestamp: body.timestamp,
        
        // Geodesia
        geo_lat: body.geo?.lat || null,
        geo_lon: body.geo?.lon || null,
        geo_acc: body.geo?.acc || null,

        // Métricas Físicas (Asegurando tipos correctos)
        li: parseFloat(body.metrics.LI) || 0,
        r_kuramoto: parseFloat(body.metrics.R) || 0,
        dh_shannon: parseFloat(body.metrics.dH) || 0, // Dato Crítico
        q_arnold: parseFloat(body.metrics.Q_Arnold) || 0,
        amag: parseFloat(body.metrics.aMag) || 0,
        
        // Auditoría
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress
      };

      // 3. Inserción en Supabase (Persistencia Real)
      const { error } = await supabase
        .from('tcds_events')
        .insert([eventData]);

      if (error) throw error;

      // Log de éxito en consola de servidor
      console.log(`[TCDS-DB] Nodo ${eventData.device_id.slice(0,4)} :: dH ${eventData.dh_shannon}`);

      return res.status(200).json({ ok: true, saved: true });

    } catch (err) {
      console.error("Error crítico en ingesta DB:", err);
      return res.status(500).json({ ok: false, error: "Fallo de escritura en tejido causal" });
    }
  }

  // ---------------------------------------------------------
  // GET: Consulta para el Dashboard (Visualización)
  // ---------------------------------------------------------
  if (req.method === "GET") {
    // Traemos los últimos 50 eventos reales de la DB
    const { data, error } = await supabase
      .from('tcds_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });

    // Formateamos para que dashboard.html lo entienda sin cambios
    const formattedEvents = data.map(ev => ({
       id: ev.device_id,
       time: ev.received_at,
       metrics: {
         tC: 0, // Calculado en frontend si es necesario
         LI: ev.li,
         R: ev.r_kuramoto,
         dH: ev.dh_shannon
       }
    }));

    // Calculamos promedios rápidos para la cabecera del dashboard
    const avg = (key) => data.reduce((a, b) => a + (b[key]||0), 0) / (data.length||1);
    
    return res.status(200).json({
      timestamp: Date.now(),
      active_nodes: new Set(data.map(d => d.device_id)).size,
      tc_mean: avg('amag'), // Usamos magnitud como proxy temporal
      li_mean: avg('li'),
      r_mean: avg('r_kuramoto'),
      dh_mean: avg('dh_shannon'),
      latest_raw: formattedEvents
    });
  }
}
