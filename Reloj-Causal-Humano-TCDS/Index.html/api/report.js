// api/report.js
//
// Endpoint mínimo para recolectar eventos del Reloj Causal Humano.
// Versión v0.1: guarda nada, sólo registra en logs de Vercel lo que recibe.
// Esto ya te permite AUDITAR remotamente el comportamiento de cada dispositivo.

export default async function handler(req, res) {
  // Aceptamos sólo POST con JSON
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};

    // Normalizamos un poco por si alguno viene vacío
    const {
      device_id = 'anon',
      timestamp = Date.now(),
      mode = 'unknown',
      metrics = {},
      user_flags = {}
    } = body;

    // Log estructurado: esto lo verás en la consola de Vercel
    console.log('[RELOJ-CAUSAL-REPORT]', {
      device_id,
      timestamp,
      mode,
      metrics,
      user_flags
    });

    // En esta fase NO persistimos en BD; sólo confirmamos recepción.
    return res.status(200).json({
      ok: true,
      received: {
        device_id,
        timestamp,
        mode
      }
    });
  } catch (err) {
    console.error('[RELOJ-CAUSAL-REPORT][ERROR]', err);
    return res.status(500).json({
      ok: false,
      error: 'Server error processing report'
    });
  }
}
