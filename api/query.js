// api/query.js
// CEREBRO ANALÍTICO (Agregador)
// Función: Calcula promedios de la red para el Dashboard Global

import { events } from './reports.js'; // Importamos la memoria del otro archivo

export default function handler(req, res) {
  // Permisos para que el Dashboard lea esto
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    // Analizamos solo los últimos 10 minutos
    const now = Date.now();
    const WINDOW_MS = 10 * 60 * 1000;

    // Filtrar eventos viejos
    const recent = events.filter(r => (now - r.receivedAt) <= WINDOW_MS);
    const total = recent.length;

    // Contar cuántos celulares únicos hay conectados
    const uniqueNodes = new Set(recent.map(r => r.device_id));
    const active_nodes = uniqueNodes.size;

    // Función matemática para promedios
    const avg = (fn) => total === 0 ? 0 : recent.reduce((acc, r) => acc + fn(r), 0) / total;

    // Cálculo de Medias Globales TCDS
    const tc_mean = avg(r => r.metrics.tC);
    const li_mean = avg(r => r.metrics.LI);
    const r_mean  = avg(r => r.metrics.R);
    const dh_mean = avg(r => r.metrics.dH);
    
    // Semáforo de Estado (¿Hay sismo?)
    // Si muchos reportan Entropía baja (dH < -0.2), es señal de alerta
    const entropy_ok_count = recent.filter(r => r.metrics.dH <= -0.2).length;
    const entropy_ok_ratio = total ? entropy_ok_count / total : 0;

    // Enviamos el paquete listo al Dashboard
    res.status(200).json({
      timestamp: now,
      active_nodes,
      tc_mean,
      li_mean,
      r_mean,
      dh_mean,
      entropy_ok_ratio
    });

  } catch (error) {
    console.error("Error query:", error);
    res.status(500).json({ error: "Fallo en cálculo" });
  }
}
