// api/query.js
// Devuelve las Σ-metrics agregadas de los últimos minutos.

import { buffer } from './report';

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Ventana de análisis: últimos 10 minutos
  const now = Date.now();
  const WINDOW_MS = 10 * 60 * 1000;

  const recent = buffer.filter(r => now - r.timestamp <= WINDOW_MS);
  const n = recent.length;

  const avg = (fn) => {
    if (!n) return null;
    return recent.reduce((acc, r) => acc + fn(r), 0) / n;
  };

  const tc_mean    = avg(r => r.t_C);
  const li_mean    = avg(r => r.LI);
  const r_mean     = avg(r => r.R);
  const dh_mean    = avg(r => r.dH);
  const cflow_mean = avg(r => r.C_flow);

  const entropy_ok_ratio = n ? recent.filter(r => r.entropy_ok).length / n : 0;
  const locking_ok_ratio = n ? recent.filter(r => r.locking_ok).length / n : 0;

  res.status(200).json({
    timestamp: now,
    tc_mean,
    li_mean,
    r_mean,
    dh_mean,
    cflow_mean,
    active_nodes: n,
    entropy_ok_ratio,
    locking_ok_ratio,
  });
}
