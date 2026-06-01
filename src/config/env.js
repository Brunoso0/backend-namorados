// Small helpers to parse numeric environment variables robustly
export function getEnvNumber(key, fallback = null) {
  const raw = process.env[key];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  // Remove surrounding quotes if present
  let cleaned = String(raw).trim().replace(/^['"]|['"]$/g, '');
  // Accept comma as decimal separator (convert to dot)
  cleaned = cleaned.replace(/,/g, '.');
  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[R$€£\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export default {
  getEnvNumber
};
