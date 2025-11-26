// /api/utils/cors.js
// Capa de CORS para el backend del Reloj Causal Humano — TCDS

const ALLOWED_ORIGINS = [
  "https://reloj-causal-humano-tcds.vercel.app",
  "https://tcds-reloj-causal.vercel.app",
  "https://geozunac3536-jpg.github.io"
  // añade aquí dominios futuros (Firebase, dominio propio, etc.)
];

export function applyCors(req, res) {
  const origin = req.headers.origin || "";

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-TCDS-KEY");
}
