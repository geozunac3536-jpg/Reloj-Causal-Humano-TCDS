// api/report.js
// Recibe Σ-metrics de cada móvil y las guarda en un buffer en memoria (demo).

// Buffer global en este módulo.
// OJO: en serverless puede resetearse; sirve como prototipo.
let buffer = [];
const MAX_BUFFER = 10000;

export default async function handler(req, res) {
  // CORS básico para permitir llamadas desde GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = req.body || {};

    const record = {
      timestamp: body.timestamp || Date.now(),
      device_id: body.device_id || 'anon',
      t_C: Number(body.t_C) || 0,
      LI:  Number(body.LI)  || 0,
      R:   Number(body.R)   || 0,
      dH:  Number(body.dH ?? body['ΔH'] ?? 0),
      C_flow: Number(body.C_flow ?? 0),
      entropy_ok: !!body.entropy_ok,
      locking_ok: !!body.locking_ok,
      battery: body.battery != null ? Number(body.battery) : null,
      geo: Array.isArray(body.geo) ? body.geo.slice(0, 2) : null,
    };

    buffer.push(record);
    if (buffer.length > MAX_BUFFER) {
      buffer.splice(0, buffer.length - MAX_BUFFER);
    }

    return res.status(200).json({ status: 'ok', stored: true });
  } catch (err) {
    console.error('Error en /api/report:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Exportamos el buffer para que otros endpoints puedan leerlo (query.js)
export { buffer };
