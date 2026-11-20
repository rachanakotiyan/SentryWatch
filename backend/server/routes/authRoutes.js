import express from 'express';
import bcrypt from 'bcryptjs';
import { signToken, requireAuth } from '../middleware/auth.js';
import { isEmail } from '../utils/validators.js';

const publicUser = (u) => ({ id: u.id, email: u.email, role: u.role, createdAt: u.createdAt });
// Compared against when the email is unknown, so login time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export default function authRoutes(store) {
  const router = express.Router();

  // POST /api/auth/register
  router.post('/register', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!isEmail(normalized)) return res.status(400).json({ error: 'A valid email is required' });
      // bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
      if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
        return res.status(400).json({ error: 'Password must be 8-72 characters' });
      }
      if (await store.users.findByEmail(normalized)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      // Role is never taken from the request body: every self-registered user is an ANALYST.
      const user = await store.users.create({ email: normalized, passwordHash: await bcrypt.hash(password, 12) });
      res.status(201).json({ token: signToken(user), user: publicUser(user) });
    } catch (err) { next(err); }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const user = await store.users.findByEmail(email.trim().toLowerCase());
      const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
      if (!user || !ok) return res.status(401).json({ error: 'Invalid credentials' });
      res.json({ token: signToken(user), user: publicUser(user) });
    } catch (err) { next(err); }
  });

  // GET /api/auth/me
  router.get('/me', requireAuth(store), async (req, res, next) => {
    try {
      const user = await store.users.findById(req.user.id);
      res.json({ user: publicUser(user) });
    } catch (err) { next(err); }
  });

  return router;
}
