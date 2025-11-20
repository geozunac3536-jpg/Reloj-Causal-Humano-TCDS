// api/query.js
// Agregador de métricas para el Dashboard TCDS
// Lee del buffer en memoria de reports.js

import { events } from './reports.js'; // Importamos la memoria compartida

export default function handler(req, res) {
  // CORS para el Dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Ventana de análisis: últimos 10 minutos
    const now = Date.now();
    const WINDOW_MS = 10 * 60 * 1000;

    // Filtrar eventos recientes
    const recent = events.filter(r => (now - r.receivedAt) <= WINDOW_MS);
    const total_count = recent.length;

    // Calcular Nodos Activos (IDs únicos en la ventana de tiempo)
    const uniqueNodes = new Set(recent.map(r => r.device_id));
    const active_nodes = uniqueNodes.size;

    // Helper para promedios
    const avg = (fn) => {
      if (total_count === 0) return 0;
      return recent.reduce((acc, r) => acc + fn(r), 0) / total_count;
    };

    // Cálculo de Medias TCDS
    const tc_mean = avg(r => r.metrics.tC);
    const li_mean = avg(r => r.metrics.LI);
    const r_mean  = avg(r => r.metrics.R);
    const dh_mean = avg(r => r.metrics.dH);
    const q_mean  = avg(r => r.metrics.Q_Arnold);

    // Ratios de Estado (Para semáforo del Dashboard)
    // Entropía OK: dH <= -0.2 (Sistema ordenándose)
    const entropy_ok_count = recent.filter(r => r.metrics.dH <= -0.2).length;
    const entropy_ok_ratio = total_count ? entropy_ok_count / total_count : 0;

    // Locking OK: LI >= 0.9 (Sincronización fuerte)
    const locking_ok_count = recent.filter(r => r.metrics.LI >= 0.9).length;
    const locking_ok_ratio = total_count ? locking_ok_count / total_count : 0;

    res.status(200).json({
      timestamp: now,
      active_nodes,
      total_events_window: total_count,
      tc_mean,
      li_mean,
      r_mean,
      dh_mean,
      q_mean,
      entropy_ok_ratio,
      locking_ok_ratio
    });

  } catch (error) {
    console.error("Error en query TCDS:", error);
    res.status(500).json({ error: "Error interno de agregación" });
  }
}
