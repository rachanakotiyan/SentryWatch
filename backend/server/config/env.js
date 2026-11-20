import crypto from 'node:crypto';
import process from 'node:process';

export const isMockDb = () => process.env.USE_MOCK_DB === 'true';

let cachedSecret;
/** JWT secret from env. In dev, falls back to an ephemeral random secret (tokens die on restart). */
export function getJwtSecret() {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (16+ chars) in production');
  } else {
    console.warn('[auth] JWT_SECRET missing/short: using a random one for this run. Set it in .env.');
    cachedSecret = crypto.randomBytes(48).toString('hex');
  }
  return cachedSecret;
}
