import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';

export const signToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '24h' });

/** Requires `Authorization: Bearer <jwt>`; attaches req.user = { id, email, role }. */
export function requireAuth(store) {
  return async (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
      const user = await store.users.findById(payload.userId);
      if (!user) return res.status(401).json({ error: 'Invalid token' });
      req.user = { id: user.id, email: user.email, role: user.role };
      next();
    } catch (err) {
      const expired = err?.name === 'TokenExpiredError';
      res.status(401).json({ error: expired ? 'Token expired' : 'Invalid token' });
    }
  };
}
