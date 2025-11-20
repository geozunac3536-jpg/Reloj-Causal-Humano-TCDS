// api/query.js
// Cerebro Analítico TCDS - Alimenta al Dashboard
import { events } from './reports.js';

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    // Analizar últimos 10 minutos
    const now = Date.now();
    const WINDOW_MS = 10 * 60 * 1000;
    const recent = events.filter(r => (now - r.receivedAt) <= WINDOW_MS);
    const total = recent.length;

    // Contar Nodos Activos únicos
    const uniqueNodes = new Set(recent.map(r => r.device_id));
    const active_nodes = uniqueNodes.size;

    // Función promedio
    const avg = (fn) => total === 0 ? 0 : recent.reduce((acc, r) => acc + fn(r), 0) / total;

    // Cálculo de Medias Globales
    const tc_mean = avg(r => r.metrics.tC);
    const li_mean = avg(r => r.metrics.LI);
    const r_mean  = avg(r => r.metrics.R);
    const dh_mean = avg(r => r.metrics.dH);
    
    // Semáforo de Estado
    const entropy_ok_count = recent.filter(r => r.metrics.dH <= -0.2).length;
    const entropy_ok_ratio = total ? entropy_ok_count / total : 0;
    
    const locking_ok_count = recent.filter(r => r.metrics.LI >= 0.9).length;
    const locking_ok_ratio = total ? locking_ok_count / total : 0;

    res.status(200).json({
      timestamp: now,
      active_nodes,
      tc_mean,
      li_mean,
      r_mean,
      dh_mean,
      entropy_ok_ratio,
      locking_ok_ratio
    });

  } catch (error) {
    console.error("Error query:", error);
    res.status(500).json({ error: "Fallo en agregación" });
  }
}
