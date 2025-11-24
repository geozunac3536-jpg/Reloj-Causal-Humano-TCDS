// /api/utils/cors.js

// Dominios que SÍ pueden hablar con tu backend TCDS
const ALLOWED_ORIGINS = [
  "https://reloj-causal-humano-tcds.vercel.app",
  "https://geozunac3536-jpg.github.io"
];

/**
 * Aplica CORS "inteligente" según el Origin de la petición.
 */
export function applyCors(req, res) {
  const origin = req.headers.origin || "";

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Para que el navegador sepa que el header depende de Origin
  res.setHeader("Vary", "Origin");

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-TCDS-KEY");
}
