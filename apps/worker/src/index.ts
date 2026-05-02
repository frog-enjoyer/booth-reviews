import { Hono } from 'hono';

import { corsMiddleware } from './middleware/cors';
import { authRoutes } from './routes/auth';
import { itemsRoutes } from './routes/items';
import { moderationRoutes } from './routes/moderation';
import { reportsRoutes } from './routes/reports';
import { reviewsRoutes } from './routes/reviews';
import type { AppBindings } from './types';

export function createApp() {
  const app = new Hono<AppBindings>();

  app.use('*', corsMiddleware);

  app.get('/health', (c) => c.json({ ok: true, data: { status: 'ok' } }));
  app.route('/auth', authRoutes);
  // Also mount at root so the client can call /me and /logout without the /auth prefix.
  app.route('', authRoutes);
  app.route('/items', itemsRoutes);
  app.route('/reviews', reviewsRoutes);
  app.route('/reports', reportsRoutes);
  app.route('/admin', moderationRoutes);

  app.notFound((c) => c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));

  return app;
}

export default createApp();
